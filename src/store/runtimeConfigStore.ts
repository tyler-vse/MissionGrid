import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  decodeInviteHash,
  EMPTY_RUNTIME_CONFIG,
  mergeRuntimeWithEnv,
  type InvitePayloadV1,
  type RuntimeOrgConfig,
  runtimeStorageKey,
} from '@/config/runtimeConfig'

export interface RuntimeConfigState extends RuntimeOrgConfig {
  /** Apply invite link payload (join flow) */
  applyInvitePayload: (payload: InvitePayloadV1) => void
  patch: (partial: Partial<RuntimeOrgConfig>) => void
  reset: () => void
  /** Parse window.location.hash when on /join */
  hydrateFromLocationHash: () => InvitePayloadV1 | null
}

export const useRuntimeConfigStore = create<RuntimeConfigState>()(
  persist(
    (set) => ({
      ...EMPTY_RUNTIME_CONFIG,

      applyInvitePayload: (payload) => {
        set({
          supabaseUrl: payload.supabaseUrl,
          supabaseAnonKey: payload.supabaseAnonKey,
          organizationId: payload.organizationId,
          inviteToken: payload.inviteToken,
          googleMapsApiKey: payload.googleMapsApiKey ?? '',
        })
      },

      patch: (partial) => set((s) => ({ ...s, ...partial })),

      reset: () => set({ ...EMPTY_RUNTIME_CONFIG }),

      hydrateFromLocationHash: () => {
        if (typeof window === 'undefined') return null
        const raw = window.location.hash.replace(/^#/, '').trim()
        if (!raw) return null
        const payload = decodeInviteHash(raw)
        if (!payload) return null
        set({
          supabaseUrl: payload.supabaseUrl,
          supabaseAnonKey: payload.supabaseAnonKey,
          organizationId: payload.organizationId,
          inviteToken: payload.inviteToken,
          googleMapsApiKey: payload.googleMapsApiKey ?? '',
        })
        return payload
      },
    }),
    {
      name: runtimeStorageKey(),
      partialize: (s) => ({
        supabaseUrl: s.supabaseUrl,
        supabaseAnonKey: s.supabaseAnonKey,
        googleMapsApiKey: s.googleMapsApiKey,
        organizationId: s.organizationId,
        volunteerId: s.volunteerId,
        inviteToken: s.inviteToken,
      }),
    },
  ),
)

export function getEffectiveRuntimeConfigFromStore(): ReturnType<
  typeof mergeRuntimeWithEnv
> {
  const s = useRuntimeConfigStore.getState()
  return mergeRuntimeWithEnv({
    supabaseUrl: s.supabaseUrl,
    supabaseAnonKey: s.supabaseAnonKey,
    googleMapsApiKey: s.googleMapsApiKey,
    organizationId: s.organizationId,
    volunteerId: s.volunteerId,
    inviteToken: s.inviteToken,
  })
}
