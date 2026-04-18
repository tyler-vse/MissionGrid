import type { FeatureFlagKey } from '@/config/features'

/**
 * Runtime org configuration (wizard + settings). Persisted via backend in Phase 2.
 * Credentials are user-supplied strings — never commit real secrets.
 */
export interface AppConfiguration {
  organizationId: string
  isConfigured: boolean
  /** Optional Phase 2 — Supabase project */
  supabaseUrl?: string
  supabaseAnonKey?: string
  /** Optional Phase 2 — Google Maps JS API key (client-restricted in production) */
  googleMapsApiKey?: string
  /** Feature overrides; falls back to defaults in config/features.ts */
  enabledFeatures?: Partial<Record<FeatureFlagKey, boolean>>
  updatedAt: string
}
