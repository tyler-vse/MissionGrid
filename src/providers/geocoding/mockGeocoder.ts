import type { GeocodingProvider } from '@/providers/geocoding/GeocodingProvider'

export const mockGeocoder: GeocodingProvider = {
  async geocode(query) {
    void query
    return { lat: 39.7392, lng: -104.9903 }
  },
  async reverse(latLng) {
    return `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)} (mock)`
  },
}
