import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useAppConfiguration() {
  const orgId = useOrgId()
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.appConfiguration(orgId ?? ''),
    queryFn: () => registry.backend.getAppConfiguration(orgId!),
    enabled: Boolean(orgId),
  })
}
