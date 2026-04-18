import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { getRegistry } from '@/providers/registry'

export function useVolunteers() {
  const orgId = useOrgId()
  return useQuery({
    queryKey: queryKeys.volunteers(orgId ?? ''),
    queryFn: () => getRegistry().backend.listVolunteers(orgId!),
    enabled: Boolean(orgId),
  })
}
