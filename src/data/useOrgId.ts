import { useMockBackendStore } from '@/store/mockBackendStore'

/** Phase 1: org id from mock store. Phase 2: derive from session / Supabase org claim. */
export function useOrgId(): string | null {
  return useMockBackendStore((s) => s.organization?.id ?? null)
}
