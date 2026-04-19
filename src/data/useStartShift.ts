import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'
import type { StartShiftInput } from '@/providers/backend/BackendProvider'

export function useStartShift() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (input: Omit<StartShiftInput, 'organizationId'>) => {
      if (!orgId) throw new Error('Missing organization id')
      if (!registry.backend.startShift) {
        throw new Error('This backend does not support shifts yet')
      }
      return registry.backend.startShift({
        ...input,
        organizationId: orgId,
      })
    },
    onSuccess: () => {
      if (!orgId) return
      void queryClient.invalidateQueries({
        queryKey: queryKeys.shifts(orgId, null),
      })
    },
  })
}
