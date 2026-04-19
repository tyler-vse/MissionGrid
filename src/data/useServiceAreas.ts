import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useServiceAreas() {
  const orgId = useOrgId()
  const registry = useRegistry()
  const { data = [] } = useQuery({
    queryKey: queryKeys.serviceAreas(orgId ?? ''),
    queryFn: () => registry.backend.listServiceAreas(orgId!),
    enabled: Boolean(orgId),
  })
  return data
}
