import { loadGoogleMaps } from '@/providers/maps/loader'
import type {
  PlacesProvider,
  PlacePrediction,
  PlaceSearchResult,
} from '@/providers/places/PlacesProvider'

export function createGooglePlaces(apiKey: string): PlacesProvider {
  return {
    async autocomplete(input) {
      if (!input.trim()) return []
      await loadGoogleMaps(apiKey)
      const svc = new google.maps.places.AutocompleteService()
      const { predictions } = await svc.getPlacePredictions({
        input: input.trim(),
      })
      if (!predictions?.length) {
        return []
      }
      return predictions.map(
        (p: google.maps.places.AutocompletePrediction): PlacePrediction => ({
          placeId: p.place_id,
          description: p.description,
        }),
      )
    },
    async searchText(query, options) {
      const composedQuery = [query.trim(), options?.keyword?.trim()]
        .filter((part): part is string => !!part)
        .join(' ')
      if (!composedQuery) return []
      await loadGoogleMaps(apiKey)
      const el = document.createElement('div')
      const svc = new google.maps.places.PlacesService(el)
      const req: google.maps.places.TextSearchRequest = {
        query: composedQuery,
      }
      if (options?.bounds) {
        req.bounds = new google.maps.LatLngBounds(
          { lat: options.bounds.south, lng: options.bounds.west },
          { lat: options.bounds.north, lng: options.bounds.east },
        )
      }
      if (options?.type) {
        // `type` is supported on TextSearchRequest at runtime; older @types
        // definitions may omit it, so widen the request to attach it safely.
        ;(req as google.maps.places.TextSearchRequest & { type?: string }).type =
          options.type
      }
      const results = await new Promise<google.maps.places.PlaceResult[]>(
        (resolve, reject) => {
          svc.textSearch(req, (res, status) => {
            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              res?.length
            ) {
              resolve(res)
            } else if (
              status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
            ) {
              resolve([])
            } else {
              reject(new Error(`Places search: ${String(status)}`))
            }
          })
        }
      )
      return results
        .filter((r) => r.geometry?.location)
        .map(
          (r): PlaceSearchResult => ({
            placeId: r.place_id ?? r.name ?? '',
            name: r.name ?? 'Place',
            formattedAddress: r.formatted_address ?? '',
            location: {
              lat: r.geometry!.location!.lat(),
              lng: r.geometry!.location!.lng(),
            },
          }),
        )
    },
  }
}
