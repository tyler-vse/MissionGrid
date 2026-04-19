-- MissionGrid — in-place upgrade: grant-reporting tables (campaigns / shifts /
-- shift_members) plus their RPCs, RLS, and late-bound FKs from
-- location_history. Safe to paste into the Supabase SQL editor on an existing
-- project that was provisioned from an older schema.sql. The whole file is
-- idempotent; re-running it is a no-op.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
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

-- ---------------------------------------------------------------------------
-- Columns added to pre-existing tables
-- ---------------------------------------------------------------------------

alter table public.volunteers
  add column if not exists is_ephemeral boolean not null default false;

alter table public.location_history
  add column if not exists shift_id uuid;

alter table public.location_history
  add column if not exists acted_by_member_id uuid;

create index if not exists location_history_shift_idx
  on public.location_history (shift_id);

-- ---------------------------------------------------------------------------
-- Late-bound FKs from location_history → shifts / shift_members
-- pg does not support `add constraint if not exists`, so look it up first.
-- ---------------------------------------------------------------------------

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
-- RPCs (safe to re-run via create or replace)
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
-- Row level security (permissive — matches schema.sql)
-- ---------------------------------------------------------------------------

alter table public.campaigns enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_members enable row level security;

drop policy if exists campaigns_rw on public.campaigns;
create policy campaigns_rw on public.campaigns for all using (true) with check (true);

drop policy if exists shifts_rw on public.shifts;
create policy shifts_rw on public.shifts for all using (true) with check (true);

drop policy if exists shift_members_rw on public.shift_members;
create policy shift_members_rw on public.shift_members for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Tell PostgREST to reload its schema cache so /rest/v1/campaigns starts
-- responding immediately instead of 404'ing for ~10 minutes.
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
