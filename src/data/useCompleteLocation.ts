import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useCompleteLocation() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: {
      locationId: string
      volunteerId: string
      notes?: string
      shiftId?: string | null
      memberId?: string | null
    }) => {
      return registry.backend.completeLocation({
        locationId: input.locationId,
        volunteerId: input.volunteerId,
        note: input.notes,
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
