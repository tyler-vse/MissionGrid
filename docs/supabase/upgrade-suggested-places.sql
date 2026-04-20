-- MissionGrid — in-place upgrade:
--   Adds the `create_suggested_place` RPC used by the volunteer shift flow to
--   submit a brand-new place mid-shift (Google Places discovery or a drop-in
--   log). The RPC inserts into public.locations with status='pending_review'
--   and source='suggested' so admins can review/approve/reject from the existing
--   admin review queue. The original submission channel (e.g. volunteer_shift,
--   volunteer_dropin) is recorded in `notes` for audit purposes.
--
-- Safe to paste into the Supabase SQL editor on an existing project. The whole
-- file is idempotent; re-running it is a no-op.

create extension if not exists "pgcrypto";

create or replace function public.create_suggested_place(
  p_org_id uuid,
  p_name text,
  p_address text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_category text default null,
  p_source text default null,
  p_submitted_by uuid default null
) returns public.locations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loc public.locations;
  v_area_id uuid;
  v_ts timestamptz := now();
  v_name text;
  v_address text;
  v_note text;
begin
  v_name := trim(coalesce(p_name, ''));
  v_address := coalesce(p_address, '');
  if length(v_name) = 0 then
    raise exception 'name_required' using errcode = 'P0001';
  end if;

  -- Fall back to the org's first service area so the new row has a sensible
  -- default zone (matches admin-imported locations). Optional — null is fine.
  select id into v_area_id
    from public.service_areas
   where organization_id = p_org_id
   order by created_at asc
   limit 1;

  v_note := case
    when p_source is not null and p_submitted_by is not null then
      'Suggested via ' || p_source || ' by ' || p_submitted_by::text
    when p_source is not null then
      'Suggested via ' || p_source
    else
      null
  end;

  insert into public.locations (
    organization_id,
    service_area_id,
    name,
    address,
    lat,
    lng,
    category,
    status,
    source,
    claimed_by_volunteer_id,
    claimed_at,
    notes,
    created_at,
    updated_at
  ) values (
    p_org_id,
    v_area_id,
    v_name,
    v_address,
    p_lat,
    p_lng,
    p_category,
    'pending_review',
    'suggested',
    p_submitted_by,
    v_ts,
    v_note,
    v_ts,
    v_ts
  )
  returning * into v_loc;

  return v_loc;
end;
$$;

grant execute on function public.create_suggested_place(
  uuid, text, text, double precision, double precision, text, text, uuid
) to anon, authenticated;
