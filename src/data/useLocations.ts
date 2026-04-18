import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { getRegistry } from '@/providers/registry'

export function useLocations() {
  const orgId = useOrgId()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!orgId) return
    const unsub = getRegistry().backend.subscribeLocations(orgId, () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.locations(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(orgId) })
    })
    return unsub
  }, [orgId, queryClient])

  return useQuery({
    queryKey: queryKeys.locations(orgId ?? ''),
    queryFn: () => getRegistry().backend.listLocations(orgId!),
    enabled: Boolean(orgId),
  })
}
