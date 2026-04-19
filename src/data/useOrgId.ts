import { useShallow } from 'zustand/react/shallow'
import { isSupabaseConfigured, mergeRuntimeWithEnv } from '@/config/runtimeConfig'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'
import { useMockBackendStore } from '@/store/mockBackendStore'

/**
 * Active organization: Supabase runtime org when URL+key+orgId are set,
 * otherwise the in-memory mock org after local setup.
 */
export function useOrgId(): string | null {
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
  const mockOrgId = useMockBackendStore((s) => s.organization?.id ?? null)
  const merged = mergeRuntimeWithEnv(runtimeSlice)
  if (isSupabaseConfigured(merged) && merged.organizationId) {
    return merged.organizationId
  }
  return mockOrgId
}
