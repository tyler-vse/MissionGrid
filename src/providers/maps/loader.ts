import { Loader } from '@googlemaps/js-api-loader'

const loadPromises = new Map<string, Promise<typeof google>>()

export type GoogleMapsLibrary = 'maps' | 'places' | 'geometry' | 'drawing'

export function loadGoogleMaps(
  apiKey: string,
  libraries: GoogleMapsLibrary[] = [
    'maps',
    'places',
    'geometry',
    'drawing',
  ],
): Promise<typeof google> {
  if (!apiKey) {
    return Promise.reject(new Error('Google Maps API key is missing'))
  }
  const cacheKey = `${apiKey}:${libraries.join(',')}`
  const hit = loadPromises.get(cacheKey)
  if (hit) return hit
  const loader = new Loader({
    apiKey,
    version: 'weekly',
    libraries,
  })
  const p = loader.load()
  loadPromises.set(cacheKey, p)
  return p
}
