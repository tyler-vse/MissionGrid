import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { getRegistry } from '@/providers/registry'

export function useCompleteLocation() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()

  return useMutation({
    mutationFn: async (input: {
      locationId: string
      volunteerId: string
      notes?: string
    }) => {
      return getRegistry().backend.completeLocation(
        input.locationId,
        input.volunteerId,
        input.notes,
      )
    },
    onSuccess: () => {
      if (!orgId) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.locations(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(orgId) })
    },
  })
}
