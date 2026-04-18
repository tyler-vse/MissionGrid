import { create } from 'zustand'
import type { AppConfiguration } from '@/domain/models/appConfiguration'
import type { Location } from '@/domain/models/location'
import type { Organization } from '@/domain/models/organization'
import type { ServiceArea } from '@/domain/models/serviceArea'
import type { Volunteer } from '@/domain/models/volunteer'
import { createSeedLocations } from '@/mock/locations'
import { MOCK_ORGANIZATION } from '@/mock/organization'
import { MOCK_SERVICE_AREA } from '@/mock/serviceArea'
import { MOCK_VOLUNTEERS } from '@/mock/volunteers'
import { MOCK_ORG_ID, MOCK_VOLUNTEER_ALEX } from '@/mock/ids'

export interface MockBackendState {
  organization: Organization | null
  appConfiguration: AppConfiguration | null
  serviceAreas: ServiceArea[]
  volunteers: Volunteer[]
  locations: Location[]
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
  claimLocation: (locationId: string, volunteerId: string) => void
  completeLocation: (locationId: string, volunteerId: string) => void
  skipLocation: (locationId: string, volunteerId: string) => void
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

  claimLocation: (locationId, volunteerId) => {
    const ts = new Date().toISOString()
    set((s) => ({
      locations: s.locations.map((l) =>
        l.id === locationId && l.status === 'available'
          ? {
              ...l,
              status: 'claimed' as const,
              claimedByVolunteerId: volunteerId,
              claimedAt: ts,
            }
          : l,
      ),
    }))
  },

  completeLocation: (locationId, volunteerId) => {
    const ts = new Date().toISOString()
    set((s) => ({
      locations: s.locations.map((l) => {
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
      }),
    }))
  },

  skipLocation: (locationId, volunteerId) => {
    set((s) => ({
      locations: s.locations.map((l) =>
        l.id === locationId
          ? {
              ...l,
              status: 'skipped' as const,
              claimedByVolunteerId: volunteerId,
            }
          : l,
      ),
    }))
  },

  resetToEmpty: () =>
    set({
      organization: null,
      appConfiguration: emptyConfig,
      serviceAreas: [],
      volunteers: [],
      locations: [],
      activeVolunteerId: null,
    }),
}))
