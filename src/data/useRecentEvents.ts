import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import type { RecentActivityEvent } from '@/providers/backend/BackendProvider'
import { useRegistry } from '@/providers/useRegistry'

export function useRecentEvents(limit = 20) {
  const orgId = useOrgId()
  const registry = useRegistry()
  return useQuery<RecentActivityEvent[]>({
    queryKey: queryKeys.recentEvents(orgId ?? ''),
    queryFn: async () => {
      if (!registry.backend.listRecentEvents) return []
      return registry.backend.listRecentEvents(orgId!, limit)
    },
    enabled: Boolean(orgId),
    refetchInterval: 15_000,
  })
}
