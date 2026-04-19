import type { AppConfiguration } from '@/domain/models/appConfiguration'
import type { Location } from '@/domain/models/location'
import type { LocationEvent } from '@/domain/models/locationEvent'
import type { Organization } from '@/domain/models/organization'
import type { ServiceArea } from '@/domain/models/serviceArea'
import type { ProgressSnapshot } from '@/domain/services/progress'
import type { Volunteer } from '@/domain/models/volunteer'
import type { CsvLocationRow } from '@/lib/csv'

export type Unsubscribe = () => void

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
  claimLocation(locationId: string, volunteerId: string): Promise<Location>
  completeLocation(
    locationId: string,
    volunteerId: string,
    notes?: string,
  ): Promise<Location>
  skipLocation(locationId: string, volunteerId: string): Promise<Location>
  setPendingReview(
    locationId: string,
    volunteerId: string,
    reason?: string,
  ): Promise<Location>
  importLocationsFromCsv(
    orgId: string,
    rows: CsvLocationRow[],
  ): Promise<{ imported: number }>
  getProgress(orgId: string): Promise<ProgressSnapshot>
  subscribeLocations(
    orgId: string,
    callback: (locations: Location[]) => void,
  ): Unsubscribe
}
