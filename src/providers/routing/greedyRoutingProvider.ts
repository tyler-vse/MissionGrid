import { pickStopsForTimeWindow } from '@/domain/services/routeSuggestion'
import type { RoutingProvider } from '@/providers/routing/RoutingProvider'

export const greedyRoutingProvider: RoutingProvider = {
  async suggestRoute(input) {
    return pickStopsForTimeWindow(input)
  },
}
