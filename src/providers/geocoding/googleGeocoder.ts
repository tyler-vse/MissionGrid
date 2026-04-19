import { loadGoogleMaps } from '@/providers/maps/loader'
import type {
  GeocodingProvider,
  LatLng,
} from '@/providers/geocoding/GeocodingProvider'

export function createGoogleGeocoder(apiKey: string): GeocodingProvider {
  return {
    async geocode(query) {
      await loadGoogleMaps(apiKey)
      const geocoder = new google.maps.Geocoder()
      const { results } = await geocoder.geocode({ address: query })
      if (!results?.[0]?.geometry?.location) {
        throw new Error('Geocode failed: no results')
      }
      const loc = results[0].geometry.location
      return { lat: loc.lat(), lng: loc.lng() }
    },
    async reverse(latLng: LatLng) {
      await loadGoogleMaps(apiKey)
      const geocoder = new google.maps.Geocoder()
      const { results } = await geocoder.geocode({
        location: latLng,
      })
      if (!results?.[0]) {
        return `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`
      }
      return results[0].formatted_address ?? ''
    },
  }
}
