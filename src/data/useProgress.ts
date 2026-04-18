import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { getRegistry } from '@/providers/registry'

export function useProgress() {
  const orgId = useOrgId()
  return useQuery({
    queryKey: queryKeys.progress(orgId ?? ''),
    queryFn: () => getRegistry().backend.getProgress(orgId!),
    enabled: Boolean(orgId),
  })
}
