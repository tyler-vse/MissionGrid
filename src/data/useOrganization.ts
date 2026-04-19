import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useOrganization() {
  const orgId = useOrgId()
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.organization(orgId ?? ''),
    queryFn: () => registry.backend.getOrganization(orgId!),
    enabled: Boolean(orgId),
  })
}
