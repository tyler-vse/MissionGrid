import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { getRegistry } from '@/providers/registry'

export function useSkipLocation() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()

  return useMutation({
    mutationFn: async (input: { locationId: string; volunteerId: string }) => {
      return getRegistry().backend.skipLocation(
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
