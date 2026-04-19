-- MissionGrid — Supabase schema (Phase 2)
-- Run the full script in the Supabase SQL editor on a new project.
-- Intended model: one nonprofit per Supabase project (simple RLS). Harden for multi-tenant later.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index org_invites_org_idx on public.org_invites (organization_id);

create table public.volunteers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  display_name text not null,
  first_name text,
  last_name text,
  email text,
  is_admin boolean not null default false,
  auth_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index volunteers_org_idx on public.volunteers (organization_id);

create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_meters integer,
  polygon jsonb,
  created_at timestamptz not null default now()
);

create index service_areas_org_idx on public.service_areas (organization_id);

create table public.locations (
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

create index locations_org_idx on public.locations (organization_id);
create index locations_status_idx on public.locations (organization_id, status);

alter table public.locations replica identity full;

create table public.location_history (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  volunteer_id uuid references public.volunteers (id),
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index location_history_loc_idx on public.location_history (location_id, created_at);

create table public.app_configuration (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  is_configured boolean not null default true,
  enabled_features jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit trigger for locations
-- ---------------------------------------------------------------------------

create or replace function public.log_location_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.location_history (location_id, volunteer_id, from_status, to_status, note)
    values (new.id, new.claimed_by_volunteer_id, null, new.status, null);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status is distinct from new.status
       or old.claimed_by_volunteer_id is distinct from new.claimed_by_volunteer_id then
      insert into public.location_history (location_id, volunteer_id, from_status, to_status, note)
      values (new.id, new.claimed_by_volunteer_id, old.status, new.status, new.notes);
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
-- Row level security (permissive — one org per project; tighten for multi-tenant)
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.org_invites enable row level security;
alter table public.volunteers enable row level security;
alter table public.service_areas enable row level security;
alter table public.locations enable row level security;
alter table public.location_history enable row level security;
alter table public.app_configuration enable row level security;

create policy organizations_rw on public.organizations for all using (true) with check (true);
create policy org_invites_rw on public.org_invites for all using (true) with check (true);
create policy volunteers_rw on public.volunteers for all using (true) with check (true);
create policy service_areas_rw on public.service_areas for all using (true) with check (true);
create policy locations_rw on public.locations for all using (true) with check (true);
create policy location_history_rw on public.location_history for all using (true) with check (true);
create policy app_configuration_rw on public.app_configuration for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime (enable in Dashboard → Database → Replication if needed)
-- ---------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.locations;
-- alter publication supabase_realtime add table public.location_history;
