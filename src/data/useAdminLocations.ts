import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useAdminLocations() {
  const orgId = useOrgId()
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.adminLocations(orgId ?? ''),
    queryFn: async () => {
      if (!registry.backend.listAllLocations) {
        return registry.backend.listLocations(orgId!)
      }
      return registry.backend.listAllLocations(orgId!)
    },
    enabled: Boolean(orgId),
  })
}

function useInvalidateLocations() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  return () => {
    if (!orgId) return
    void queryClient.invalidateQueries({
      queryKey: queryKeys.adminLocations(orgId),
    })
    void queryClient.invalidateQueries({ queryKey: queryKeys.locations(orgId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.progress(orgId) })
  }
}

export function useArchiveLocation() {
  const registry = useRegistry()
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: async (locationId: string) => {
      if (!registry.backend.archiveLocation) {
        throw new Error('This backend does not support archiving places yet')
      }
      return registry.backend.archiveLocation(locationId)
    },
    onSuccess: () => invalidate(),
  })
}

export function useRestoreLocation() {
  const registry = useRegistry()
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: async (locationId: string) => {
      if (!registry.backend.restoreLocation) {
        throw new Error('This backend does not support restoring places yet')
      }
      return registry.backend.restoreLocation(locationId)
    },
    onSuccess: () => invalidate(),
  })
}

export function useSetLocationNoGo() {
  const registry = useRegistry()
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: async (input: { locationId: string; reason?: string }) => {
      if (!registry.backend.setLocationNoGo) {
        throw new Error('This backend does not support no-go flags yet')
      }
      return registry.backend.setLocationNoGo(input)
    },
    onSuccess: () => invalidate(),
  })
}

export function useClearLocationNoGo() {
  const registry = useRegistry()
  const invalidate = useInvalidateLocations()
  return useMutation({
    mutationFn: async (locationId: string) => {
      if (!registry.backend.clearLocationNoGo) {
        throw new Error('This backend does not support no-go flags yet')
      }
      return registry.backend.clearLocationNoGo(locationId)
    },
    onSuccess: () => invalidate(),
  })
}
