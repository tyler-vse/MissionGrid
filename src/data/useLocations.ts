import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useLocations() {
  const orgId = useOrgId()
  const queryClient = useQueryClient()
  const registry = useRegistry()

  useEffect(() => {
    if (!orgId) return
    const unsub = registry.backend.subscribeLocations(orgId, () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.locations(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(orgId) })
    })
    return unsub
  }, [orgId, queryClient, registry.backend])

  return useQuery({
    queryKey: queryKeys.locations(orgId ?? ''),
    queryFn: () => registry.backend.listLocations(orgId!),
    enabled: Boolean(orgId),
  })
}
