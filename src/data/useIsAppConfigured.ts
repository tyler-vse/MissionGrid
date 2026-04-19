import { useShallow } from 'zustand/react/shallow'
import { isSupabaseConfigured, mergeRuntimeWithEnv } from '@/config/runtimeConfig'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'
import { useMockBackendStore } from '@/store/mockBackendStore'

/** True when mock demo/setup finished or Supabase org + volunteer are hydrated. */
export function useIsAppConfigured(): boolean {
  const runtimeSlice = useRuntimeConfigStore(
    useShallow((s) => ({
      supabaseUrl: s.supabaseUrl,
      supabaseAnonKey: s.supabaseAnonKey,
      googleMapsApiKey: s.googleMapsApiKey,
      organizationId: s.organizationId,
      volunteerId: s.volunteerId,
      inviteToken: s.inviteToken,
    })),
  )
  const mockReady = useMockBackendStore(
    (s) => Boolean(s.appConfiguration?.isConfigured && s.organization),
  )
  const merged = mergeRuntimeWithEnv(runtimeSlice)
  const supabaseReady =
    isSupabaseConfigured(merged) &&
    Boolean(merged.organizationId) &&
    Boolean(merged.volunteerId)
  return supabaseReady || mockReady
}
