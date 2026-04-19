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
  async searchText(query, options) {
    const composed = [query.trim(), options?.keyword?.trim()]
      .filter((part): part is string => !!part)
      .join(' ')
    if (!composed) return []
    const typeSuffix = options?.type ? ` [${options.type}]` : ''
    const r: PlaceSearchResult[] = [
      {
        placeId: 'mock_search',
        name: `${composed}${typeSuffix}`,
        formattedAddress: `${composed} — connect Google Places for real results`,
        location: { lat: 39.7392, lng: -104.9903 },
      },
    ]
    return r
  },
}
