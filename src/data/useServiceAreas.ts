import type { ServiceArea } from '@/domain/models/serviceArea'
import { useMockBackendStore } from '@/store/mockBackendStore'

/** Phase 1: read from mock store. Phase 2: `listServiceAreas` on BackendProvider. */
export function useServiceAreas(): ServiceArea[] {
  return useMockBackendStore((s) => s.serviceAreas)
}
