import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import type { SuggestedPlace } from '@/domain/models/suggestedPlace'
import { useRegistry } from '@/providers/useRegistry'

export function useSuggestedPlaces() {
  const orgId = useOrgId()
  const registry = useRegistry()
  return useQuery<SuggestedPlace[]>({
    queryKey: queryKeys.suggestedPlaces(orgId ?? ''),
    queryFn: async () => {
      if (!registry.backend.listSuggestedPlaces) return []
      return registry.backend.listSuggestedPlaces(orgId!)
    },
    enabled: Boolean(orgId),
  })
}

export function useApproveSuggestedPlace() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()
  return useMutation({
    mutationFn: async (placeId: string) => {
      if (!registry.backend.approveSuggestedPlace) {
        throw new Error('Not supported on this backend')
      }
      return registry.backend.approveSuggestedPlace(placeId)
    },
    onSuccess: () => {
      if (!orgId) return
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suggestedPlaces(orgId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.locations(orgId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.progress(orgId),
      })
    },
  })
}

export function useRejectSuggestedPlace() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()
  return useMutation({
    mutationFn: async (placeId: string) => {
      if (!registry.backend.rejectSuggestedPlace) {
        throw new Error('Not supported on this backend')
      }
      return registry.backend.rejectSuggestedPlace(placeId)
    },
    onSuccess: () => {
      if (!orgId) return
      void queryClient.invalidateQueries({
        queryKey: queryKeys.suggestedPlaces(orgId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.locations(orgId),
      })
    },
  })
}
