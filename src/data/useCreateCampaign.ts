import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'
import type { CreateCampaignInput } from '@/providers/backend/BackendProvider'

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: Omit<CreateCampaignInput, 'organizationId'>) => {
      if (!orgId) throw new Error('Missing organization id')
      if (!registry.backend.createCampaign) {
        throw new Error('This backend does not support campaigns yet')
      }
      return registry.backend.createCampaign({
        ...input,
        organizationId: orgId,
      })
    },
    onSuccess: () => {
      if (!orgId) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.campaigns(orgId) })
    },
  })
}
