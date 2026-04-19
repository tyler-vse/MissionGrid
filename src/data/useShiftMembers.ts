import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useRegistry } from '@/providers/useRegistry'

export function useShiftMembers(shiftId: string | null | undefined) {
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.shiftMembers(shiftId ?? ''),
    queryFn: () =>
      registry.backend.listShiftMembers?.(shiftId!) ?? Promise.resolve([]),
    enabled: Boolean(shiftId) && Boolean(registry.backend.listShiftMembers),
    refetchInterval: 10_000,
  })
}
