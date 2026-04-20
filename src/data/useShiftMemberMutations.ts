import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useRegistry } from '@/providers/useRegistry'
import type {
  AddShiftMemberInput,
  UpdateShiftMemberInput,
} from '@/providers/backend/BackendProvider'

function useInvalidateShiftMembers() {
  const queryClient = useQueryClient()
  return (shiftId: string, campaignId?: string | null) => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.shiftMembers(shiftId),
    })
    if (campaignId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.campaignReport(campaignId),
      })
    }
  }
}

export function useAddShiftMember() {
  const registry = useRegistry()
  const invalidate = useInvalidateShiftMembers()

  return useMutation({
    mutationFn: async (input: {
      shiftId: string
      campaignId?: string | null
      input: AddShiftMemberInput
    }) => {
      if (!registry.backend.addShiftMember) {
        throw new Error('This backend does not support editing shifts yet')
      }
      return registry.backend.addShiftMember(input.shiftId, input.input)
    },
    onSuccess: (_member, variables) => {
      invalidate(variables.shiftId, variables.campaignId)
    },
  })
}

export function useUpdateShiftMember() {
  const registry = useRegistry()
  const invalidate = useInvalidateShiftMembers()

  return useMutation({
    mutationFn: async (input: {
      memberId: string
      shiftId: string
      campaignId?: string | null
      patch: UpdateShiftMemberInput
    }) => {
      if (!registry.backend.updateShiftMember) {
        throw new Error('This backend does not support editing shifts yet')
      }
      return registry.backend.updateShiftMember(input.memberId, input.patch)
    },
    onSuccess: (_member, variables) => {
      invalidate(variables.shiftId, variables.campaignId)
    },
  })
}

export function useRemoveShiftMember() {
  const registry = useRegistry()
  const invalidate = useInvalidateShiftMembers()

  return useMutation({
    mutationFn: async (input: {
      memberId: string
      shiftId: string
      campaignId?: string | null
    }) => {
      if (!registry.backend.removeShiftMember) {
        throw new Error('This backend does not support editing shifts yet')
      }
      await registry.backend.removeShiftMember(input.memberId)
    },
    onSuccess: (_void, variables) => {
      invalidate(variables.shiftId, variables.campaignId)
    },
  })
}
