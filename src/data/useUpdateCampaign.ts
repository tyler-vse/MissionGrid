import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'
import type { UpdateCampaignInput } from '@/providers/backend/BackendProvider'

export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: { id: string; patch: UpdateCampaignInput }) => {
      if (!registry.backend.updateCampaign) {
        throw new Error('This backend does not support campaigns yet')
      }
      return registry.backend.updateCampaign(input.id, input.patch)
    },
    onSuccess: (campaign) => {
      if (orgId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.campaigns(orgId),
        })
      }
      if (campaign) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.campaign(campaign.id),
        })
      }
    },
  })
}
