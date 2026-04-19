import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CsvLocationRow } from '@/lib/csv'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'

export function useImportLocationsFromCsv() {
  const queryClient = useQueryClient()
  const orgId = useOrgId()
  const registry = useRegistry()

  return useMutation({
    mutationFn: async (rows: CsvLocationRow[]) => {
      if (!orgId) throw new Error('No organization loaded')
      return registry.backend.importLocationsFromCsv(orgId, rows)
    },
    onSuccess: () => {
      if (!orgId) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.locations(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(orgId) })
    },
  })
}
