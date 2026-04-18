/**
 * Candidate from Places / discovery (Phase 3). Typed now for schema stability.
 */
export interface SuggestedPlace {
  id: string
  organizationId: string
  externalPlaceId?: string
  name: string
  address: string
  lat: number
  lng: number
  types?: string[]
  submittedByVolunteerId?: string
  status: 'pending_review' | 'approved' | 'rejected'
  createdAt: string
}
