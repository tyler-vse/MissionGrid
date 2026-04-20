import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'
import type {
  CreateServiceAreaInput,
  UpdateServiceAreaInput,
} from '@/providers/backend/BackendProvider'

export function useServiceAreas() {
  const orgId = useOrgId()
  const registry = useRegistry()
  const { data = [] } = useQuery({
    queryKey: queryKeys.serviceAreas(orgId ?? ''),
    queryFn: () => registry.backend.listServiceAreas(orgId!),
    enabled: Boolean(orgId),
  })
  return data
}

function useInvalidateServiceAreas() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  return () => {
    if (!orgId) return
    void queryClient.invalidateQueries({
      queryKey: queryKeys.serviceAreas(orgId),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.campaigns(orgId),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.adminLocations(orgId),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.locations(orgId),
    })
  }
}

export function useCreateServiceArea() {
  const registry = useRegistry()
  const orgId = useOrgId()
  const invalidate = useInvalidateServiceAreas()
  return useMutation({
    mutationFn: async (
      input: Omit<CreateServiceAreaInput, 'organizationId'> & {
        organizationId?: string
      },
    ) => {
      if (!registry.backend.createServiceArea) {
        throw new Error('This backend does not support creating zones yet')
      }
      const resolvedOrgId = input.organizationId ?? orgId
      if (!resolvedOrgId) throw new Error('Organization not loaded')
      return registry.backend.createServiceArea({
        ...input,
        organizationId: resolvedOrgId,
      })
    },
    onSuccess: () => invalidate(),
  })
}

export function useUpdateServiceArea() {
  const registry = useRegistry()
  const invalidate = useInvalidateServiceAreas()
  return useMutation({
    mutationFn: async (input: {
      id: string
      patch: UpdateServiceAreaInput
    }) => {
      if (!registry.backend.updateServiceArea) {
        throw new Error('This backend does not support editing zones yet')
      }
      return registry.backend.updateServiceArea(input.id, input.patch)
    },
    onSuccess: () => invalidate(),
  })
}

export function useDeleteServiceArea() {
  const registry = useRegistry()
  const invalidate = useInvalidateServiceAreas()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!registry.backend.deleteServiceArea) {
        throw new Error('This backend does not support deleting zones yet')
      }
      await registry.backend.deleteServiceArea(id)
    },
    onSuccess: () => invalidate(),
  })
}
