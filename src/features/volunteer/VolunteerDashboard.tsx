import { Clock, MapPin, Play, Sparkles, Users } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { InstallPrompt } from '@/components/InstallPrompt'
import { Thermometer } from '@/components/Thermometer'
import { Chip } from '@/components/ui/chip'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Stat } from '@/components/ui/stat'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_CONFIG, type TimeWindowMinutes } from '@/config/app.config'
import { useLocations } from '@/data/useLocations'
import { useProgress } from '@/data/useProgress'
import { useServiceAreas } from '@/data/useServiceAreas'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { useShiftStore } from '@/store/shiftStore'

export function VolunteerDashboard() {
  const navigate = useNavigate()
  const { volunteer } = useActiveVolunteer()
  const { data: locations = [], isLoading: loadingLocations } = useLocations()
  const { data: progress, isLoading: loadingProgress } = useProgress()
  const serviceAreas = useServiceAreas()

  const minutes = useShiftStore((s) => s.minutes)
  const shiftStatus = useShiftStore((s) => s.status)
  const startShift = useShiftStore((s) => s.startShift)
  const resetShift = useShiftStore((s) => s.resetShift)

  const openCount = useMemo(
    () => locations.filter((l) => l.status === 'available').length,
    [locations],
  )

  const chooseMinutes = (m: TimeWindowMinutes) => {
    useShiftStore.setState({ minutes: m })
  }

  const onStart = () => {
    const origin = serviceAreas[0]
      ? {
          lat: serviceAreas[0].centerLat,
          lng: serviceAreas[0].centerLng,
          label: serviceAreas[0].name,
        }
      : null
    startShift({ minutes, origin })
    toast.success(`Shift started — ${minutes} minute window`)
    void navigate('/shift')
  }

  const onContinue = () => {
    void navigate('/shift')
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Welcome back{volunteer ? ',' : ''}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {volunteer?.displayName ?? 'Volunteer'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {APP_CONFIG.tagline}.
        </p>
      </header>

      {shiftStatus === 'active' && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">
                Shift in progress
              </p>
              <p className="text-xs text-muted-foreground">
                Pick up where you left off.
              </p>
            </div>
            <Button size="lg" onClick={onContinue} className="gap-2">
              <Play className="h-4 w-4" />
              Continue
            </Button>
          </div>
        </div>
      )}

      <section
        aria-labelledby="start-shift-heading"
        className="rounded-2xl border bg-card p-5 shadow-sm"
      >
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" aria-hidden />
          <h2
            id="start-shift-heading"
            className="text-lg font-bold tracking-tight"
          >
            How much time do you have?
          </h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Pick a window. We&apos;ll suggest a route so nobody doubles up.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {APP_CONFIG.defaultTimeWindows.map((m) => (
            <Chip
              key={m}
              selected={minutes === m}
              onClick={() => chooseMinutes(m)}
              aria-label={`${m} minutes`}
            >
              {m} min
            </Chip>
          ))}
        </div>
        <Button
          size="xl"
          className="mt-4 w-full gap-2"
          onClick={shiftStatus === 'active' ? onContinue : onStart}
          disabled={openCount === 0 && shiftStatus !== 'active'}
        >
          {shiftStatus === 'active' ? (
            <>
              <Play className="h-5 w-5" /> Continue shift
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Start my shift
            </>
          )}
        </Button>
        {shiftStatus === 'ended' && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full"
            onClick={() => resetShift()}
          >
            Clear previous shift
          </Button>
        )}
      </section>

      <section
        aria-labelledby="team-progress-heading"
        className="rounded-2xl border bg-card p-5 shadow-sm"
      >
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" aria-hidden />
          <h2
            id="team-progress-heading"
            className="text-lg font-bold tracking-tight"
          >
            Team progress
          </h2>
        </div>
        {loadingProgress || !progress ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : progress.total === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No places yet"
            description="An admin can import places to get started."
          />
        ) : (
          <>
            <Thermometer
              value={progress.percentComplete}
              completed={
                progress.byStatus.find((s) => s.status === 'completed')?.count ?? 0
              }
              total={progress.total}
              size="md"
            />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat
                label="Open"
                value={
                  progress.byStatus.find((s) => s.status === 'available')
                    ?.count ?? 0
                }
                tone="primary"
              />
              <Stat
                label="Claimed"
                value={
                  progress.byStatus.find((s) => s.status === 'claimed')?.count ?? 0
                }
                tone="info"
              />
              <Stat
                label="Done"
                value={
                  progress.byStatus.find((s) => s.status === 'completed')
                    ?.count ?? 0
                }
                tone="success"
              />
            </div>
          </>
        )}
      </section>

      {!loadingLocations && locations.length === 0 && (
        <EmptyState
          icon={MapPin}
          title="No places loaded"
          description="An admin can import a CSV of locations from the admin panel."
        />
      )}

      <InstallPrompt />
    </div>
  )
}
