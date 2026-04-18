/**
 * Feature flags for gradual rollout (Phase 2+). UI can read these from AppConfiguration later.
 */
export const FEATURE_FLAGS = {
  /** Places API / discovery (Phase 3) */
  discovery: false,
  /** Supabase realtime subscriptions (Phase 2) */
  realtime: false,
  /** Google Maps / embeddable map provider (Phase 2) */
  maps: false,
} as const

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS
