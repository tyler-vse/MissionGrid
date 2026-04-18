import type { TimeWindowMinutes } from '@/config/app.config'

export interface RouteSuggestion {
  id: string
  volunteerId: string
  organizationId: string
  timeWindowMinutes: TimeWindowMinutes
  locationIds: string[]
  generatedAt: string
}
