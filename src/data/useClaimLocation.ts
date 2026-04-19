import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useClaimLocation() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: { locationId: string; volunteerId: string }) => {
      return registry.backend.claimLocation(
        input.locationId,
        input.volunteerId,
      )
    },
    onSuccess: () => {
      if (!orgId) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.locations(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(orgId) })
    },
  })
}
