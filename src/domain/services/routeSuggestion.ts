import type { TimeWindowMinutes } from '@/config/app.config'
import type { Location } from '@/domain/models/location'
import type { RouteSuggestion } from '@/domain/models/routeSuggestion'

type Coord = { lat: number; lng: number }

function haversineMeters(a: Coord, b: Coord): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}

/** Rough minutes: travel + quick interaction at door */
function estimateMinutesForStop(
  prev: Coord,
  next: Location & { lat: number; lng: number },
): number {
  const meters = haversineMeters(prev, next)
  const walkMin = Math.min(12, meters / 400)
  return walkMin + 3
}

export interface PickStopsInput {
  organizationId: string
  volunteerId: string
  /** Prefer stops the volunteer already claimed */
  locations: Location[]
  timeWindowMinutes: TimeWindowMinutes
  /** Starting point (e.g. volunteer or service area center) */
  origin: Coord
}

/**
 * Greedy nearest-neighbor within a simple time budget. Phase 3 can swap for richer routing.
 */
export function pickStopsForTimeWindow(input: PickStopsInput): RouteSuggestion {
  const { organizationId, volunteerId, locations, timeWindowMinutes, origin } =
    input

  const candidates = locations.filter(
    (l): l is Location & { lat: number; lng: number } =>
      l.lat != null &&
      l.lng != null &&
      l.status !== 'completed' &&
      l.status !== 'skipped' &&
      l.status !== 'pending_review' &&
      l.status !== 'no_go' &&
      (l.status === 'available' ||
        (l.status === 'claimed' && l.claimedByVolunteerId === volunteerId)),
  )

  const picked: Location[] = []
  let current: Coord = origin
  let minutesUsed = 0

  const pool = [...candidates]
  while (pool.length > 0 && minutesUsed < timeWindowMinutes) {
    let bestIdx = 0
    let bestCost = Number.POSITIVE_INFINITY
    for (let i = 0; i < pool.length; i++) {
      const cost = estimateMinutesForStop(current, pool[i]!)
      if (cost < bestCost) {
        bestCost = cost
        bestIdx = i
      }
    }
    const next = pool[bestIdx]!
    if (minutesUsed + bestCost > timeWindowMinutes) break
    minutesUsed += bestCost
    picked.push(next)
    pool.splice(bestIdx, 1)
    current = { lat: next.lat, lng: next.lng }
  }

  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `route_${Date.now()}`

  return {
    id,
    volunteerId,
    organizationId,
    timeWindowMinutes,
    locationIds: picked.map((l) => l.id),
    generatedAt: new Date().toISOString(),
  }
}
