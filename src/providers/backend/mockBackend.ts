import { computeProgress } from '@/domain/services/progress'
import type { Location } from '@/domain/models/location'
import type {
  BackendProvider,
  RecentActivityEvent,
} from '@/providers/backend/BackendProvider'
import { useMockBackendStore } from '@/store/mockBackendStore'

export const mockBackend: BackendProvider = {
  async getAppConfiguration(orgId) {
    const cfg = useMockBackendStore.getState().appConfiguration
    if (!cfg || cfg.organizationId !== orgId) return null
    return cfg
  },

  async updateAppConfiguration(orgId, patch) {
    const prev = useMockBackendStore.getState().appConfiguration
    const next = {
      ...(prev ?? {
        organizationId: orgId,
        isConfigured: false,
        updatedAt: new Date().toISOString(),
      }),
      organizationId: orgId,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    useMockBackendStore.setState({ appConfiguration: next })
    return next
  },

  async getOrganization(orgId) {
    const org = useMockBackendStore.getState().organization
    if (!org || org.id !== orgId) return null
    return org
  },

  async listVolunteers(orgId) {
    return useMockBackendStore
      .getState()
      .volunteers.filter((v) => v.organizationId === orgId)
  },

  async listServiceAreas(orgId) {
    return useMockBackendStore
      .getState()
      .serviceAreas.filter((a) => a.organizationId === orgId)
  },

  async listLocations(orgId) {
    return useMockBackendStore
      .getState()
      .locations.filter((l) => l.organizationId === orgId)
  },

  async listLocationHistory(locationId) {
    return useMockBackendStore
      .getState()
      .locationEvents.filter((e) => e.locationId === locationId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
  },

  async claimLocation(locationId, volunteerId) {
    useMockBackendStore.getState().claimLocation(locationId, volunteerId)
    const loc = useMockBackendStore
      .getState()
      .locations.find((l) => l.id === locationId)
    if (!loc) throw new Error('Location not found')
    return loc
  },

  async completeLocation(locationId, volunteerId, notes) {
    useMockBackendStore.getState().completeLocation(locationId, volunteerId)
    if (notes) {
      useMockBackendStore.setState((s) => ({
        locations: s.locations.map((l) =>
          l.id === locationId ? { ...l, notes } : l,
        ),
      }))
    }
    const loc = useMockBackendStore
      .getState()
      .locations.find((l) => l.id === locationId)
    if (!loc) throw new Error('Location not found')
    return loc
  },

  async skipLocation(locationId, volunteerId) {
    useMockBackendStore.getState().skipLocation(locationId, volunteerId)
    const loc = useMockBackendStore
      .getState()
      .locations.find((l) => l.id === locationId)
    if (!loc) throw new Error('Location not found')
    return loc
  },

  async setPendingReview(locationId, volunteerId, reason) {
    useMockBackendStore
      .getState()
      .setPendingReview(locationId, volunteerId, reason)
    const loc = useMockBackendStore
      .getState()
      .locations.find((l) => l.id === locationId)
    if (!loc) throw new Error('Location not found')
    return loc
  },

  async importLocationsFromCsv(orgId, rows) {
    const area = useMockBackendStore.getState().serviceAreas[0]
    if (!area) return { imported: 0 }
    const newRows: Omit<
      Location,
      'id' | 'organizationId' | 'status' | 'source' | 'serviceAreaId'
    >[] = rows.map((r) => ({
      name: r.name,
      address: r.address,
      city: r.city,
      state: r.state,
      postalCode: r.postalCode,
      lat: r.lat,
      lng: r.lng,
      category: r.category,
      notes: r.notes,
    }))
    useMockBackendStore.getState().importCsvLocations(newRows)
    void orgId
    return { imported: rows.length }
  },

  async getProgress(orgId) {
    const locs = await mockBackend.listLocations(orgId)
    return computeProgress(locs)
  },

  subscribeLocations(orgId, callback) {
    const run = () => {
      callback(
        useMockBackendStore
          .getState()
          .locations.filter((l) => l.organizationId === orgId),
      )
    }
    run()
    return useMockBackendStore.subscribe(run)
  },

  async listRecentEvents(orgId, limit = 20) {
    const state = useMockBackendStore.getState()
    const locById = new Map(state.locations.map((l) => [l.id, l]))
    const volById = new Map(state.volunteers.map((v) => [v.id, v]))
    const events: RecentActivityEvent[] = state.locationEvents
      .filter((e) => {
        const loc = locById.get(e.locationId)
        return loc?.organizationId === orgId
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, limit)
      .map((e) => ({
        ...e,
        locationName: locById.get(e.locationId)?.name,
        volunteerName: e.volunteerId
          ? volById.get(e.volunteerId)?.displayName
          : undefined,
      }))
    return events
  },

  async listSuggestedPlaces(orgId) {
    return useMockBackendStore
      .getState()
      .suggestedPlaces.filter((p) => p.organizationId === orgId)
  },

  async createSuggestedPlace(input) {
    const store = useMockBackendStore.getState()
    const area = store.serviceAreas.find(
      (a) => a.organizationId === input.organizationId,
    )
    store.addSuggestedPlace(input)
    const ts = new Date().toISOString()
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `loc_${crypto.randomUUID()}`
        : `loc_${Date.now()}`
    const loc: Location = {
      id,
      organizationId: input.organizationId,
      serviceAreaId: area?.id,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      category: (input.types ?? [])[0],
      status: 'pending_review',
      source: 'suggested',
      claimedAt: ts,
    }
    useMockBackendStore.setState((s) => ({
      locations: [...s.locations, loc],
    }))
    return loc
  },

  async approveSuggestedPlace(placeId) {
    const store = useMockBackendStore.getState()
    store.updateSuggestedPlace(placeId, { status: 'approved' })
    // Find the matching pending_review location by coordinates + name best-effort
    const suggestion = store.suggestedPlaces.find((p) => p.id === placeId)
    if (!suggestion) throw new Error('Suggested place not found')
    const loc = store.locations.find(
      (l) =>
        l.status === 'pending_review' &&
        Math.abs(l.lat - suggestion.lat) < 1e-5 &&
        Math.abs(l.lng - suggestion.lng) < 1e-5 &&
        l.name === suggestion.name,
    )
    if (!loc) throw new Error('Linked location missing')
    useMockBackendStore.setState((s) => ({
      locations: s.locations.map((l) =>
        l.id === loc.id ? { ...l, status: 'available', source: 'suggested' } : l,
      ),
    }))
    return { ...loc, status: 'available' }
  },

  async rejectSuggestedPlace(placeId) {
    const store = useMockBackendStore.getState()
    store.updateSuggestedPlace(placeId, { status: 'rejected' })
    const suggestion = store.suggestedPlaces.find((p) => p.id === placeId)
    if (!suggestion) return
    useMockBackendStore.setState((s) => ({
      locations: s.locations.filter(
        (l) =>
          !(
            l.status === 'pending_review' &&
            Math.abs(l.lat - suggestion.lat) < 1e-5 &&
            Math.abs(l.lng - suggestion.lng) < 1e-5 &&
            l.name === suggestion.name
          ),
      ),
    }))
  },
}
