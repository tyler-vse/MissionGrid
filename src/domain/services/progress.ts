import type { ActivityStatus } from '@/domain/models/activityStatus'
import type { Location } from '@/domain/models/location'

export interface StatusBreakdown {
  status: ActivityStatus
  count: number
}

export interface ProgressSnapshot {
  total: number
  /** Share of locations marked completed */
  percentComplete: number
  byStatus: StatusBreakdown[]
  /** Counts grouped by serviceAreaId (undefined bucket = "Unassigned") */
  byServiceArea: Record<string, { total: number; completed: number }>
}

/**
 * Progress for org-wide thermometer. Skipped stops count toward total but not
 * completion. Archived stops (soft-deleted) are excluded upstream by the
 * backend filter. No-go stops are broken out as their own bucket but excluded
 * from the completion denominator since volunteers can't act on them.
 */
export function computeProgress(locations: Location[]): ProgressSnapshot {
  const active = locations.filter((l) => !l.archivedAt)
  const countable = active.filter((l) => l.status !== 'no_go')

  const byStatusMap = new Map<ActivityStatus, number>()
  for (const loc of active) {
    byStatusMap.set(loc.status, (byStatusMap.get(loc.status) ?? 0) + 1)
  }

  const byStatus: StatusBreakdown[] = (
    [
      'available',
      'claimed',
      'completed',
      'skipped',
      'pending_review',
      'no_go',
    ] as const
  ).map((status) => ({
    status,
    count: byStatusMap.get(status) ?? 0,
  }))

  const total = countable.length
  const completed = countable.filter((l) => l.status === 'completed').length
  const percentComplete =
    total === 0 ? 0 : Math.round((completed / total) * 100)

  const byServiceArea: Record<string, { total: number; completed: number }> = {}
  for (const loc of countable) {
    const key = loc.serviceAreaId ?? '__unassigned__'
    if (!byServiceArea[key]) {
      byServiceArea[key] = { total: 0, completed: 0 }
    }
    byServiceArea[key].total += 1
    if (loc.status === 'completed') {
      byServiceArea[key].completed += 1
    }
  }

  return { total, percentComplete, byStatus, byServiceArea }
}
