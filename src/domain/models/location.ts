import type { ActivityStatus } from './activityStatus'

export type LocationSource = 'preloaded' | 'suggested' | 'manual'

/** Simple open-hours hint for Phase 3 awareness */
export interface OpenHoursHint {
  /** e.g. "09:00" */
  opens?: string
  closes?: string
  /** IANA timezone when known */
  timezone?: string
}

export interface Location {
  id: string
  organizationId: string
  name: string
  address: string
  city?: string
  state?: string
  postalCode?: string
  lat: number
  lng: number
  category?: string
  status: ActivityStatus
  claimedByVolunteerId?: string
  claimedAt?: string
  completedAt?: string
  notes?: string
  source: LocationSource
  /** Service area this stop belongs to (optional) */
  serviceAreaId?: string
  openHours?: OpenHoursHint
}
