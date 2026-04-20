import { computeProgress } from '@/domain/services/progress'
import type { Location } from '@/domain/models/location'
import type { ServiceArea } from '@/domain/models/serviceArea'
import type {
  BackendProvider,
  RecentActivityEvent,
} from '@/providers/backend/BackendProvider'
import { useMockBackendStore } from '@/store/mockBackendStore'

function randomPartyToken(): string {
  const bytes = new Uint8Array(9)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(bin)
      : Buffer.from(bytes).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

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
      .locations.filter((l) => l.organizationId === orgId && !l.archivedAt)
  },

  async listAllLocations(orgId) {
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

  async claimLocation(input) {
    useMockBackendStore
      .getState()
      .claimLocation(input.locationId, input.volunteerId, {
        shiftId: input.shiftId,
        memberId: input.memberId,
      })
    const loc = useMockBackendStore
      .getState()
      .locations.find((l) => l.id === input.locationId)
    if (!loc) throw new Error('Location not found')
    return loc
  },

  async completeLocation(input) {
    useMockBackendStore
      .getState()
      .completeLocation(input.locationId, input.volunteerId, {
        shiftId: input.shiftId,
        memberId: input.memberId,
      })
    if (input.note) {
      useMockBackendStore.setState((s) => ({
        locations: s.locations.map((l) =>
          l.id === input.locationId ? { ...l, notes: input.note } : l,
        ),
      }))
    }
    const loc = useMockBackendStore
      .getState()
      .locations.find((l) => l.id === input.locationId)
    if (!loc) throw new Error('Location not found')
    return loc
  },

  async skipLocation(input) {
    useMockBackendStore
      .getState()
      .skipLocation(input.locationId, input.volunteerId, {
        shiftId: input.shiftId,
        memberId: input.memberId,
      })
    const loc = useMockBackendStore
      .getState()
      .locations.find((l) => l.id === input.locationId)
    if (!loc) throw new Error('Location not found')
    return loc
  },

  async setPendingReview(input) {
    useMockBackendStore
      .getState()
      .setPendingReview(input.locationId, input.volunteerId, input.note, {
        shiftId: input.shiftId,
        memberId: input.memberId,
      })
    const loc = useMockBackendStore
      .getState()
      .locations.find((l) => l.id === input.locationId)
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
          .locations.filter(
            (l) => l.organizationId === orgId && !l.archivedAt,
          ),
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
    const suggestion = store.suggestedPlaces.find((p) => p.id === placeId)
    if (!suggestion) throw new Error('Suggested place not found')
    const matchesCoords = (l: Location): boolean => {
      if (suggestion.lat == null || suggestion.lng == null) {
        return l.lat == null && l.lng == null
      }
      if (l.lat == null || l.lng == null) return false
      return (
        Math.abs(l.lat - suggestion.lat) < 1e-5 &&
        Math.abs(l.lng - suggestion.lng) < 1e-5
      )
    }
    const loc = store.locations.find(
      (l) =>
        l.status === 'pending_review' &&
        matchesCoords(l) &&
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
    const matchesCoords = (l: Location): boolean => {
      if (suggestion.lat == null || suggestion.lng == null) {
        return l.lat == null && l.lng == null
      }
      if (l.lat == null || l.lng == null) return false
      return (
        Math.abs(l.lat - suggestion.lat) < 1e-5 &&
        Math.abs(l.lng - suggestion.lng) < 1e-5
      )
    }
    useMockBackendStore.setState((s) => ({
      locations: s.locations.filter(
        (l) =>
          !(
            l.status === 'pending_review' &&
            matchesCoords(l) &&
            l.name === suggestion.name
          ),
      ),
    }))
  },

  async listCampaigns(orgId) {
    return useMockBackendStore
      .getState()
      .campaigns.filter((c) => c.organizationId === orgId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
  },

  async getCampaign(id) {
    return (
      useMockBackendStore.getState().campaigns.find((c) => c.id === id) ?? null
    )
  },

  async createCampaign(input) {
    return useMockBackendStore.getState().createCampaign({
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      grantReference: input.grantReference,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status,
      serviceAreaIds: input.serviceAreaIds ?? [],
    })
  },

  async updateCampaign(id, patch) {
    const { serviceAreaIds, ...rest } = patch
    const updated = useMockBackendStore.getState().updateCampaign(id, rest)
    if (!updated) throw new Error('Campaign not found')
    if (serviceAreaIds !== undefined) {
      const afterZones = useMockBackendStore
        .getState()
        .setCampaignZones(id, serviceAreaIds)
      if (afterZones) return afterZones
    }
    return updated
  },

  async setCampaignZones(campaignId, serviceAreaIds) {
    const updated = useMockBackendStore
      .getState()
      .setCampaignZones(campaignId, serviceAreaIds)
    if (!updated) throw new Error('Campaign not found')
    return updated
  },

  async archiveLocation(locationId) {
    const updated = useMockBackendStore.getState().archiveLocation(locationId)
    if (!updated) throw new Error('Location not found')
    return updated
  },

  async restoreLocation(locationId) {
    const updated = useMockBackendStore.getState().restoreLocation(locationId)
    if (!updated) throw new Error('Location not found')
    return updated
  },

  async setLocationNoGo(input) {
    const updated = useMockBackendStore
      .getState()
      .setLocationNoGo(input.locationId, input.reason)
    if (!updated) throw new Error('Location not found')
    return updated
  },

  async clearLocationNoGo(locationId) {
    const updated = useMockBackendStore
      .getState()
      .clearLocationNoGo(locationId)
    if (!updated) throw new Error('Location not found')
    return updated
  },

  async createServiceArea(input) {
    return useMockBackendStore.getState().createServiceArea({
      organizationId: input.organizationId,
      name: input.name,
      centerLat: input.centerLat,
      centerLng: input.centerLng,
      radiusMeters: input.radiusMeters ?? undefined,
      polygon: input.polygon ?? undefined,
    })
  },

  async updateServiceArea(id, patch) {
    const storePatch: Partial<{
      name: string
      centerLat: number
      centerLng: number
      radiusMeters: number | undefined
      polygon: ServiceArea['polygon']
    }> = {}
    if (patch.name !== undefined) storePatch.name = patch.name
    if (patch.centerLat !== undefined) storePatch.centerLat = patch.centerLat
    if (patch.centerLng !== undefined) storePatch.centerLng = patch.centerLng
    if (patch.radiusMeters !== undefined) {
      storePatch.radiusMeters = patch.radiusMeters ?? undefined
    }
    if (patch.polygon !== undefined) {
      storePatch.polygon = patch.polygon ?? undefined
    }
    const next = useMockBackendStore.getState().updateServiceArea(id, storePatch)
    if (!next) throw new Error('Zone not found')
    return next
  },

  async deleteServiceArea(id) {
    const removed = useMockBackendStore.getState().deleteServiceArea(id)
    if (!removed) throw new Error('Zone not found')
  },

  async startShift(input) {
    return useMockBackendStore.getState().startShift({
      organizationId: input.organizationId,
      leaderVolunteerId: input.leaderVolunteerId,
      campaignId: input.campaignId ?? undefined,
      partySize: input.partySize,
      timeWindowMinutes: input.timeWindowMinutes,
      originLat: input.originLat ?? undefined,
      originLng: input.originLng ?? undefined,
    })
  },

  async endShift(shiftId) {
    const ended = useMockBackendStore.getState().endShift(shiftId)
    if (!ended) throw new Error('Shift not found')
    return ended
  },

  async updateShiftPartySize(shiftId, partySize) {
    const updated = useMockBackendStore
      .getState()
      .updateShift(shiftId, {
        partySize: Math.max(1, Math.min(50, partySize || 1)),
      })
    if (!updated) throw new Error('Shift not found')
    return updated
  },

  async getShift(shiftId) {
    return (
      useMockBackendStore.getState().shifts.find((s) => s.id === shiftId) ??
      null
    )
  },

  async listShifts(input) {
    return useMockBackendStore
      .getState()
      .shifts.filter((s) => {
        if (s.organizationId !== input.organizationId) return false
        if (input.campaignId && s.campaignId !== input.campaignId) return false
        if (input.from && new Date(s.startedAt) < new Date(input.from))
          return false
        if (input.to && new Date(s.startedAt) > new Date(input.to)) return false
        return true
      })
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      )
  },

  async generatePartyToken(shiftId, ttlMinutes = 1440) {
    const token = randomPartyToken()
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()
    const updated = useMockBackendStore.getState().updateShift(shiftId, {
      partyToken: token,
      partyTokenExpiresAt: expiresAt,
    })
    if (!updated) throw new Error('Shift not found')
    return updated
  },

  async joinShiftParty(shiftId, token, displayName) {
    const store = useMockBackendStore.getState()
    const shift = store.shifts.find((s) => s.id === shiftId)
    if (!shift) throw new Error('shift_not_found')
    if (shift.status !== 'active') throw new Error('shift_not_active')
    if (!shift.partyToken || shift.partyToken !== token) {
      throw new Error('invalid_party_token')
    }
    if (
      shift.partyTokenExpiresAt &&
      new Date(shift.partyTokenExpiresAt).getTime() < Date.now()
    ) {
      throw new Error('party_token_expired')
    }
    const trimmed = displayName.trim()
    if (!trimmed) throw new Error('name_required')
    const member = store.addShiftMember({
      shiftId,
      displayName: trimmed,
      firstName: trimmed,
    })
    const nextMemberCount = store.shiftMembers.filter(
      (m) => m.shiftId === shiftId,
    ).length + 1
    store.updateShift(shiftId, {
      partySize: Math.max(shift.partySize, nextMemberCount + 1),
    })
    return member
  },

  async listShiftMembers(shiftId) {
    return useMockBackendStore
      .getState()
      .shiftMembers.filter((m) => m.shiftId === shiftId)
      .sort(
        (a, b) =>
          new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime(),
      )
  },
}
