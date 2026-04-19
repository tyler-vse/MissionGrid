import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useRegistry } from '@/providers/useRegistry'

export function useCampaign(id: string | null | undefined) {
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.campaign(id ?? ''),
    queryFn: () =>
      registry.backend.getCampaign?.(id!) ?? Promise.resolve(null),
    enabled: Boolean(id) && Boolean(registry.backend.getCampaign),
  })
}
