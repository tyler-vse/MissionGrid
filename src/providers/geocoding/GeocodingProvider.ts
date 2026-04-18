export interface LatLng {
  lat: number
  lng: number
}

export interface GeocodingProvider {
  geocode(query: string): Promise<LatLng>
  reverse(latLng: LatLng): Promise<string>
}
