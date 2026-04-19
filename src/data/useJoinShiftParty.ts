import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useRegistry } from '@/providers/useRegistry'

export function useJoinShiftParty() {
  const queryClient = useQueryClient()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: {
      shiftId: string
      token: string
      displayName: string
    }) => {
      if (!registry.backend.joinShiftParty) {
        throw new Error('This backend does not support party join yet')
      }
      return registry.backend.joinShiftParty(
        input.shiftId,
        input.token,
        input.displayName,
      )
    },
    onSuccess: (_member, vars) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.shiftMembers(vars.shiftId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.shift(vars.shiftId),
      })
    },
  })
}
