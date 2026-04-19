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
  /** Optional — coordinates are best-effort; places imported from address-only
   * sources may not have them. Use `hasCoords()` or `lat != null` guards before
   * rendering on a map or running distance math. */
  lat?: number
  lng?: number
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
  /** Soft-delete timestamp (admin only). Volunteer-facing hooks filter these out. */
  archivedAt?: string
  /** Reason a business asked not to be flyered (paired with status === 'no_go'). */
  noGoReason?: string
}

/** Type guard for locations that have coordinates (useful for maps + distance math). */
export function hasCoords(
  loc: Pick<Location, 'lat' | 'lng'>,
): loc is Pick<Location, 'lat' | 'lng'> & { lat: number; lng: number } {
  return loc.lat != null && loc.lng != null
}
