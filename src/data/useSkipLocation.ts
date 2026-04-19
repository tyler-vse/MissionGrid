import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useSkipLocation() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: {
      locationId: string
      volunteerId: string
      shiftId?: string | null
      memberId?: string | null
    }) => {
      return registry.backend.skipLocation({
        locationId: input.locationId,
        volunteerId: input.volunteerId,
        shiftId: input.shiftId ?? null,
        memberId: input.memberId ?? null,
      })
    },
    onSuccess: () => {
      if (!orgId) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.locations(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(orgId) })
    },
  })
}
