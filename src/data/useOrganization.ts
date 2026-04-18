import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { getRegistry } from '@/providers/registry'

export function useOrganization() {
  const orgId = useOrgId()
  return useQuery({
    queryKey: queryKeys.organization(orgId ?? ''),
    queryFn: () => getRegistry().backend.getOrganization(orgId!),
    enabled: Boolean(orgId),
  })
}
