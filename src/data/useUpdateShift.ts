import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'
import type { UpdateShiftInput } from '@/providers/backend/BackendProvider'

export function useUpdateShift() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: {
      id: string
      patch: UpdateShiftInput
      /**
       * Previous campaign assignment. When the campaign changes, both the old
       * and new campaign reports need to refresh, so callers should pass the
       * pre-edit value here.
       */
      previousCampaignId?: string | null
    }) => {
      if (!registry.backend.updateShift) {
        throw new Error('This backend does not support editing shifts yet')
      }
      return registry.backend.updateShift(input.id, input.patch)
    },
    onSuccess: (shift, variables) => {
      if (orgId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.shifts(orgId, null),
        })
      }
      if (shift) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.shift(shift.id),
        })
        if (orgId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.shifts(orgId, shift.campaignId ?? null),
          })
        }
        if (shift.campaignId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.campaignReport(shift.campaignId),
          })
        }
      }
      const prev = variables.previousCampaignId
      if (prev && prev !== (shift?.campaignId ?? null)) {
        if (orgId) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.shifts(orgId, prev),
          })
        }
        void queryClient.invalidateQueries({
          queryKey: queryKeys.campaignReport(prev),
        })
      }
    },
  })
}
