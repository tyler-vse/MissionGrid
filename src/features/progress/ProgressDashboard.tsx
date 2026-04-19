import {
  Ban,
  CheckCircle2,
  Clock,
  MapPin,
  SkipForward,
  Sparkles,
} from 'lucide-react'
import { Thermometer } from '@/components/Thermometer'
import { Skeleton } from '@/components/ui/skeleton'
import { Stat } from '@/components/ui/stat'
import { SectionHeader } from '@/components/ui/section-header'
import { EmptyState } from '@/components/ui/empty-state'
import type { ActivityStatus } from '@/domain/models/activityStatus'
import { useProgress } from '@/data/useProgress'
import { useServiceAreas } from '@/data/useServiceAreas'

const statusCopy: Record<
  ActivityStatus,
  { label: string; tone: 'primary' | 'info' | 'success' | 'warning' | 'muted' | 'destructive' }
> = {
  available: { label: 'Open', tone: 'primary' },
  claimed: { label: 'Claimed', tone: 'info' },
  completed: { label: 'Done', tone: 'success' },
  pending_review: { label: 'Review', tone: 'warning' },
  skipped: { label: 'Skipped', tone: 'muted' },
  no_go: { label: 'No-go', tone: 'destructive' },
}

export function ProgressDashboard() {
  const { data: progress, isLoading } = useProgress()
  const serviceAreas = useServiceAreas()

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Team progress"
        description="Organization-wide coverage — no duplicate effort."
      />

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        {isLoading || !progress ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : progress.total === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No places yet"
            description="Import a CSV from the admin panel to start tracking coverage."
          />
        ) : (
          <>
            <Thermometer
              value={progress.percentComplete}
              completed={
                progress.byStatus.find((s) => s.status === 'completed')?.count ?? 0
              }
              total={progress.total}
              size="lg"
            />
            <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {progress.byStatus.map((row) => {
                const meta = statusCopy[row.status]
                const Icon =
                  row.status === 'completed'
                    ? CheckCircle2
                    : row.status === 'skipped'
                      ? SkipForward
                      : row.status === 'pending_review'
                        ? Clock
                        : row.status === 'claimed'
                          ? Sparkles
                          : row.status === 'no_go'
                            ? Ban
                            : MapPin
                return (
                  <Stat
                    key={row.status}
                    label={meta.label}
                    value={row.count}
                    tone={meta.tone}
                    icon={Icon}
                  />
                )
              })}
            </dl>
          </>
        )}
      </section>

      {progress && progress.total > 0 && (
        <section
          className="rounded-2xl border bg-card p-5 shadow-sm"
          aria-labelledby="areas-heading"
        >
          <h2
            id="areas-heading"
            className="mb-3 text-base font-bold tracking-tight"
          >
            By service area
          </h2>
          <div className="space-y-4">
            {Object.entries(progress.byServiceArea).map(([key, v]) => {
              const areaName =
                key === '__unassigned__'
                  ? 'Unassigned'
                  : (serviceAreas.find((a) => a.id === key)?.name ?? key)
              const pct =
                v.total === 0 ? 0 : Math.round((v.completed / v.total) * 100)
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{areaName}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {v.completed}/{v.total} ({pct}%)
                    </span>
                  </div>
                  <Thermometer
                    value={pct}
                    size="sm"
                    showMilestones={false}
                    label={`${areaName} progress`}
                  />
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
