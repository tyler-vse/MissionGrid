import type { BackendProvider } from '@/providers/backend/BackendProvider'
import { mockBackend } from '@/providers/backend/mockBackend'
import { supabaseBackend } from '@/providers/backend/supabaseBackend'
import type { GeocodingProvider } from '@/providers/geocoding/GeocodingProvider'
import { mockGeocoder } from '@/providers/geocoding/mockGeocoder'
import type { MapProvider } from '@/providers/maps/MapProvider'
import { googleMapProvider } from '@/providers/maps/googleMap'
import { mockMapProvider } from '@/providers/maps/mockMap'

export interface ProviderRegistry {
  backend: BackendProvider
  map: MapProvider
  geocoding: GeocodingProvider
}

/**
 * Phase 1: always mock backend + mock map. Phase 2: branch on env + AppConfiguration.
 */
export function getProviderRegistry(): ProviderRegistry {
  const useSupabase =
    Boolean(import.meta.env.VITE_USE_SUPABASE) &&
    import.meta.env.VITE_USE_SUPABASE === 'true'

  return {
    backend: useSupabase ? supabaseBackend : mockBackend,
    map:
      import.meta.env.VITE_USE_GOOGLE_MAPS === 'true'
        ? googleMapProvider
        : mockMapProvider,
    geocoding: mockGeocoder,
  }
}

let singleton: ProviderRegistry | null = null

export function getRegistry(): ProviderRegistry {
  singleton ??= getProviderRegistry()
  return singleton
}
