import type { ActivityStatus } from '@/domain/models/activityStatus'
import type { AppConfiguration } from '@/domain/models/appConfiguration'
import type { Campaign, CampaignStatus } from '@/domain/models/campaign'
import type { Location, LocationSource } from '@/domain/models/location'
import type { LocationEvent } from '@/domain/models/locationEvent'
import type { Organization } from '@/domain/models/organization'
import type { ServiceArea } from '@/domain/models/serviceArea'
import type { Shift, ShiftMember, ShiftStatus } from '@/domain/models/shift'
import type { Volunteer } from '@/domain/models/volunteer'
import { computeProgress } from '@/domain/services/progress'
import type { EffectiveRuntimeConfig } from '@/config/runtimeConfig'
import type {
  BackendProvider,
  LocationActionInput,
} from '@/providers/backend/BackendProvider'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'

type LocationRow = {
  id: string
  organization_id: string
  service_area_id: string | null
  name: string
  address: string
  city: string | null
  state: string | null
  postal_code: string | null
  lat: number | null
  lng: number | null
  category: string | null
  status: ActivityStatus
  claimed_by_volunteer_id: string | null
  claimed_at: string | null
  completed_at: string | null
  notes: string | null
  source: LocationSource | null
  archived_at?: string | null
  no_go_reason?: string | null
}

function mapLocation(row: LocationRow): Location {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    address: row.address,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    postalCode: row.postal_code ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    category: row.category ?? undefined,
    status: row.status,
    claimedByVolunteerId: row.claimed_by_volunteer_id ?? undefined,
    claimedAt: row.claimed_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source ?? 'preloaded',
    serviceAreaId: row.service_area_id ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    noGoReason: row.no_go_reason ?? undefined,
  }
}

function mapVolunteer(row: {
  id: string
  organization_id: string
  display_name: string
  first_name: string | null
  last_name: string | null
  email: string | null
  is_admin: boolean | null
  created_at: string
}): Volunteer {
  return {
    id: row.id,
    organizationId: row.organization_id,
    displayName: row.display_name,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    email: row.email ?? undefined,
    isAdmin: row.is_admin ?? false,
    createdAt: row.created_at,
  }
}

function mapServiceArea(row: {
  id: string
  organization_id: string
  name: string
  center_lat: number
  center_lng: number
  radius_meters: number | null
  polygon: unknown | null
}): ServiceArea {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    centerLat: row.center_lat,
    centerLng: row.center_lng,
    radiusMeters: row.radius_meters ?? undefined,
    polygon: (row.polygon as ServiceArea['polygon']) ?? undefined,
  }
}

function mapLocationEvent(row: {
  id: string
  location_id: string
  volunteer_id: string | null
  shift_id?: string | null
  acted_by_member_id?: string | null
  from_status: string | null
  to_status: string
  note: string | null
  created_at: string
}): LocationEvent {
  return {
    id: row.id,
    locationId: row.location_id,
    volunteerId: row.volunteer_id ?? undefined,
    shiftId: row.shift_id ?? undefined,
    actedByMemberId: row.acted_by_member_id ?? undefined,
    fromStatus: (row.from_status as ActivityStatus | null) ?? null,
    toStatus: row.to_status as ActivityStatus,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }
}

type CampaignRow = {
  id: string
  organization_id: string
  name: string
  description: string | null
  grant_reference: string | null
  starts_at: string | null
  ends_at: string | null
  status: CampaignStatus
  created_at: string
  updated_at: string
  /** Populated when using the `campaign_service_areas(...)` embed. */
  campaign_service_areas?: { service_area_id: string }[] | null
}

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description ?? undefined,
    grantReference: row.grant_reference ?? undefined,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    status: row.status,
    serviceAreaIds: (row.campaign_service_areas ?? []).map(
      (x) => x.service_area_id,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

type ShiftRow = {
  id: string
  organization_id: string
  campaign_id: string | null
  leader_volunteer_id: string
  party_size: number
  time_window_minutes: number
  origin_lat: number | null
  origin_lng: number | null
  started_at: string
  ended_at: string | null
  status: ShiftStatus
  party_token: string | null
  party_token_expires_at: string | null
  created_at: string
}

function mapShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    organizationId: row.organization_id,
    campaignId: row.campaign_id ?? undefined,
    leaderVolunteerId: row.leader_volunteer_id,
    partySize: row.party_size,
    timeWindowMinutes: row.time_window_minutes,
    originLat: row.origin_lat ?? undefined,
    originLng: row.origin_lng ?? undefined,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    status: row.status,
    partyToken: row.party_token ?? undefined,
    partyTokenExpiresAt: row.party_token_expires_at ?? undefined,
    createdAt: row.created_at,
  }
}

type ShiftMemberRow = {
  id: string
  shift_id: string
  display_name: string
  first_name: string | null
  joined_at: string
  left_at: string | null
}

function mapShiftMember(row: ShiftMemberRow): ShiftMember {
  return {
    id: row.id,
    shiftId: row.shift_id,
    displayName: row.display_name,
    firstName: row.first_name ?? undefined,
    joinedAt: row.joined_at,
    leftAt: row.left_at ?? undefined,
  }
}

type SupabaseClient = ReturnType<typeof requireSupabaseClient>

async function recordLocationAction(
  supabase: SupabaseClient,
  action: 'claim' | 'complete' | 'skip' | 'pending_review',
  input: LocationActionInput,
): Promise<Location> {
  const { data, error } = await supabase.rpc('record_location_action', {
    p_location_id: input.locationId,
    p_action: action,
    p_volunteer_id: input.volunteerId,
    p_shift_id: input.shiftId ?? null,
    p_member_id: input.memberId ?? null,
    p_note: input.note ?? null,
  })
  if (error) throw error
  if (!data) throw new Error('record_location_action returned no row')
  return mapLocation(data as LocationRow)
}

export function createSupabaseBackend(
  cfg: EffectiveRuntimeConfig,
): BackendProvider {
  const client = () =>
    requireSupabaseClient(cfg.supabaseUrl, cfg.supabaseAnonKey)

  // Refcounted realtime channel registry, keyed by orgId. We share a single
  // `locations_org_<orgId>` channel across all in-process subscribers because
  // Supabase's realtime-js rejects `.on('postgres_changes', ...)` after
  // `.subscribe()` on an already-joined channel — which would crash React when
  // two components (e.g. ShiftView + FindMorePlaces) both call useLocations().
  type ChannelEntry = {
    channel: ReturnType<ReturnType<typeof client>['channel']>
    unsubs: Set<(locations: Location[]) => void>
    latest: Location[] | null
  }
  const locationChannels = new Map<string, ChannelEntry>()

  const backend: BackendProvider = {
    async getAppConfiguration(orgId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('app_configuration')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') {
        console.warn('getAppConfiguration', error.message)
      }
      if (!data) {
        return {
          organizationId: orgId,
          isConfigured: true,
          updatedAt: new Date().toISOString(),
        }
      }
      return {
        organizationId: orgId,
        isConfigured: Boolean(data.is_configured),
        enabledFeatures: (data.enabled_features as AppConfiguration['enabledFeatures']) ?? undefined,
        updatedAt: data.updated_at ?? new Date().toISOString(),
      }
    },

    async updateAppConfiguration(orgId, patch) {
      const supabase = client()
      const prev = await backend.getAppConfiguration(orgId)
      const next: AppConfiguration = {
        organizationId: orgId,
        isConfigured: patch.isConfigured ?? prev?.isConfigured ?? true,
        enabledFeatures: patch.enabledFeatures ?? prev?.enabledFeatures,
        updatedAt: new Date().toISOString(),
      }
      const { error } = await supabase.from('app_configuration').upsert(
        {
          organization_id: orgId,
          is_configured: next.isConfigured,
          enabled_features: next.enabledFeatures ?? null,
          updated_at: next.updatedAt,
        },
        { onConflict: 'organization_id' },
      )
      if (error) throw error
      return next
    },

    async getOrganization(orgId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      const org: Organization = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      }
      return org
    },

    async listVolunteers(orgId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map(mapVolunteer)
    },

    async listServiceAreas(orgId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .eq('organization_id', orgId)
      if (error) throw error
      return (data ?? []).map(mapServiceArea)
    },

    async listLocations(orgId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', orgId)
        .is('archived_at', null)
        .order('name', { ascending: true })
      if (error) throw error
      return (data as LocationRow[]).map(mapLocation)
    },

    async listAllLocations(orgId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true })
      if (error) throw error
      return (data as LocationRow[]).map(mapLocation)
    },

    async listLocationHistory(locationId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('location_history')
        .select('*')
        .eq('location_id', locationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []).map(mapLocationEvent)
    },

    async claimLocation(input) {
      return recordLocationAction(client(), 'claim', input)
    },

    async completeLocation(input) {
      return recordLocationAction(client(), 'complete', input)
    },

    async skipLocation(input) {
      return recordLocationAction(client(), 'skip', input)
    },

    async setPendingReview(input) {
      return recordLocationAction(client(), 'pending_review', input)
    },

    async importLocationsFromCsv(orgId, rows) {
      const supabase = client()
      const { data: areas } = await supabase
        .from('service_areas')
        .select('id')
        .eq('organization_id', orgId)
        .limit(1)
      const serviceAreaId = areas?.[0]?.id ?? null

      const chunkSize = 500
      let imported = 0
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize)
        const inserts = chunk.map((r) => ({
          organization_id: orgId,
          service_area_id: serviceAreaId,
          name: r.name,
          address: r.address,
          city: r.city ?? null,
          state: r.state ?? null,
          postal_code: r.postalCode ?? null,
          lat: r.lat ?? null,
          lng: r.lng ?? null,
          category: r.category ?? null,
          notes: r.notes ?? null,
          status: 'available' as const,
          source: 'preloaded' as const,
        }))
        const { error } = await supabase.from('locations').insert(inserts)
        if (error) throw error
        imported += chunk.length
      }
      return { imported }
    },

    async getProgress(orgId) {
      const locs = await backend.listLocations(orgId)
      return computeProgress(locs)
    },

    // Volunteer-submitted suggestions (from "Find more places" + drop-in logs)
    // land as `locations` rows with status='pending_review' and source='suggested'.
    // The dedicated `create_suggested_place` RPC (see
    // docs/supabase/upgrade-suggested-places.sql) does the insert with
    // `security definer` so we don't need to widen RLS on the locations table.
    // Approve/reject still flow through the admin review queue; we intentionally
    // do not implement list/approve/reject here yet because the admin UI reads
    // pending-review rows from `listAllLocations` directly.
    async createSuggestedPlace(input) {
      const supabase = client()
      const { data, error } = await supabase.rpc('create_suggested_place', {
        p_org_id: input.organizationId,
        p_name: input.name,
        p_address: input.address,
        p_lat: input.lat ?? null,
        p_lng: input.lng ?? null,
        p_category: (input.types ?? [])[0] ?? null,
        p_source: input.source ?? null,
        p_submitted_by: input.submittedByVolunteerId ?? null,
      })
      if (error) throw error
      if (!data) throw new Error('create_suggested_place returned no row')
      return mapLocation(data as LocationRow)
    },

    async listRecentEvents(orgId, limit = 20) {
      const supabase = client()
      const { data, error } = await supabase
        .from('location_history')
        .select(
          'id, location_id, volunteer_id, from_status, to_status, note, created_at, locations(name), volunteers(display_name)',
        )
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map((row) => {
        const loc = (row as unknown as { locations?: { name?: string } | null })
          .locations
        const vol = (row as unknown as {
          volunteers?: { display_name?: string } | null
        }).volunteers
        return {
          id: row.id as string,
          locationId: row.location_id as string,
          volunteerId: (row.volunteer_id as string | null) ?? undefined,
          fromStatus:
            ((row.from_status as string | null) ?? null) as never,
          toStatus: row.to_status as never,
          note: (row.note as string | null) ?? undefined,
          createdAt: row.created_at as string,
          locationName: loc?.name ?? undefined,
          volunteerName: vol?.display_name ?? undefined,
          // filter after-the-fact; the join keeps the query simple
          __orgId: orgId,
        }
      })
    },

    subscribeLocations(orgId, callback) {
      const supabase = client()

      const fanout = (rows: Location[]) => {
        const current = locationChannels.get(orgId)
        if (!current) return
        current.latest = rows
        for (const cb of current.unsubs) {
          try {
            cb(rows)
          } catch (err) {
            console.warn('subscribeLocations listener threw', err)
          }
        }
      }

      const load = () => {
        void supabase
          .from('locations')
          .select('*')
          .eq('organization_id', orgId)
          .is('archived_at', null)
          .then(({ data, error }) => {
            if (error) {
              console.warn('subscribeLocations load failed', error.message)
              return
            }
            if (!data) return
            fanout((data as LocationRow[]).map(mapLocation))
          })
      }

      let entry = locationChannels.get(orgId)
      if (!entry) {
        try {
          const channel = supabase
            .channel(`locations_org_${orgId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'locations',
                filter: `organization_id=eq.${orgId}`,
              },
              () => load(),
            )
            .subscribe()
          entry = { channel, unsubs: new Set(), latest: null }
          locationChannels.set(orgId, entry)
          load()
        } catch (err) {
          // If realtime wiring ever throws, fall back to a single fetch so the
          // caller at least gets data, and return a noop unsubscribe instead of
          // propagating the error and blanking the React tree.
          console.warn(
            'subscribeLocations: failed to init realtime channel; falling back to one-shot fetch',
            err,
          )
          void supabase
            .from('locations')
            .select('*')
            .eq('organization_id', orgId)
            .is('archived_at', null)
            .then(({ data }) => {
              if (data) callback((data as LocationRow[]).map(mapLocation))
            })
          return () => {}
        }
      }

      entry.unsubs.add(callback)
      if (entry.latest) {
        try {
          callback(entry.latest)
        } catch (err) {
          console.warn('subscribeLocations listener threw', err)
        }
      }

      return () => {
        const current = locationChannels.get(orgId)
        if (!current) return
        current.unsubs.delete(callback)
        if (current.unsubs.size === 0) {
          locationChannels.delete(orgId)
          try {
            void supabase.removeChannel(current.channel)
          } catch (err) {
            console.warn('subscribeLocations: removeChannel failed', err)
          }
        }
      }
    },

    async listCampaigns(orgId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, campaign_service_areas(service_area_id)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as CampaignRow[]).map(mapCampaign)
    },

    async getCampaign(id) {
      const supabase = client()
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, campaign_service_areas(service_area_id)')
        .eq('id', id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapCampaign(data as CampaignRow)
    },

    async createCampaign(input) {
      const supabase = client()
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          organization_id: input.organizationId,
          name: input.name,
          description: input.description ?? null,
          grant_reference: input.grantReference ?? null,
          starts_at: input.startsAt ?? null,
          ends_at: input.endsAt ?? null,
          status: input.status ?? 'active',
        })
        .select('*')
        .single()
      if (error) throw error
      const created = data as CampaignRow
      if (input.serviceAreaIds && input.serviceAreaIds.length > 0) {
        const { error: linkErr } = await supabase
          .from('campaign_service_areas')
          .insert(
            input.serviceAreaIds.map((serviceAreaId) => ({
              campaign_id: created.id,
              service_area_id: serviceAreaId,
            })),
          )
        if (linkErr) throw linkErr
      }
      return backend.getCampaign!(created.id) as Promise<Campaign>
    },

    async updateCampaign(id, patch) {
      const supabase = client()
      const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (patch.name !== undefined) update.name = patch.name
      if (patch.description !== undefined)
        update.description = patch.description ?? null
      if (patch.grantReference !== undefined)
        update.grant_reference = patch.grantReference ?? null
      if (patch.startsAt !== undefined) update.starts_at = patch.startsAt ?? null
      if (patch.endsAt !== undefined) update.ends_at = patch.endsAt ?? null
      if (patch.status !== undefined) update.status = patch.status
      const { error } = await supabase
        .from('campaigns')
        .update(update)
        .eq('id', id)
      if (error) throw error
      if (patch.serviceAreaIds !== undefined) {
        await backend.setCampaignZones!(id, patch.serviceAreaIds)
      }
      return backend.getCampaign!(id) as Promise<Campaign>
    },

    async setCampaignZones(campaignId, serviceAreaIds) {
      const supabase = client()
      const { error: delErr } = await supabase
        .from('campaign_service_areas')
        .delete()
        .eq('campaign_id', campaignId)
      if (delErr) throw delErr
      if (serviceAreaIds.length > 0) {
        const { error: insErr } = await supabase
          .from('campaign_service_areas')
          .insert(
            serviceAreaIds.map((serviceAreaId) => ({
              campaign_id: campaignId,
              service_area_id: serviceAreaId,
            })),
          )
        if (insErr) throw insErr
      }
      const campaign = await backend.getCampaign!(campaignId)
      if (!campaign) throw new Error('Campaign not found after zone update')
      return campaign
    },

    async archiveLocation(locationId) {
      const supabase = client()
      const { data, error } = await supabase.rpc('admin_archive_location', {
        p_location_id: locationId,
      })
      if (error) throw error
      if (!data) throw new Error('admin_archive_location returned no row')
      return mapLocation(data as LocationRow)
    },

    async restoreLocation(locationId) {
      const supabase = client()
      const { data, error } = await supabase.rpc('admin_restore_location', {
        p_location_id: locationId,
      })
      if (error) throw error
      if (!data) throw new Error('admin_restore_location returned no row')
      return mapLocation(data as LocationRow)
    },

    async setLocationNoGo(input) {
      const supabase = client()
      const { data, error } = await supabase.rpc('admin_set_location_no_go', {
        p_location_id: input.locationId,
        p_reason: input.reason ?? null,
      })
      if (error) throw error
      if (!data) throw new Error('admin_set_location_no_go returned no row')
      return mapLocation(data as LocationRow)
    },

    async clearLocationNoGo(locationId) {
      const supabase = client()
      const { data, error } = await supabase.rpc('admin_clear_location_no_go', {
        p_location_id: locationId,
      })
      if (error) throw error
      if (!data) throw new Error('admin_clear_location_no_go returned no row')
      return mapLocation(data as LocationRow)
    },

    async createServiceArea(input) {
      const supabase = client()
      const { data, error } = await supabase
        .from('service_areas')
        .insert({
          organization_id: input.organizationId,
          name: input.name,
          center_lat: input.centerLat,
          center_lng: input.centerLng,
          radius_meters: input.radiusMeters ?? null,
          polygon: input.polygon ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      return mapServiceArea(
        data as Parameters<typeof mapServiceArea>[0],
      )
    },

    async updateServiceArea(id, patch) {
      const supabase = client()
      const update: Record<string, unknown> = {}
      if (patch.name !== undefined) update.name = patch.name
      if (patch.centerLat !== undefined) update.center_lat = patch.centerLat
      if (patch.centerLng !== undefined) update.center_lng = patch.centerLng
      if (patch.radiusMeters !== undefined) {
        update.radius_meters = patch.radiusMeters ?? null
      }
      if (patch.polygon !== undefined) {
        update.polygon = patch.polygon ?? null
      }
      const { data, error } = await supabase
        .from('service_areas')
        .update(update)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return mapServiceArea(
        data as Parameters<typeof mapServiceArea>[0],
      )
    },

    async deleteServiceArea(id) {
      const supabase = client()
      const { error } = await supabase
        .from('service_areas')
        .delete()
        .eq('id', id)
      if (error) throw error
    },

    async startShift(input) {
      const supabase = client()
      const { data, error } = await supabase.rpc('start_shift', {
        p_organization_id: input.organizationId,
        p_leader_volunteer_id: input.leaderVolunteerId,
        p_campaign_id: input.campaignId ?? null,
        p_party_size: input.partySize,
        p_time_window_minutes: input.timeWindowMinutes,
        p_origin_lat: input.originLat ?? null,
        p_origin_lng: input.originLng ?? null,
      })
      if (error) throw error
      if (!data) throw new Error('start_shift returned no row')
      return mapShift(data as ShiftRow)
    },

    async endShift(shiftId) {
      const supabase = client()
      const { data, error } = await supabase.rpc('end_shift', {
        p_shift_id: shiftId,
      })
      if (error) throw error
      if (!data) throw new Error('end_shift returned no row')
      return mapShift(data as ShiftRow)
    },

    async updateShiftPartySize(shiftId, partySize) {
      const supabase = client()
      const { data, error } = await supabase.rpc('update_shift_party_size', {
        p_shift_id: shiftId,
        p_party_size: partySize,
      })
      if (error) throw error
      if (!data) throw new Error('update_shift_party_size returned no row')
      return mapShift(data as ShiftRow)
    },

    async getShift(shiftId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', shiftId)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return mapShift(data as ShiftRow)
    },

    async listShifts(input) {
      const supabase = client()
      let query = supabase
        .from('shifts')
        .select('*')
        .eq('organization_id', input.organizationId)
        .order('started_at', { ascending: false })
      if (input.campaignId) query = query.eq('campaign_id', input.campaignId)
      if (input.from) query = query.gte('started_at', input.from)
      if (input.to) query = query.lte('started_at', input.to)
      const { data, error } = await query
      if (error) throw error
      return (data as ShiftRow[]).map(mapShift)
    },

    async generatePartyToken(shiftId, ttlMinutes = 1440) {
      const supabase = client()
      const { data, error } = await supabase.rpc('generate_party_token', {
        p_shift_id: shiftId,
        p_ttl_minutes: ttlMinutes,
      })
      if (error) throw error
      if (!data) throw new Error('generate_party_token returned no row')
      return mapShift(data as ShiftRow)
    },

    async joinShiftParty(shiftId, token, displayName) {
      const supabase = client()
      const { data, error } = await supabase.rpc('join_shift_party', {
        p_shift_id: shiftId,
        p_token: token,
        p_display_name: displayName,
      })
      if (error) throw error
      if (!data) throw new Error('join_shift_party returned no row')
      return mapShiftMember(data as ShiftMemberRow)
    },

    async listShiftMembers(shiftId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('shift_members')
        .select('*')
        .eq('shift_id', shiftId)
        .order('joined_at', { ascending: true })
      if (error) throw error
      return (data as ShiftMemberRow[]).map(mapShiftMember)
    },

    async updateShift(shiftId, patch) {
      const supabase = client()
      const update: Record<string, unknown> = {}
      if (patch.startedAt !== undefined) update.started_at = patch.startedAt
      if (patch.endedAt !== undefined) update.ended_at = patch.endedAt ?? null
      if (patch.partySize !== undefined) update.party_size = patch.partySize
      if (patch.status !== undefined) update.status = patch.status
      if (patch.leaderVolunteerId !== undefined)
        update.leader_volunteer_id = patch.leaderVolunteerId
      if (patch.campaignId !== undefined)
        update.campaign_id = patch.campaignId ?? null
      if (patch.timeWindowMinutes !== undefined)
        update.time_window_minutes = patch.timeWindowMinutes
      const { data, error } = await supabase
        .from('shifts')
        .update(update)
        .eq('id', shiftId)
        .select('*')
        .single()
      if (error) throw error
      if (!data) throw new Error('updateShift returned no row')
      return mapShift(data as ShiftRow)
    },

    async addShiftMember(shiftId, input) {
      const supabase = client()
      const { data, error } = await supabase
        .from('shift_members')
        .insert({
          shift_id: shiftId,
          display_name: input.displayName,
          first_name: input.firstName ?? null,
        })
        .select('*')
        .single()
      if (error) throw error
      if (!data) throw new Error('addShiftMember returned no row')
      return mapShiftMember(data as ShiftMemberRow)
    },

    async updateShiftMember(memberId, patch) {
      const supabase = client()
      const update: Record<string, unknown> = {}
      if (patch.displayName !== undefined)
        update.display_name = patch.displayName
      if (patch.firstName !== undefined)
        update.first_name = patch.firstName ?? null
      if (patch.leftAt !== undefined) update.left_at = patch.leftAt ?? null
      const { data, error } = await supabase
        .from('shift_members')
        .update(update)
        .eq('id', memberId)
        .select('*')
        .single()
      if (error) throw error
      if (!data) throw new Error('updateShiftMember returned no row')
      return mapShiftMember(data as ShiftMemberRow)
    },

    async removeShiftMember(memberId) {
      const supabase = client()
      const { error } = await supabase
        .from('shift_members')
        .delete()
        .eq('id', memberId)
      if (error) throw error
    },
  }

  return backend
}
