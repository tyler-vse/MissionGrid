import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useEndShift() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (shiftId: string) => {
      if (!registry.backend.endShift) {
        throw new Error('This backend does not support shifts yet')
      }
      return registry.backend.endShift(shiftId)
    },
    onSuccess: (shift) => {
      if (orgId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.shifts(orgId, null),
        })
      }
      if (shift) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.shift(shift.id),
        })
      }
    },
  })
}
