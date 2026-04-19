import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useShifts(options?: {
  campaignId?: string | null
  from?: string
  to?: string
}) {
  const orgId = useOrgId()
  const registry = useRegistry()
  const campaignId = options?.campaignId ?? null
  return useQuery({
    queryKey: queryKeys.shifts(orgId ?? '', campaignId),
    queryFn: () =>
      registry.backend.listShifts?.({
        organizationId: orgId!,
        campaignId: campaignId ?? undefined,
        from: options?.from,
        to: options?.to,
      }) ?? Promise.resolve([]),
    enabled: Boolean(orgId) && Boolean(registry.backend.listShifts),
  })
}
