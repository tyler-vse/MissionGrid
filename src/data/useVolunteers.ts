import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useVolunteers() {
  const orgId = useOrgId()
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.volunteers(orgId ?? ''),
    queryFn: () => registry.backend.listVolunteers(orgId!),
    enabled: Boolean(orgId),
  })
}
