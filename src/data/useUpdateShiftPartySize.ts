import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useRegistry } from '@/providers/useRegistry'

export function useUpdateShiftPartySize() {
  const queryClient = useQueryClient()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: { shiftId: string; partySize: number }) => {
      if (!registry.backend.updateShiftPartySize) {
        throw new Error('This backend does not support party size updates yet')
      }
      return registry.backend.updateShiftPartySize(
        input.shiftId,
        input.partySize,
      )
    },
    onSuccess: (shift) => {
      if (!shift) return
      void queryClient.invalidateQueries({
        queryKey: queryKeys.shift(shift.id),
      })
    },
  })
}
