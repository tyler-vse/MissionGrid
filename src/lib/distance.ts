export interface LatLng {
  lat: number
  lng: number
}

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance (Haversine) between two coordinates, in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(s)))
}

/**
 * Human-friendly distance string.
 * - < 100 m: rounded to nearest 10 m ("40 m")
 * - < 1 km:  rounded to nearest 10 m ("850 m")
 * - < 10 km: one decimal km ("2.3 km")
 * - otherwise: whole km ("15 km")
 */
export function formatDistanceMeters(
  meters: number,
  unit: 'metric' | 'imperial' = 'metric',
): string {
  if (!Number.isFinite(meters) || meters < 0) return '—'
  if (unit === 'imperial') {
    const feet = meters * 3.28084
    if (feet < 528) return `${Math.round(feet / 10) * 10} ft`
    const miles = meters / 1609.344
    if (miles < 10) return `${miles.toFixed(1)} mi`
    return `${Math.round(miles)} mi`
  }
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`
  }
  const km = meters / 1000
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function distanceFrom(origin: LatLng | null | undefined, target: LatLng): number | null {
  if (!origin) return null
  return haversineMeters(origin, target)
}
