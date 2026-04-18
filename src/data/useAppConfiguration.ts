import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { getRegistry } from '@/providers/registry'

export function useAppConfiguration() {
  return useQuery({
    queryKey: queryKeys.appConfiguration,
    queryFn: () => getRegistry().backend.getAppConfiguration(),
  })
}
