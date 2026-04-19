import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useProgress() {
  const orgId = useOrgId()
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.progress(orgId ?? ''),
    queryFn: () => registry.backend.getProgress(orgId!),
    enabled: Boolean(orgId),
  })
}
