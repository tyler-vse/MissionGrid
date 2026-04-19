import type { ActivityStatus } from '@/domain/models/activityStatus'
import type { AppConfiguration } from '@/domain/models/appConfiguration'
import type { Location, LocationSource } from '@/domain/models/location'
import type { LocationEvent } from '@/domain/models/locationEvent'
import type { Organization } from '@/domain/models/organization'
import type { ServiceArea } from '@/domain/models/serviceArea'
import type { Volunteer } from '@/domain/models/volunteer'
import { computeProgress } from '@/domain/services/progress'
import type { EffectiveRuntimeConfig } from '@/config/runtimeConfig'
import type { BackendProvider } from '@/providers/backend/BackendProvider'
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
  lat: number
  lng: number
  category: string | null
  status: ActivityStatus
  claimed_by_volunteer_id: string | null
  claimed_at: string | null
  completed_at: string | null
  notes: string | null
  source: LocationSource | null
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
    lat: row.lat,
    lng: row.lng,
    category: row.category ?? undefined,
    status: row.status,
    claimedByVolunteerId: row.claimed_by_volunteer_id ?? undefined,
    claimedAt: row.claimed_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source ?? 'preloaded',
    serviceAreaId: row.service_area_id ?? undefined,
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
  from_status: string | null
  to_status: string
  note: string | null
  created_at: string
}): LocationEvent {
  return {
    id: row.id,
    locationId: row.location_id,
    volunteerId: row.volunteer_id ?? undefined,
    fromStatus: (row.from_status as ActivityStatus | null) ?? null,
    toStatus: row.to_status as ActivityStatus,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  }
}

export function createSupabaseBackend(
  cfg: EffectiveRuntimeConfig,
): BackendProvider {
  const client = () =>
    requireSupabaseClient(cfg.supabaseUrl, cfg.supabaseAnonKey)

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

    async claimLocation(locationId, volunteerId) {
      const supabase = client()
      const ts = new Date().toISOString()
      const { data, error } = await supabase
        .from('locations')
        .update({
          status: 'claimed',
          claimed_by_volunteer_id: volunteerId,
          claimed_at: ts,
        })
        .eq('id', locationId)
        .eq('status', 'available')
        .select('*')
        .maybeSingle()
      if (error) throw error
      if (!data) {
        const { data: cur } = await supabase
          .from('locations')
          .select('*')
          .eq('id', locationId)
          .single()
        if (!cur) throw new Error('Location not found')
        return mapLocation(cur as LocationRow)
      }
      return mapLocation(data as LocationRow)
    },

    async completeLocation(locationId, volunteerId, notes) {
      const supabase = client()
      const ts = new Date().toISOString()
      const { data, error } = await supabase
        .from('locations')
        .update({
          status: 'completed',
          claimed_by_volunteer_id: volunteerId,
          completed_at: ts,
          ...(notes !== undefined ? { notes } : {}),
        })
        .eq('id', locationId)
        .select('*')
        .single()
      if (error) throw error
      return mapLocation(data as LocationRow)
    },

    async skipLocation(locationId, volunteerId) {
      const supabase = client()
      const { data, error } = await supabase
        .from('locations')
        .update({
          status: 'skipped',
          claimed_by_volunteer_id: volunteerId,
        })
        .eq('id', locationId)
        .select('*')
        .single()
      if (error) throw error
      return mapLocation(data as LocationRow)
    },

    async setPendingReview(locationId, volunteerId, reason) {
      const supabase = client()
      const { data, error } = await supabase
        .from('locations')
        .update({
          status: 'pending_review',
          claimed_by_volunteer_id: volunteerId,
          ...(reason !== undefined ? { notes: reason } : {}),
        })
        .eq('id', locationId)
        .select('*')
        .single()
      if (error) throw error
      return mapLocation(data as LocationRow)
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
          lat: r.lat,
          lng: r.lng,
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

    // TODO(phase-3): add `listSuggestedPlaces` / `createSuggestedPlace` /
    // `approveSuggestedPlace` / `rejectSuggestedPlace` + corresponding
    // `suggested_places` table in docs/supabase/schema.sql. See
    // BackendProvider for the interface contract.

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
      const load = () => {
        void supabase
          .from('locations')
          .select('*')
          .eq('organization_id', orgId)
          .then(({ data }) => {
            if (data) callback((data as LocationRow[]).map(mapLocation))
          })
      }
      load()
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
      return () => {
        void supabase.removeChannel(channel)
      }
    },
  }

  return backend
}
