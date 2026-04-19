import type {
  PlacesProvider,
  PlacePrediction,
  PlaceSearchResult,
} from '@/providers/places/PlacesProvider'

export const mockPlaces: PlacesProvider = {
  async autocomplete(input) {
    if (!input.trim()) return []
    const p: PlacePrediction[] = [
      {
        placeId: 'mock_1',
        description: `${input.trim()} (mock suggestion)`,
      },
    ]
    return p
  },
  async searchText(query) {
    const q = query.trim()
    if (!q) return []
    const r: PlaceSearchResult[] = [
      {
        placeId: 'mock_search',
        name: q,
        formattedAddress: `${q} — connect Google Places for real results`,
        location: { lat: 39.7392, lng: -104.9903 },
      },
    ]
    return r
  },
}
