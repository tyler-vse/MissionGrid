import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useRegistry } from '@/providers/useRegistry'

export function useGeneratePartyToken() {
  const queryClient = useQueryClient()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: { shiftId: string; ttlMinutes?: number }) => {
      if (!registry.backend.generatePartyToken) {
        throw new Error('This backend does not support party tokens yet')
      }
      return registry.backend.generatePartyToken(
        input.shiftId,
        input.ttlMinutes,
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
