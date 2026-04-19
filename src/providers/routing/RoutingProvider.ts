import type { TimeWindowMinutes } from '@/config/app.config'
import type { Location } from '@/domain/models/location'
import type { RouteSuggestion } from '@/domain/models/routeSuggestion'

export interface RouteSuggestionInput {
  organizationId: string
  volunteerId: string
  locations: Location[]
  timeWindowMinutes: TimeWindowMinutes
  origin: { lat: number; lng: number }
}

export interface RoutingProvider {
  suggestRoute(input: RouteSuggestionInput): Promise<RouteSuggestion>
}
