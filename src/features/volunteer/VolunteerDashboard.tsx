import { Clock, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { APP_CONFIG, type TimeWindowMinutes } from '@/config/app.config'
import { useLocations } from '@/data/useLocations'
import { useProgress } from '@/data/useProgress'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { cn } from '@/lib/utils'

export function VolunteerDashboard() {
  const { volunteer } = useActiveVolunteer()
  const { data: locations = [] } = useLocations()
  const { data: progress } = useProgress()
  const [minutes, setMinutes] = useState<TimeWindowMinutes>(30)

  const nearby = locations
    .filter((l) => l.status === 'available' || l.status === 'claimed')
    .slice(0, 5)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          Hi{volunteer ? `, ${volunteer.displayName}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          Pick how long you can be out — we&apos;ll suggest nearby stops so nobody
          doubles up.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            How much time do you have?
          </CardTitle>
          <CardDescription>Tap a window, then get your route.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {APP_CONFIG.defaultTimeWindows.map((m) => (
            <Button
              key={m}
              type="button"
              variant={minutes === m ? 'default' : 'outline'}
              size="sm"
              className={cn('min-w-[72px]', minutes === m && 'shadow-md')}
              onClick={() => setMinutes(m)}
            >
              {m} min
            </Button>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full gap-2" size="lg" asChild>
        <Link to={`/routes?minutes=${minutes}`}>
          <Sparkles className="h-4 w-4" />
          Get my route
        </Link>
      </Button>

      {progress && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team progress</CardTitle>
            <CardDescription>
              {progress.percentComplete}% of stops completed org-wide.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Nearby needs attention</CardTitle>
          <CardDescription>First handful of open stops (demo data).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {nearby.length === 0 ? (
            <p className="text-muted-foreground">No stops available right now.</p>
          ) : (
            <ul className="space-y-2">
              {nearby.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-card/50 px-3 py-2"
                >
                  <span className="min-w-0 truncate font-medium">{l.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {l.status === 'claimed' ? 'In progress' : 'Open'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
