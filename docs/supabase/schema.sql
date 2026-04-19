-- MissionGrid — Supabase schema (Phase 2)
-- Run the full script in the Supabase SQL editor on a new project.
-- Intended model: one nonprofit per Supabase project (simple RLS). Harden for multi-tenant later.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists org_invites_org_idx on public.org_invites (organization_id);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  display_name text not null,
  first_name text,
  last_name text,
  email text,
  is_admin boolean not null default false,
  is_ephemeral boolean not null default false,
  auth_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists volunteers_org_idx on public.volunteers (organization_id);

create table if not exists public.service_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_meters integer,
  polygon jsonb,
  created_at timestamptz not null default now()
);

create index if not exists service_areas_org_idx on public.service_areas (organization_id);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  service_area_id uuid references public.service_areas (id) on delete set null,
  name text not null,
  address text not null,
  city text,
  state text,
  postal_code text,
  lat double precision not null,
  lng double precision not null,
  category text,
  notes text,
  status text not null default 'available'
    check (status in ('available', 'claimed', 'completed', 'skipped', 'pending_review')),
  claimed_by_volunteer_id uuid references public.volunteers (id),
  claimed_at timestamptz,
  completed_at timestamptz,
  source text not null default 'preloaded'
    check (source in ('preloaded', 'suggested', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists locations_org_idx on public.locations (organization_id);
create index if not exists locations_status_idx on public.locations (organization_id, status);

alter table public.locations replica identity full;

create table if not exists public.location_history (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  volunteer_id uuid references public.volunteers (id),
  shift_id uuid,
  acted_by_member_id uuid,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists location_history_loc_idx on public.location_history (location_id, created_at);
create index if not exists location_history_shift_idx on public.location_history (shift_id);

create table if not exists public.app_configuration (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  is_configured boolean not null default true,
  enabled_features jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Campaigns, shifts, shift members (grant-reporting phase)
-- ---------------------------------------------------------------------------

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  grant_reference text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_org_idx on public.campaigns (organization_id);
create index if not exists campaigns_status_idx on public.campaigns (organization_id, status);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  leader_volunteer_id uuid not null references public.volunteers (id),
  party_size integer not null default 1 check (party_size >= 1 and party_size <= 50),
  time_window_minutes integer not null default 30,
  origin_lat double precision,
  origin_lng double precision,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'ended', 'abandoned')),
  party_token text unique,
  party_token_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shifts_org_idx on public.shifts (organization_id);
create index if not exists shifts_campaign_idx on public.shifts (campaign_id);
create index if not exists shifts_leader_idx on public.shifts (leader_volunteer_id);
create index if not exists shifts_started_idx on public.shifts (organization_id, started_at);

create table if not exists public.shift_members (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  display_name text not null,
  first_name text,
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create index if not exists shift_members_shift_idx on public.shift_members (shift_id);

-- Late-bind FKs from location_history to shifts / shift_members so that
-- the history table can be created before these tables in schema order.
-- Guarded so re-running schema.sql on an existing project is a no-op.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'location_history_shift_fk'
  ) then
    alter table public.location_history
      add constraint location_history_shift_fk
      foreign key (shift_id) references public.shifts (id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'location_history_member_fk'
  ) then
    alter table public.location_history
      add constraint location_history_member_fk
      foreign key (acted_by_member_id) references public.shift_members (id) on delete set null;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Audit trigger for locations
-- ---------------------------------------------------------------------------

create or replace function public.log_location_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift_id uuid;
  v_member_id uuid;
  v_raw_shift text;
  v_raw_member text;
begin
  -- Populated by record_location_action() via set_config(..., local=true) so
  -- the shift + party-member context from the client gets stamped onto the
  -- history row without needing to change the locations UPDATE statement.
  v_raw_shift := current_setting('app.shift_id', true);
  v_raw_member := current_setting('app.acted_by_member_id', true);
  if v_raw_shift is not null and v_raw_shift <> '' then
    begin
      v_shift_id := v_raw_shift::uuid;
    exception when others then
      v_shift_id := null;
    end;
  end if;
  if v_raw_member is not null and v_raw_member <> '' then
    begin
      v_member_id := v_raw_member::uuid;
    exception when others then
      v_member_id := null;
    end;
  end if;

  if tg_op = 'INSERT' then
    insert into public.location_history (location_id, volunteer_id, shift_id, acted_by_member_id, from_status, to_status, note)
    values (new.id, new.claimed_by_volunteer_id, v_shift_id, v_member_id, null, new.status, null);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status
       or old.claimed_by_volunteer_id is distinct from new.claimed_by_volunteer_id then
      insert into public.location_history (location_id, volunteer_id, shift_id, acted_by_member_id, from_status, to_status, note)
      values (new.id, new.claimed_by_volunteer_id, v_shift_id, v_member_id, old.status, new.status, new.notes);
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_locations_history on public.locations;
create trigger tr_locations_history
  after insert or update on public.locations
  for each row
  execute function public.log_location_history();

-- ---------------------------------------------------------------------------
-- Volunteer join (invite token validated server-side)
-- ---------------------------------------------------------------------------

create or replace function public.join_volunteer(
  p_invite_token text,
  p_organization_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_display text;
  v_fn text := nullif(trim(p_first_name), '');
  v_ln text := nullif(trim(p_last_name), '');
  v_em text := nullif(lower(trim(p_email)), '');
begin
  if not exists (
    select 1
    from public.org_invites i
    where i.organization_id = p_organization_id
      and i.token = p_invite_token
      and (i.expires_at is null or i.expires_at > now())
  ) then
    raise exception 'invalid_invite' using errcode = 'P0001';
  end if;

  if v_fn is null or v_ln is null then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  v_display := v_fn || ' ' || upper(left(v_ln, 1)) || '.';

  v_id := gen_random_uuid();
  insert into public.volunteers (id, organization_id, display_name, first_name, last_name, email, is_admin)
  values (v_id, p_organization_id, v_display, v_fn, v_ln, v_em, false);

  return v_id;
end;
$$;

grant execute on function public.join_volunteer(text, uuid, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin session helper (used by the client-side RequireAdmin guard)
-- Returns the organization id for the currently authenticated admin,
-- or NULL if the caller is not an admin (or not authenticated).
-- ---------------------------------------------------------------------------

create or replace function public.current_admin_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
    from public.volunteers
   where auth_user_id = auth.uid()
     and is_admin = true
   limit 1;
$$;

grant execute on function public.current_admin_org() to authenticated;

-- ---------------------------------------------------------------------------
-- Magic-link return flow: link an authenticated Supabase user to the
-- volunteer row that was created during /join. Returns the volunteer id.
-- Matches on existing auth_user_id first, then falls back to email within
-- the organization so the first post-join magic-link click backfills the
-- linkage.
-- ---------------------------------------------------------------------------

create or replace function public.link_volunteer_to_auth(
  p_organization_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'no_email_on_auth_user' using errcode = 'P0001';
  end if;

  update public.volunteers
     set auth_user_id = auth.uid()
   where organization_id = p_organization_id
     and (auth_user_id = auth.uid()
          or lower(email) = lower(v_email))
  returning id into v_id;

  if v_id is null then
    raise exception 'no_volunteer_for_email' using errcode = 'P0001';
  end if;
  return v_id;
end;
$$;

grant execute on function public.link_volunteer_to_auth(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Shift lifecycle + party join + action logging RPCs
-- ---------------------------------------------------------------------------

create or replace function public.start_shift(
  p_organization_id uuid,
  p_leader_volunteer_id uuid,
  p_campaign_id uuid,
  p_party_size integer,
  p_time_window_minutes integer,
  p_origin_lat double precision,
  p_origin_lng double precision
) returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
begin
  if p_leader_volunteer_id is null then
    raise exception 'leader_required' using errcode = 'P0001';
  end if;

  insert into public.shifts (
    organization_id,
    leader_volunteer_id,
    campaign_id,
    party_size,
    time_window_minutes,
    origin_lat,
    origin_lng,
    status,
    started_at
  )
  values (
    p_organization_id,
    p_leader_volunteer_id,
    p_campaign_id,
    greatest(1, least(50, coalesce(p_party_size, 1))),
    coalesce(p_time_window_minutes, 30),
    p_origin_lat,
    p_origin_lng,
    'active',
    now()
  )
  returning * into v_shift;

  return v_shift;
end;
$$;

grant execute on function public.start_shift(uuid, uuid, uuid, integer, integer, double precision, double precision)
  to anon, authenticated;

create or replace function public.end_shift(p_shift_id uuid)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
begin
  update public.shifts
     set status = 'ended',
         ended_at = now()
   where id = p_shift_id
     and status = 'active'
  returning * into v_shift;

  if v_shift.id is null then
    select * into v_shift from public.shifts where id = p_shift_id;
  end if;

  return v_shift;
end;
$$;

grant execute on function public.end_shift(uuid) to anon, authenticated;

create or replace function public.update_shift_party_size(
  p_shift_id uuid,
  p_party_size integer
) returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
begin
  update public.shifts
     set party_size = greatest(1, least(50, coalesce(p_party_size, 1)))
   where id = p_shift_id
  returning * into v_shift;

  return v_shift;
end;
$$;

grant execute on function public.update_shift_party_size(uuid, integer) to anon, authenticated;

create or replace function public.generate_party_token(
  p_shift_id uuid,
  p_ttl_minutes integer default 1440
) returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_token text;
begin
  v_token := encode(gen_random_bytes(9), 'base64');
  v_token := replace(replace(replace(v_token, '+', '-'), '/', '_'), '=', '');

  update public.shifts
     set party_token = v_token,
         party_token_expires_at = now() + (p_ttl_minutes || ' minutes')::interval
   where id = p_shift_id
     and status = 'active'
  returning * into v_shift;

  if v_shift.id is null then
    raise exception 'shift_not_active' using errcode = 'P0001';
  end if;

  return v_shift;
end;
$$;

grant execute on function public.generate_party_token(uuid, integer) to anon, authenticated;

create or replace function public.join_shift_party(
  p_shift_id uuid,
  p_token text,
  p_display_name text
) returns public.shift_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.shifts;
  v_member public.shift_members;
  v_name text := nullif(trim(p_display_name), '');
begin
  select * into v_shift from public.shifts where id = p_shift_id;
  if v_shift.id is null then
    raise exception 'shift_not_found' using errcode = 'P0001';
  end if;
  if v_shift.status <> 'active' then
    raise exception 'shift_not_active' using errcode = 'P0001';
  end if;
  if v_shift.party_token is null or v_shift.party_token <> p_token then
    raise exception 'invalid_party_token' using errcode = 'P0001';
  end if;
  if v_shift.party_token_expires_at is not null
     and v_shift.party_token_expires_at < now() then
    raise exception 'party_token_expired' using errcode = 'P0001';
  end if;
  if v_name is null then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  insert into public.shift_members (shift_id, display_name, first_name, joined_at)
  values (v_shift.id, v_name, v_name, now())
  returning * into v_member;

  update public.shifts
     set party_size = greatest(party_size, (
       select count(*) + 1 from public.shift_members where shift_id = v_shift.id
     ))
   where id = v_shift.id;

  return v_member;
end;
$$;

grant execute on function public.join_shift_party(uuid, text, text) to anon, authenticated;

-- Stamps shift_id + acted_by_member_id onto the auto-logged history row
-- by setting transaction-local config vars the log_location_history trigger
-- reads. Callers pass null for shift_id / member_id for non-shift actions.
create or replace function public.record_location_action(
  p_location_id uuid,
  p_action text,
  p_volunteer_id uuid,
  p_shift_id uuid default null,
  p_member_id uuid default null,
  p_note text default null
) returns public.locations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc public.locations;
  v_ts timestamptz := now();
begin
  perform set_config('app.shift_id', coalesce(p_shift_id::text, ''), true);
  perform set_config('app.acted_by_member_id', coalesce(p_member_id::text, ''), true);

  if p_action = 'claim' then
    update public.locations
       set status = 'claimed',
           claimed_by_volunteer_id = p_volunteer_id,
           claimed_at = v_ts,
           updated_at = v_ts
     where id = p_location_id
       and status = 'available'
    returning * into v_loc;
  elsif p_action = 'complete' then
    update public.locations
       set status = 'completed',
           claimed_by_volunteer_id = p_volunteer_id,
           completed_at = v_ts,
           updated_at = v_ts,
           notes = coalesce(p_note, notes)
     where id = p_location_id
    returning * into v_loc;
  elsif p_action = 'skip' then
    update public.locations
       set status = 'skipped',
           claimed_by_volunteer_id = p_volunteer_id,
           updated_at = v_ts
     where id = p_location_id
    returning * into v_loc;
  elsif p_action = 'pending_review' then
    update public.locations
       set status = 'pending_review',
           claimed_by_volunteer_id = p_volunteer_id,
           notes = coalesce(p_note, notes),
           updated_at = v_ts
     where id = p_location_id
    returning * into v_loc;
  else
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;

  if v_loc.id is null then
    select * into v_loc from public.locations where id = p_location_id;
  end if;

  return v_loc;
end;
$$;

grant execute on function public.record_location_action(uuid, text, uuid, uuid, uuid, text)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security (permissive — one org per project; tighten for multi-tenant)
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.org_invites enable row level security;
alter table public.volunteers enable row level security;
alter table public.service_areas enable row level security;
alter table public.locations enable row level security;
alter table public.location_history enable row level security;
alter table public.app_configuration enable row level security;
alter table public.campaigns enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_members enable row level security;

drop policy if exists organizations_rw on public.organizations;
create policy organizations_rw on public.organizations for all using (true) with check (true);
drop policy if exists org_invites_rw on public.org_invites;
create policy org_invites_rw on public.org_invites for all using (true) with check (true);
drop policy if exists volunteers_rw on public.volunteers;
create policy volunteers_rw on public.volunteers for all using (true) with check (true);
drop policy if exists service_areas_rw on public.service_areas;
create policy service_areas_rw on public.service_areas for all using (true) with check (true);
drop policy if exists locations_rw on public.locations;
create policy locations_rw on public.locations for all using (true) with check (true);
drop policy if exists location_history_rw on public.location_history;
create policy location_history_rw on public.location_history for all using (true) with check (true);
drop policy if exists app_configuration_rw on public.app_configuration;
create policy app_configuration_rw on public.app_configuration for all using (true) with check (true);
drop policy if exists campaigns_rw on public.campaigns;
create policy campaigns_rw on public.campaigns for all using (true) with check (true);
drop policy if exists shifts_rw on public.shifts;
create policy shifts_rw on public.shifts for all using (true) with check (true);
drop policy if exists shift_members_rw on public.shift_members;
create policy shift_members_rw on public.shift_members for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime (enable in Dashboard → Database → Replication if needed)
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.locations;
-- alter publication supabase_realtime add table public.location_history;
