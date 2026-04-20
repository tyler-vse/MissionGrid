import type { AppConfiguration } from '@/domain/models/appConfiguration'
import type { Campaign, CampaignStatus } from '@/domain/models/campaign'
import type { Location } from '@/domain/models/location'
import type { LocationEvent } from '@/domain/models/locationEvent'
import type { Organization } from '@/domain/models/organization'
import type { GeoPolygon, ServiceArea } from '@/domain/models/serviceArea'
import type { ProgressSnapshot } from '@/domain/services/progress'
import type { Shift, ShiftMember } from '@/domain/models/shift'
import type { SuggestedPlace } from '@/domain/models/suggestedPlace'
import type { Volunteer } from '@/domain/models/volunteer'
import type { CsvLocationRow } from '@/lib/csv'

export type Unsubscribe = () => void

export interface CreateSuggestedPlaceInput {
  organizationId: string
  name: string
  address: string
  lat?: number
  lng?: number
  externalPlaceId?: string
  types?: string[]
  submittedByVolunteerId?: string
  source?: string
}

export interface SetLocationNoGoInput {
  locationId: string
  reason?: string
}

export interface CreateServiceAreaInput {
  organizationId: string
  name: string
  centerLat: number
  centerLng: number
  radiusMeters?: number | null
  polygon?: GeoPolygon | null
}

export interface UpdateServiceAreaInput {
  name?: string
  centerLat?: number
  centerLng?: number
  radiusMeters?: number | null
  polygon?: GeoPolygon | null
}

export interface RecentActivityEvent extends LocationEvent {
  locationName?: string
  volunteerName?: string
}

export interface CreateCampaignInput {
  organizationId: string
  name: string
  description?: string
  grantReference?: string
  startsAt?: string
  endsAt?: string
  status?: CampaignStatus
  /** Zones the campaign should cover. Replaces any existing links. */
  serviceAreaIds?: string[]
}

export interface UpdateCampaignInput {
  name?: string
  description?: string
  grantReference?: string
  startsAt?: string
  endsAt?: string
  status?: CampaignStatus
  /** Replaces the campaign's full set of zones when provided. */
  serviceAreaIds?: string[]
}

export interface StartShiftInput {
  organizationId: string
  leaderVolunteerId: string
  campaignId?: string | null
  partySize: number
  timeWindowMinutes: number
  originLat?: number | null
  originLng?: number | null
}

export interface ListShiftsInput {
  organizationId: string
  campaignId?: string
  from?: string
  to?: string
}

export interface LocationActionInput {
  locationId: string
  volunteerId: string
  shiftId?: string | null
  memberId?: string | null
  note?: string
}

export interface BackendProvider {
  getAppConfiguration(orgId: string): Promise<AppConfiguration | null>
  updateAppConfiguration(
    orgId: string,
    patch: Partial<AppConfiguration>,
  ): Promise<AppConfiguration>
  getOrganization(orgId: string): Promise<Organization | null>
  listVolunteers(orgId: string): Promise<Volunteer[]>
  listServiceAreas(orgId: string): Promise<ServiceArea[]>
  listLocations(orgId: string): Promise<Location[]>
  listLocationHistory(locationId: string): Promise<LocationEvent[]>
  claimLocation(input: LocationActionInput): Promise<Location>
  completeLocation(input: LocationActionInput): Promise<Location>
  skipLocation(input: LocationActionInput): Promise<Location>
  setPendingReview(input: LocationActionInput): Promise<Location>
  importLocationsFromCsv(
    orgId: string,
    rows: CsvLocationRow[],
  ): Promise<{ imported: number }>
  getProgress(orgId: string): Promise<ProgressSnapshot>
  subscribeLocations(
    orgId: string,
    callback: (locations: Location[]) => void,
  ): Unsubscribe

  /** Recent activity feed (optional). Returns most-recent-first. */
  listRecentEvents?(
    orgId: string,
    limit?: number,
  ): Promise<RecentActivityEvent[]>

  /** Suggested places queue (optional; mock-only today). */
  listSuggestedPlaces?(orgId: string): Promise<SuggestedPlace[]>
  createSuggestedPlace?(input: CreateSuggestedPlaceInput): Promise<Location>
  approveSuggestedPlace?(placeId: string): Promise<Location>
  rejectSuggestedPlace?(placeId: string): Promise<void>

  /** Campaigns (optional — present once schema.sql has been re-run). */
  listCampaigns?(orgId: string): Promise<Campaign[]>
  getCampaign?(id: string): Promise<Campaign | null>
  createCampaign?(input: CreateCampaignInput): Promise<Campaign>
  updateCampaign?(id: string, patch: UpdateCampaignInput): Promise<Campaign>
  /** Replaces the full set of zones linked to a campaign. */
  setCampaignZones?(
    campaignId: string,
    serviceAreaIds: string[],
  ): Promise<Campaign>

  /** Admin-only location management (optional — requires upgrade SQL). */
  listAllLocations?(orgId: string): Promise<Location[]>
  archiveLocation?(locationId: string): Promise<Location>
  restoreLocation?(locationId: string): Promise<Location>
  setLocationNoGo?(input: SetLocationNoGoInput): Promise<Location>
  clearLocationNoGo?(locationId: string): Promise<Location>

  /** Admin-only zone / service area CRUD (optional). */
  createServiceArea?(input: CreateServiceAreaInput): Promise<ServiceArea>
  updateServiceArea?(
    id: string,
    patch: UpdateServiceAreaInput,
  ): Promise<ServiceArea>
  deleteServiceArea?(id: string): Promise<void>

  /** Shifts lifecycle (optional). */
  startShift?(input: StartShiftInput): Promise<Shift>
  endShift?(shiftId: string): Promise<Shift>
  updateShiftPartySize?(shiftId: string, partySize: number): Promise<Shift>
  getShift?(shiftId: string): Promise<Shift | null>
  listShifts?(input: ListShiftsInput): Promise<Shift[]>

  /** Party / walk-up join (optional). */
  generatePartyToken?(shiftId: string, ttlMinutes?: number): Promise<Shift>
  joinShiftParty?(
    shiftId: string,
    token: string,
    displayName: string,
  ): Promise<ShiftMember>
  listShiftMembers?(shiftId: string): Promise<ShiftMember[]>
}
