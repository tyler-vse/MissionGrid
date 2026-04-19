-- MissionGrid — in-place upgrade:
--   1. campaign_service_areas junction (many-to-many between campaigns and zones)
--   2. locations: soft-delete (archived_at), new 'no_go' status + no_go_reason
--   3. locations.lat/lng become nullable (optional coordinates)
--   4. admin RPCs: archive/restore + set/clear no-go
--
-- Safe to paste into the Supabase SQL editor on an existing project. The whole
-- file is idempotent; re-running it is a no-op.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Junction table — many zones per campaign / many campaigns per zone
-- ---------------------------------------------------------------------------

create table if not exists public.campaign_service_areas (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  service_area_id uuid not null references public.service_areas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (campaign_id, service_area_id)
);

create index if not exists campaign_service_areas_campaign_idx
  on public.campaign_service_areas (campaign_id);
create index if not exists campaign_service_areas_area_idx
  on public.campaign_service_areas (service_area_id);

alter table public.campaign_service_areas enable row level security;
drop policy if exists campaign_service_areas_rw on public.campaign_service_areas;
create policy campaign_service_areas_rw on public.campaign_service_areas
  for all using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 2. Locations — soft delete + no-go flag + optional coordinates
-- ---------------------------------------------------------------------------

alter table public.locations
  add column if not exists archived_at timestamptz;

alter table public.locations
  add column if not exists no_go_reason text;

-- Drop + recreate the status check to include the new 'no_go' value.
-- The constraint is nameless in schema.sql (inline check), so it was auto-named
-- locations_status_check. Guard against both that and older names.
do $$
declare
  v_conname text;
begin
  select conname into v_conname
    from pg_constraint
   where conrelid = 'public.locations'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) ilike '%status%in%'
   limit 1;
  if v_conname is not null then
    execute format('alter table public.locations drop constraint %I', v_conname);
  end if;
end
$$;

alter table public.locations
  add constraint locations_status_check
  check (status in ('available', 'claimed', 'completed', 'skipped', 'pending_review', 'no_go'));

-- Make coordinates optional. alter column is idempotent when already nullable.
alter table public.locations alter column lat drop not null;
alter table public.locations alter column lng drop not null;

-- Partial index to keep volunteer-facing queries fast once soft-deleted rows
-- start accumulating.
create index if not exists locations_active_idx
  on public.locations (organization_id, status)
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- 3. Admin RPCs — archive/restore + set/clear no-go
-- ---------------------------------------------------------------------------

create or replace function public.admin_archive_location(
  p_location_id uuid
) returns public.locations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc public.locations;
begin
  update public.locations
     set archived_at = now(),
         updated_at = now()
   where id = p_location_id
  returning * into v_loc;

  if v_loc.id is null then
    raise exception 'location_not_found' using errcode = 'P0001';
  end if;

  return v_loc;
end;
$$;

grant execute on function public.admin_archive_location(uuid) to authenticated;

create or replace function public.admin_restore_location(
  p_location_id uuid
) returns public.locations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc public.locations;
begin
  update public.locations
     set archived_at = null,
         updated_at = now()
   where id = p_location_id
  returning * into v_loc;

  if v_loc.id is null then
    raise exception 'location_not_found' using errcode = 'P0001';
  end if;

  return v_loc;
end;
$$;

grant execute on function public.admin_restore_location(uuid) to authenticated;

create or replace function public.admin_set_location_no_go(
  p_location_id uuid,
  p_reason text default null
) returns public.locations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc public.locations;
begin
  update public.locations
     set status = 'no_go',
         no_go_reason = nullif(trim(coalesce(p_reason, '')), ''),
         updated_at = now()
   where id = p_location_id
  returning * into v_loc;

  if v_loc.id is null then
    raise exception 'location_not_found' using errcode = 'P0001';
  end if;

  return v_loc;
end;
$$;

grant execute on function public.admin_set_location_no_go(uuid, text) to authenticated;

create or replace function public.admin_clear_location_no_go(
  p_location_id uuid
) returns public.locations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc public.locations;
begin
  update public.locations
     set status = 'available',
         no_go_reason = null,
         updated_at = now()
   where id = p_location_id
  returning * into v_loc;

  if v_loc.id is null then
    raise exception 'location_not_found' using errcode = 'P0001';
  end if;

  return v_loc;
end;
$$;

grant execute on function public.admin_clear_location_no_go(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Refresh PostgREST so new tables / columns / RPCs are reachable immediately.
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
