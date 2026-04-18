import type { AppConfiguration } from '@/domain/models/appConfiguration'
import type { Location } from '@/domain/models/location'
import type { Organization } from '@/domain/models/organization'
import type { ProgressSnapshot } from '@/domain/services/progress'
import type { Volunteer } from '@/domain/models/volunteer'
import type { CsvLocationRow } from '@/lib/csv'

export type Unsubscribe = () => void

export interface BackendProvider {
  getAppConfiguration(): Promise<AppConfiguration | null>
  updateAppConfiguration(
    patch: Partial<AppConfiguration>,
  ): Promise<AppConfiguration>
  getOrganization(orgId: string): Promise<Organization | null>
  listVolunteers(orgId: string): Promise<Volunteer[]>
  listLocations(orgId: string): Promise<Location[]>
  claimLocation(locationId: string, volunteerId: string): Promise<Location>
  completeLocation(
    locationId: string,
    volunteerId: string,
    notes?: string,
  ): Promise<Location>
  skipLocation(locationId: string, volunteerId: string): Promise<Location>
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
