import type { Location } from '@/domain/models/location'
import type { GeoPolygon } from '@/domain/models/serviceArea'

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

/** Point-in-polygon (ray casting), ring is [lng, lat][] exterior ring. */
export function pointInPolygon(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i]![0]
    const yi = ring[i]![1]
    const xj = ring[j]![0]
    const yj = ring[j]![1]
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export function locationInPolygon(loc: Location, polygon: GeoPolygon): boolean {
  const ring = polygon.coordinates[0]
  if (!ring?.length) return true
  return pointInPolygon(loc.lng, loc.lat, ring)
}

export function withinRadius(
  loc: Location,
  center: Coord,
  radiusMeters: number,
): boolean {
  return haversineMeters(center, { lat: loc.lat, lng: loc.lng }) <= radiusMeters
}

export interface AreaFilterOptions {
  textQuery?: string
  center?: Coord | null
  radiusMeters?: number | null
  polygon?: GeoPolygon | null
}

export function filterLocationsByArea(
  locations: Location[],
  opts: AreaFilterOptions,
): Location[] {
  let out = locations

  const q = opts.textQuery?.trim().toLowerCase()
  if (q) {
    out = out.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        (l.city?.toLowerCase().includes(q) ?? false),
    )
  }

  if (opts.center && opts.radiusMeters && opts.radiusMeters > 0) {
    out = out.filter((l) => withinRadius(l, opts.center!, opts.radiusMeters!))
  }

  if (opts.polygon?.coordinates?.[0]?.length) {
    out = out.filter((l) => locationInPolygon(l, opts.polygon!))
  }

  return out
}
