import type { LatLng } from '@/providers/geocoding/GeocodingProvider'

export interface PlacePrediction {
  placeId: string
  description: string
}

export interface PlaceSearchResult {
  placeId: string
  name: string
  formattedAddress: string
  location: LatLng
}

export interface PlacesProvider {
  autocomplete(input: string): Promise<PlacePrediction[]>
  searchText(
    query: string,
    options?: {
      bounds?: { south: number; west: number; north: number; east: number }
      type?: string
      keyword?: string
    },
  ): Promise<PlaceSearchResult[]>
}
