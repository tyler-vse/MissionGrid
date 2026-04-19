import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useCampaigns() {
  const orgId = useOrgId()
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.campaigns(orgId ?? ''),
    queryFn: () => registry.backend.listCampaigns?.(orgId!) ?? Promise.resolve([]),
    enabled: Boolean(orgId) && Boolean(registry.backend.listCampaigns),
  })
}
