import { create } from 'zustand'
import type { AppConfiguration } from '@/domain/models/appConfiguration'
import type { Campaign } from '@/domain/models/campaign'
import type { LocationEvent } from '@/domain/models/locationEvent'
import type { Location } from '@/domain/models/location'
import type { Organization } from '@/domain/models/organization'
import type { ServiceArea } from '@/domain/models/serviceArea'
import type { Shift, ShiftMember } from '@/domain/models/shift'
import type { SuggestedPlace } from '@/domain/models/suggestedPlace'
import type { Volunteer } from '@/domain/models/volunteer'
import { createSeedLocations } from '@/mock/locations'
import { MOCK_ORGANIZATION } from '@/mock/organization'
import { MOCK_SERVICE_AREA } from '@/mock/serviceArea'
import { MOCK_VOLUNTEERS } from '@/mock/volunteers'
import { MOCK_ORG_ID, MOCK_VOLUNTEER_ALEX } from '@/mock/ids'

export interface MockLocationActionContext {
  shiftId?: string | null
  memberId?: string | null
}

export interface MockBackendState {
  organization: Organization | null
  appConfiguration: AppConfiguration | null
  serviceAreas: ServiceArea[]
  volunteers: Volunteer[]
  locations: Location[]
  locationEvents: LocationEvent[]
  suggestedPlaces: SuggestedPlace[]
  campaigns: Campaign[]
  shifts: Shift[]
  shiftMembers: ShiftMember[]
  /** Current volunteer persona for one-tap actions */
  activeVolunteerId: string | null
  /** Load demo org + stops (Phase 1 dev shortcut) */
  loadDemo: () => void
  setActiveVolunteerId: (id: string | null) => void
  finishSetup: (input: {
    organizationName: string
    organizationSlug: string
    serviceAreaName: string
    centerLat: number
    centerLng: number
    radiusMeters: number
    csvLocations: Omit<
      Location,
      'id' | 'organizationId' | 'status' | 'source' | 'serviceAreaId'
    >[]
  }) => void
  importCsvLocations: (
    rows: Omit<
      Location,
      'id' | 'organizationId' | 'status' | 'source' | 'serviceAreaId'
    >[],
  ) => void
  claimLocation: (
    locationId: string,
    volunteerId: string,
    ctx?: MockLocationActionContext,
  ) => void
  completeLocation: (
    locationId: string,
    volunteerId: string,
    ctx?: MockLocationActionContext,
  ) => void
  skipLocation: (
    locationId: string,
    volunteerId: string,
    ctx?: MockLocationActionContext,
  ) => void
  setPendingReview: (
    locationId: string,
    volunteerId: string,
    reason?: string,
    ctx?: MockLocationActionContext,
  ) => void
  addSuggestedPlace: (
    input: Omit<SuggestedPlace, 'id' | 'status' | 'createdAt'> & {
      status?: SuggestedPlace['status']
    },
  ) => SuggestedPlace
  updateSuggestedPlace: (
    id: string,
    patch: Partial<SuggestedPlace>,
  ) => SuggestedPlace | null
  createCampaign: (
    input: Omit<
      Campaign,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'serviceAreaIds'
    > & {
      status?: Campaign['status']
      serviceAreaIds?: string[]
    },
  ) => Campaign
  updateCampaign: (id: string, patch: Partial<Campaign>) => Campaign | null
  setCampaignZones: (
    campaignId: string,
    serviceAreaIds: string[],
  ) => Campaign | null
  archiveLocation: (locationId: string) => Location | null
  restoreLocation: (locationId: string) => Location | null
  setLocationNoGo: (locationId: string, reason?: string) => Location | null
  clearLocationNoGo: (locationId: string) => Location | null
  startShift: (
    input: Omit<
      Shift,
      'id' | 'startedAt' | 'status' | 'createdAt' | 'endedAt'
    >,
  ) => Shift
  endShift: (shiftId: string) => Shift | null
  updateShift: (id: string, patch: Partial<Shift>) => Shift | null
  addShiftMember: (
    input: Omit<ShiftMember, 'id' | 'joinedAt'> & { joinedAt?: string },
  ) => ShiftMember
  resetToEmpty: () => void
}

const emptyConfig: AppConfiguration = {
  organizationId: MOCK_ORG_ID,
  isConfigured: false,
  updatedAt: new Date().toISOString(),
}

function newId(prefix: string) {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? `${prefix}_${crypto.randomUUID()}`
    : `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export const useMockBackendStore = create<MockBackendState>((set, get) => ({
  organization: null,
  appConfiguration: emptyConfig,
  serviceAreas: [],
  volunteers: [],
  locations: [],
  locationEvents: [],
  suggestedPlaces: [],
  campaigns: [],
  shifts: [],
  shiftMembers: [],
  activeVolunteerId: null,

  loadDemo: () => {
    const area = { ...MOCK_SERVICE_AREA }
    set({
      organization: { ...MOCK_ORGANIZATION },
      appConfiguration: {
        organizationId: MOCK_ORG_ID,
        isConfigured: true,
        updatedAt: new Date().toISOString(),
      },
      serviceAreas: [area],
      volunteers: MOCK_VOLUNTEERS.map((v) => ({ ...v })),
      locations: createSeedLocations(),
      locationEvents: [],
      suggestedPlaces: [],
      campaigns: [],
      shifts: [],
      shiftMembers: [],
      activeVolunteerId: MOCK_VOLUNTEER_ALEX,
    })
  },

  setActiveVolunteerId: (id) => set({ activeVolunteerId: id }),

  finishSetup: (input) => {
    const orgId = newId('org')
    const areaId = newId('area')
    const ts = new Date().toISOString()
    const organization: Organization = {
      id: orgId,
      name: input.organizationName,
      slug: input.organizationSlug,
      createdAt: ts,
      updatedAt: ts,
    }
    const serviceArea: ServiceArea = {
      id: areaId,
      organizationId: orgId,
      name: input.serviceAreaName,
      centerLat: input.centerLat,
      centerLng: input.centerLng,
      radiusMeters: input.radiusMeters,
    }
    const volunteers: Volunteer[] = [
      {
        id: newId('vol'),
        organizationId: orgId,
        displayName: 'Alex',
        createdAt: ts,
      },
      {
        id: newId('vol'),
        organizationId: orgId,
        displayName: 'Jamie',
        createdAt: ts,
      },
    ]
    const locations: Location[] = input.csvLocations.map((row) => ({
      ...row,
      id: newId('loc'),
      organizationId: orgId,
      serviceAreaId: areaId,
      status: 'available',
      source: 'preloaded',
    }))
    set({
      organization,
      serviceAreas: [serviceArea],
      volunteers,
      locations,
      locationEvents: [],
      suggestedPlaces: [],
      campaigns: [],
      shifts: [],
      shiftMembers: [],
      activeVolunteerId: volunteers[0]!.id,
      appConfiguration: {
        organizationId: orgId,
        isConfigured: true,
        updatedAt: ts,
      },
    })
  },

  importCsvLocations: (rows) => {
    const org = get().organization
    const area = get().serviceAreas[0]
    if (!org || !area) return
    const ts = new Date().toISOString()
    const newLocs: Location[] = rows.map((row) => ({
      ...row,
      id: newId('loc'),
      organizationId: org.id,
      serviceAreaId: area.id,
      status: 'available',
      source: 'preloaded',
    }))
    set((s) => ({
      locations: [...s.locations, ...newLocs],
      appConfiguration: s.appConfiguration
        ? { ...s.appConfiguration, updatedAt: ts }
        : null,
    }))
  },

  claimLocation: (locationId, volunteerId, ctx) => {
    const ts = new Date().toISOString()
    set((s) => {
      const prev = s.locations.find((l) => l.id === locationId)
      const nextLocs = s.locations.map((l) =>
        l.id === locationId && l.status === 'available'
          ? {
              ...l,
              status: 'claimed' as const,
              claimedByVolunteerId: volunteerId,
              claimedAt: ts,
            }
          : l,
      )
      if (!prev || prev.status !== 'available') {
        return { locations: nextLocs }
      }
      const ev: LocationEvent = {
        id: newId('evt'),
        locationId,
        volunteerId,
        shiftId: ctx?.shiftId ?? undefined,
        actedByMemberId: ctx?.memberId ?? undefined,
        fromStatus: prev.status,
        toStatus: 'claimed',
        createdAt: ts,
      }
      return { locations: nextLocs, locationEvents: [...s.locationEvents, ev] }
    })
  },

  completeLocation: (locationId, volunteerId, ctx) => {
    const ts = new Date().toISOString()
    set((s) => {
      const prev = s.locations.find((l) => l.id === locationId)
      const nextLocs = s.locations.map((l) => {
        if (l.id !== locationId) return l
        const allowed =
          l.status === 'claimed' && l.claimedByVolunteerId === volunteerId
        if (!allowed && l.status !== 'available') return l
        return {
          ...l,
          status: 'completed' as const,
          claimedByVolunteerId: volunteerId,
          completedAt: ts,
        }
      })
      const after = nextLocs.find((l) => l.id === locationId)
      if (!prev || !after || after.status === prev.status) {
        return { locations: nextLocs }
      }
      const ev: LocationEvent = {
        id: newId('evt'),
        locationId,
        volunteerId,
        shiftId: ctx?.shiftId ?? undefined,
        actedByMemberId: ctx?.memberId ?? undefined,
        fromStatus: prev.status,
        toStatus: 'completed',
        createdAt: ts,
      }
      return {
        locations: nextLocs,
        locationEvents: [...s.locationEvents, ev],
      }
    })
  },

  skipLocation: (locationId, volunteerId, ctx) => {
    const ts = new Date().toISOString()
    set((s) => {
      const prev = s.locations.find((l) => l.id === locationId)
      const nextLocs = s.locations.map((l) =>
        l.id === locationId
          ? {
              ...l,
              status: 'skipped' as const,
              claimedByVolunteerId: volunteerId,
            }
          : l,
      )
      if (!prev || prev.status === 'skipped') {
        return { locations: nextLocs }
      }
      const ev: LocationEvent = {
        id: newId('evt'),
        locationId,
        volunteerId,
        shiftId: ctx?.shiftId ?? undefined,
        actedByMemberId: ctx?.memberId ?? undefined,
        fromStatus: prev.status,
        toStatus: 'skipped',
        createdAt: ts,
      }
      return {
        locations: nextLocs,
        locationEvents: [...s.locationEvents, ev],
      }
    })
  },

  setPendingReview: (locationId, volunteerId, reason, ctx) => {
    const ts = new Date().toISOString()
    set((s) => {
      const prev = s.locations.find((l) => l.id === locationId)
      const nextLocs = s.locations.map((l) =>
        l.id === locationId
          ? {
              ...l,
              status: 'pending_review' as const,
              claimedByVolunteerId: volunteerId,
              notes: reason ?? l.notes,
            }
          : l,
      )
      if (!prev) return { locations: nextLocs }
      const ev: LocationEvent = {
        id: newId('evt'),
        locationId,
        volunteerId,
        shiftId: ctx?.shiftId ?? undefined,
        actedByMemberId: ctx?.memberId ?? undefined,
        fromStatus: prev.status,
        toStatus: 'pending_review',
        note: reason,
        createdAt: ts,
      }
      return {
        locations: nextLocs,
        locationEvents: [...s.locationEvents, ev],
      }
    })
  },

  addSuggestedPlace: (input) => {
    const ts = new Date().toISOString()
    const org = get().organization
    const record: SuggestedPlace = {
      id: newId('sug'),
      organizationId: input.organizationId || org?.id || MOCK_ORG_ID,
      externalPlaceId: input.externalPlaceId,
      name: input.name,
      address: input.address,
      lat: input.lat,
      lng: input.lng,
      types: input.types,
      submittedByVolunteerId: input.submittedByVolunteerId,
      status: input.status ?? 'pending_review',
      createdAt: ts,
    }
    set((s) => ({ suggestedPlaces: [...s.suggestedPlaces, record] }))
    return record
  },

  updateSuggestedPlace: (id, patch) => {
    let updated: SuggestedPlace | null = null
    set((s) => ({
      suggestedPlaces: s.suggestedPlaces.map((p) => {
        if (p.id !== id) return p
        updated = { ...p, ...patch }
        return updated
      }),
    }))
    return updated
  },

  createCampaign: (input) => {
    const ts = new Date().toISOString()
    const org = get().organization
    const record: Campaign = {
      id: newId('cmp'),
      organizationId: input.organizationId || org?.id || MOCK_ORG_ID,
      name: input.name,
      description: input.description,
      grantReference: input.grantReference,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status ?? 'active',
      serviceAreaIds: input.serviceAreaIds ?? [],
      createdAt: ts,
      updatedAt: ts,
    }
    set((s) => ({ campaigns: [...s.campaigns, record] }))
    return record
  },

  updateCampaign: (id, patch) => {
    const ts = new Date().toISOString()
    let updated: Campaign | null = null
    set((s) => ({
      campaigns: s.campaigns.map((c) => {
        if (c.id !== id) return c
        updated = { ...c, ...patch, id: c.id, updatedAt: ts }
        return updated
      }),
    }))
    return updated
  },

  setCampaignZones: (campaignId, serviceAreaIds) => {
    const ts = new Date().toISOString()
    let updated: Campaign | null = null
    set((s) => ({
      campaigns: s.campaigns.map((c) => {
        if (c.id !== campaignId) return c
        updated = { ...c, serviceAreaIds: [...serviceAreaIds], updatedAt: ts }
        return updated
      }),
    }))
    return updated
  },

  archiveLocation: (locationId) => {
    const ts = new Date().toISOString()
    let updated: Location | null = null
    set((s) => ({
      locations: s.locations.map((l) => {
        if (l.id !== locationId) return l
        updated = { ...l, archivedAt: ts }
        return updated
      }),
    }))
    return updated
  },

  restoreLocation: (locationId) => {
    let updated: Location | null = null
    set((s) => ({
      locations: s.locations.map((l) => {
        if (l.id !== locationId) return l
        const { archivedAt: _omit, ...rest } = l
        void _omit
        updated = rest
        return updated
      }),
    }))
    return updated
  },

  setLocationNoGo: (locationId, reason) => {
    const ts = new Date().toISOString()
    let updated: Location | null = null
    set((s) => {
      const prev = s.locations.find((l) => l.id === locationId) ?? null
      const locations = s.locations.map((l) => {
        if (l.id !== locationId) return l
        const trimmed = reason?.trim()
        updated = {
          ...l,
          status: 'no_go' as const,
          noGoReason: trimmed ? trimmed : undefined,
        }
        return updated
      })
      const events = prev && updated
        ? [
            ...s.locationEvents,
            {
              id: newId('evt'),
              locationId,
              volunteerId: undefined,
              fromStatus: prev.status,
              toStatus: 'no_go' as const,
              note: reason?.trim() || undefined,
              createdAt: ts,
            },
          ]
        : s.locationEvents
      return { locations, locationEvents: events }
    })
    return updated
  },

  clearLocationNoGo: (locationId) => {
    const ts = new Date().toISOString()
    let updated: Location | null = null
    set((s) => {
      const prev = s.locations.find((l) => l.id === locationId) ?? null
      const locations = s.locations.map((l) => {
        if (l.id !== locationId) return l
        const { noGoReason: _omit, ...rest } = l
        void _omit
        updated = { ...rest, status: 'available' as const }
        return updated
      })
      const events = prev && updated && prev.status !== updated.status
        ? [
            ...s.locationEvents,
            {
              id: newId('evt'),
              locationId,
              volunteerId: undefined,
              fromStatus: prev.status,
              toStatus: 'available' as const,
              createdAt: ts,
            },
          ]
        : s.locationEvents
      return { locations, locationEvents: events }
    })
    return updated
  },

  startShift: (input) => {
    const ts = new Date().toISOString()
    const record: Shift = {
      id: newId('shf'),
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      leaderVolunteerId: input.leaderVolunteerId,
      partySize: Math.max(1, Math.min(50, input.partySize || 1)),
      timeWindowMinutes: input.timeWindowMinutes,
      originLat: input.originLat,
      originLng: input.originLng,
      startedAt: ts,
      status: 'active',
      partyToken: input.partyToken,
      partyTokenExpiresAt: input.partyTokenExpiresAt,
      createdAt: ts,
    }
    set((s) => ({ shifts: [...s.shifts, record] }))
    return record
  },

  endShift: (shiftId) => {
    const ts = new Date().toISOString()
    let updated: Shift | null = null
    set((s) => ({
      shifts: s.shifts.map((sh) => {
        if (sh.id !== shiftId) return sh
        if (sh.status !== 'active') {
          updated = sh
          return sh
        }
        updated = { ...sh, status: 'ended', endedAt: ts }
        return updated
      }),
    }))
    return updated
  },

  updateShift: (id, patch) => {
    let updated: Shift | null = null
    set((s) => ({
      shifts: s.shifts.map((sh) => {
        if (sh.id !== id) return sh
        updated = { ...sh, ...patch, id: sh.id }
        return updated
      }),
    }))
    return updated
  },

  addShiftMember: (input) => {
    const ts = input.joinedAt ?? new Date().toISOString()
    const record: ShiftMember = {
      id: newId('smb'),
      shiftId: input.shiftId,
      displayName: input.displayName,
      firstName: input.firstName,
      joinedAt: ts,
      leftAt: input.leftAt,
    }
    set((s) => ({ shiftMembers: [...s.shiftMembers, record] }))
    return record
  },

  resetToEmpty: () =>
    set({
      organization: null,
      appConfiguration: emptyConfig,
      serviceAreas: [],
      volunteers: [],
      locations: [],
      locationEvents: [],
      suggestedPlaces: [],
      campaigns: [],
      shifts: [],
      shiftMembers: [],
      activeVolunteerId: null,
    }),
}))
