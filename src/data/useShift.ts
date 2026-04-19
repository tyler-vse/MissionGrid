import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useRegistry } from '@/providers/useRegistry'

export function useShift(id: string | null | undefined) {
  const registry = useRegistry()
  return useQuery({
    queryKey: queryKeys.shift(id ?? ''),
    queryFn: () => registry.backend.getShift?.(id!) ?? Promise.resolve(null),
    enabled: Boolean(id) && Boolean(registry.backend.getShift),
    refetchInterval: (q) => {
      const shift = q.state.data
      return shift && shift.status === 'active' ? 15_000 : false
    },
  })
}
