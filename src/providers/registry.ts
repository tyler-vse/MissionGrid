import type { EffectiveRuntimeConfig } from '@/config/runtimeConfig'
import {
  isGoogleMapsConfigured,
  isSupabaseConfigured,
  mergeRuntimeWithEnv,
} from '@/config/runtimeConfig'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'
import type { BackendProvider } from '@/providers/backend/BackendProvider'
import { mockBackend } from '@/providers/backend/mockBackend'
import { createSupabaseBackend } from '@/providers/backend/supabaseBackend'
import type { GeocodingProvider } from '@/providers/geocoding/GeocodingProvider'
import { createGoogleGeocoder } from '@/providers/geocoding/googleGeocoder'
import { mockGeocoder } from '@/providers/geocoding/mockGeocoder'
import type { MapProvider } from '@/providers/maps/MapProvider'
import { createGoogleMapProvider } from '@/providers/maps/googleMap'
import { mockMapProvider } from '@/providers/maps/mockMap'
import type { PlacesProvider } from '@/providers/places/PlacesProvider'
import { createGooglePlaces } from '@/providers/places/googlePlaces'
import { mockPlaces } from '@/providers/places/mockPlaces'
import type { RoutingProvider } from '@/providers/routing/RoutingProvider'
import { greedyRoutingProvider } from '@/providers/routing/greedyRoutingProvider'

export interface ProviderRegistry {
  backend: BackendProvider
  map: MapProvider
  geocoding: GeocodingProvider
  places: PlacesProvider
  routing: RoutingProvider
  /** Effective config used to build this registry (for status UI) */
  effectiveConfig: EffectiveRuntimeConfig
}

function forceMockBackend(): boolean {
  return import.meta.env.VITE_FORCE_MOCK_BACKEND === 'true'
}

function forceMockMaps(): boolean {
  return import.meta.env.VITE_FORCE_MOCK_MAPS === 'true'
}

export function createProviderRegistry(
  cfg: EffectiveRuntimeConfig,
): ProviderRegistry {
  const useSupabase =
    !forceMockBackend() && isSupabaseConfigured(cfg)
  const useGoogle =
    !forceMockMaps() && isGoogleMapsConfigured(cfg)

  const backend: BackendProvider = useSupabase
    ? createSupabaseBackend(cfg)
    : mockBackend

  const map: MapProvider = useGoogle
    ? createGoogleMapProvider(cfg.googleMapsApiKey)
    : mockMapProvider

  const geocoding: GeocodingProvider = useGoogle
    ? createGoogleGeocoder(cfg.googleMapsApiKey)
    : mockGeocoder

  const places: PlacesProvider = useGoogle
    ? createGooglePlaces(cfg.googleMapsApiKey)
    : mockPlaces

  return {
    backend,
    map,
    geocoding,
    places,
    routing: greedyRoutingProvider,
    effectiveConfig: cfg,
  }
}

/**
 * Fallback when React context is unavailable (e.g. rare module init).
 * Prefer `useRegistry()` in components.
 */
export function getRegistrySnapshot(): ProviderRegistry {
  const s = useRuntimeConfigStore.getState()
  return createProviderRegistry(
    mergeRuntimeWithEnv({
      supabaseUrl: s.supabaseUrl,
      supabaseAnonKey: s.supabaseAnonKey,
      googleMapsApiKey: s.googleMapsApiKey,
      organizationId: s.organizationId,
      volunteerId: s.volunteerId,
      inviteToken: s.inviteToken,
    }),
  )
}
