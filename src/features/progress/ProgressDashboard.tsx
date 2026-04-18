import { Progress } from '@/components/ui/progress'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useProgress } from '@/data/useProgress'
import { useServiceAreas } from '@/data/useServiceAreas'

export function ProgressDashboard() {
  const { data: progress, isLoading } = useProgress()
  const serviceAreas = useServiceAreas()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide completion — no duplicate effort.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading progress…</p>
      )}

      {progress && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Coverage thermometer</CardTitle>
              <CardDescription>
                {progress.percentComplete}% of all stops marked complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Progress value={progress.percentComplete} />
              <p className="text-xs text-muted-foreground">
                Total stops: {progress.total}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By status</CardTitle>
              <CardDescription>Live counts from the mock backend.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {progress.byStatus.map((row) => (
                  <li
                    key={row.status}
                    className="flex items-center justify-between rounded-lg border bg-card/60 px-3 py-2"
                  >
                    <span className="capitalize text-muted-foreground">
                      {row.status.replace('_', ' ')}
                    </span>
                    <span className="font-semibold">{row.count}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By service area</CardTitle>
              <CardDescription>
                Buckets keyed by area id (unassigned uses internal key).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(progress.byServiceArea).map(([key, v]) => {
                const areaName =
                  key === '__unassigned__'
                    ? 'Unassigned'
                    : serviceAreas.find((a) => a.id === key)?.name ?? key
                const pct =
                  v.total === 0 ? 0 : Math.round((v.completed / v.total) * 100)
                return (
                  <div
                    key={key}
                    className="rounded-lg border bg-card/60 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{areaName}</span>
                      <span className="text-xs text-muted-foreground">
                        {v.completed}/{v.total} ({pct}%)
                      </span>
                    </div>
                    <Progress value={pct} className="mt-2 h-2" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
