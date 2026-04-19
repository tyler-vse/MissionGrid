import { useQuery } from '@tanstack/react-query'
import {
  Check,
  Clock,
  Flag,
  MoreHorizontal,
  Navigation,
  Plus,
  SkipForward,
  Sparkles,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { LocationCard } from '@/components/LocationCard'
import { Thermometer } from '@/components/Thermometer'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineAlert } from '@/components/ui/inline-alert'
import { SkeletonList } from '@/components/ui/skeleton'
import type { TimeWindowMinutes } from '@/config/app.config'
import { APP_CONFIG } from '@/config/app.config'
import { filterLocationsByArea } from '@/domain/services/areaFilter'
import { useClaimLocation } from '@/data/useClaimLocation'
import { useCompleteLocation } from '@/data/useCompleteLocation'
import { useLocations } from '@/data/useLocations'
import { useServiceAreas } from '@/data/useServiceAreas'
import { useSkipLocation } from '@/data/useSkipLocation'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { FindMorePlaces } from '@/features/shift/FindMorePlaces'
import { useRegistry } from '@/providers/useRegistry'
import { useAreaFilterStore } from '@/store/areaFilterStore'
import {
  getMinutesElapsed,
  getMinutesRemaining,
  useShiftStore,
} from '@/store/shiftStore'

function buildNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function ShiftView() {
  const navigate = useNavigate()
  const registry = useRegistry()
  const { data: locations = [], isLoading } = useLocations()
  const serviceAreas = useServiceAreas()
  const { volunteer, activeVolunteerId } = useActiveVolunteer()
  const claim = useClaimLocation()
  const complete = useCompleteLocation()
  const skip = useSkipLocation()

  const shift = useShiftStore()
  const [showFindMore, setShowFindMore] = useState(false)
  const [tick, setTick] = useState(0)

  // Redirect idle users back to the volunteer home
  useEffect(() => {
    if (shift.status === 'idle') {
      void navigate('/volunteer', { replace: true })
    }
  }, [shift.status, navigate])

  // 30s tick so the timer stays in sync without a hook-per-render
  useEffect(() => {
    if (shift.status !== 'active') return
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [shift.status])

  const areaSearch = useAreaFilterStore((s) => s.searchText)
  const centerLat = useAreaFilterStore((s) => s.centerLat)
  const centerLng = useAreaFilterStore((s) => s.centerLng)
  const radiusMeters = useAreaFilterStore((s) => s.radiusMeters)
  const polygon = useAreaFilterStore((s) => s.polygon)

  const origin = useMemo(() => {
    if (shift.origin) return shift.origin
    if (serviceAreas[0]) {
      return {
        lat: serviceAreas[0].centerLat,
        lng: serviceAreas[0].centerLng,
      }
    }
    return { lat: 39.7392, lng: -104.9903 }
  }, [shift.origin, serviceAreas])

  const filteredLocations = useMemo(() => {
    const c =
      centerLat != null && centerLng != null
        ? { lat: centerLat, lng: centerLng }
        : null
    return filterLocationsByArea(locations, {
      textQuery: areaSearch,
      center: c,
      radiusMeters,
      polygon,
    })
  }, [locations, areaSearch, centerLat, centerLng, radiusMeters, polygon])

  const orgId = locations[0]?.organizationId
  const minutes: TimeWindowMinutes = shift.minutes

  const routeFingerprint = useMemo(
    () => filteredLocations.map((l) => `${l.id}:${l.status}`).join('|'),
    [filteredLocations],
  )

  const { data: suggestion = null } = useQuery({
    queryKey: [
      'shiftRoute',
      orgId,
      activeVolunteerId,
      minutes,
      origin.lat,
      origin.lng,
      routeFingerprint,
      shift.startedAt,
    ],
    queryFn: () =>
      registry.routing.suggestRoute({
        organizationId: orgId!,
        volunteerId: activeVolunteerId!,
        locations: filteredLocations,
        timeWindowMinutes: minutes,
        origin,
      }),
    enabled: Boolean(
      orgId && activeVolunteerId && filteredLocations.length > 0,
    ),
  })

  const baseStops = useMemo(() => {
    if (!suggestion) return []
    const byId = new Map(filteredLocations.map((l) => [l.id, l]))
    return suggestion.locationIds
      .map((id) => byId.get(id))
      .filter((l): l is NonNullable<typeof l> => Boolean(l))
  }, [suggestion, filteredLocations])

  // Fold in any mid-shift additions the volunteer opted into
  const stops = useMemo(() => {
    const existing = new Set(baseStops.map((l) => l.id))
    const byId = new Map(locations.map((l) => [l.id, l]))
    const extras = shift.addedLocationIds
      .map((id) => byId.get(id))
      .filter((l): l is NonNullable<typeof l> => Boolean(l) && !existing.has(l!.id))
    return [...baseStops, ...extras]
  }, [baseStops, shift.addedLocationIds, locations])

  const pendingStops = useMemo(
    () =>
      stops.filter(
        (l) => l.status !== 'completed' && l.status !== 'skipped',
      ),
    [stops],
  )

  // Progress bookkeeping for the current shift
  const completedCount = stops.filter(
    (l) =>
      l.status === 'completed' ||
      shift.completedLocationIds.includes(l.id),
  ).length
  const totalCount = stops.length
  const shiftPct =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
  const allHandled = totalCount > 0 && pendingStops.length === 0

  // Timer
  void tick
  const minutesRemaining = getMinutesRemaining(shift)
  const minutesElapsed = getMinutesElapsed(shift)

  const handle = async (
    kind: 'claim' | 'complete' | 'skip',
    id: string,
  ) => {
    if (!activeVolunteerId) {
      toast.error('Pick a volunteer in the header')
      return
    }
    try {
      if (kind === 'claim') {
        await claim.mutateAsync({
          locationId: id,
          volunteerId: activeVolunteerId,
        })
        shift.recordClaim(id)
        toast.success('Claimed — head over when ready')
      } else if (kind === 'complete') {
        await complete.mutateAsync({
          locationId: id,
          volunteerId: activeVolunteerId,
        })
        shift.recordComplete(id)
        const done = shift.completedLocationIds.length + 1
        toast.success(`Nice — ${done} place${done === 1 ? '' : 's'} done`)
      } else {
        await skip.mutateAsync({
          locationId: id,
          volunteerId: activeVolunteerId,
        })
        shift.recordSkip(id)
        toast('Skipped')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update stop')
    }
  }

  const extendBy = (m: number) => {
    shift.extendShift(m)
    toast.success(`Added ${m} more minutes`)
    setShowFindMore(true)
  }

  const endShift = () => {
    const done = shift.completedLocationIds.length
    shift.endShift()
    toast.success(`Shift ended — ${done} place${done === 1 ? '' : 's'} done`)
    void navigate('/volunteer')
  }

  if (shift.status === 'idle') return null

  return (
    <div className="space-y-4 pb-6">
      {/* Sticky shift header */}
      <div className="sticky top-[60px] z-20 -mx-4 -mt-4 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden>
                <span className="h-full w-full animate-ping rounded-full bg-success/60" />
              </div>
              <h1 className="text-lg font-bold tracking-tight">
                Shift in progress
              </h1>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {completedCount} of {totalCount} done
              {minutesRemaining !== null && (
                <>
                  {' '}·{' '}
                  <span className="font-semibold text-foreground">
                    {minutesRemaining} min left
                  </span>
                </>
              )}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={endShift}
            className="shrink-0 gap-1"
          >
            <Flag className="h-4 w-4" />
            End
          </Button>
        </div>
        <div className="mt-2">
          <Thermometer
            value={shiftPct}
            completed={completedCount}
            total={totalCount}
            size="sm"
            showMilestones={false}
          />
        </div>
      </div>

      {isLoading && <SkeletonList count={3} />}

      {!isLoading && totalCount === 0 && (
        <EmptyState
          icon={Sparkles}
          title="No places in this window"
          description="Try a longer window, or browse the list to find open places."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {APP_CONFIG.defaultTimeWindows.map((m) => (
                <Chip
                  key={m}
                  selected={minutes === m}
                  onClick={() => {
                    useShiftStore.setState({ minutes: m })
                  }}
                >
                  {m} min
                </Chip>
              ))}
              <Button asChild variant="secondary">
                <Link to="/locations">Browse all places</Link>
              </Button>
            </div>
          }
        />
      )}

      {stops.length > 0 && (
        <ol className="space-y-3">
          {stops.map((loc, idx) => {
            const isDone =
              loc.status === 'completed' ||
              shift.completedLocationIds.includes(loc.id)
            const isSkipped =
              loc.status === 'skipped' ||
              shift.skippedLocationIds.includes(loc.id)
            return (
              <li key={loc.id}>
                <LocationCard
                  location={loc}
                  stepNumber={idx + 1}
                  origin={origin}
                  className={
                    isDone
                      ? 'opacity-70'
                      : isSkipped
                        ? 'opacity-60'
                        : undefined
                  }
                  actions={
                    isDone ? (
                      <div className="flex w-full items-center gap-2 text-sm font-medium text-success">
                        <Check className="h-4 w-4" />
                        Completed
                      </div>
                    ) : isSkipped ? (
                      <div className="flex w-full items-center gap-2 text-sm text-muted-foreground">
                        <SkipForward className="h-4 w-4" />
                        Skipped
                      </div>
                    ) : (
                      <>
                        <Button
                          asChild
                          size="tap"
                          variant="secondary"
                          className="flex-1 gap-1.5"
                        >
                          <a
                            href={buildNavigationUrl(loc.lat, loc.lng)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Navigate to ${loc.name}`}
                          >
                            <Navigation className="h-4 w-4" />
                            Navigate
                          </a>
                        </Button>
                        {loc.status === 'available' && (
                          <Button
                            size="tap"
                            variant="outline"
                            disabled={claim.isPending}
                            onClick={() => void handle('claim', loc.id)}
                            className="gap-1.5"
                          >
                            <Plus className="h-4 w-4" />
                            Claim
                          </Button>
                        )}
                        <Button
                          size="tap"
                          variant="success"
                          disabled={complete.isPending}
                          onClick={() => void handle('complete', loc.id)}
                          className="flex-1 gap-1.5"
                        >
                          <Check className="h-4 w-4" />
                          Complete
                        </Button>
                        <Button
                          size="tap"
                          variant="ghost"
                          disabled={skip.isPending}
                          onClick={() => void handle('skip', loc.id)}
                          aria-label={`Skip ${loc.name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )
                  }
                />
              </li>
            )
          })}
        </ol>
      )}

      {/* Wrap-up / find-more */}
      {totalCount > 0 && (
        <section
          aria-labelledby="wrapup-heading"
          className="rounded-2xl border bg-card p-5 shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            {allHandled ? (
              <Check className="h-5 w-5 text-success" aria-hidden />
            ) : (
              <Clock className="h-5 w-5 text-primary" aria-hidden />
            )}
            <h2
              id="wrapup-heading"
              className="text-lg font-bold tracking-tight"
            >
              {allHandled ? 'Route complete' : 'Have more time?'}
            </h2>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">
            {allHandled
              ? 'Nice work. Add more nearby places to extend your shift, or wrap up.'
              : 'If your window has extra room, pull in more nearby places.'}
          </p>
          {!showFindMore && (
            <div className="flex flex-wrap gap-2">
              {[10, 20, 30].map((m) => (
                <Chip key={m} onClick={() => extendBy(m)}>
                  <Plus className="h-4 w-4" />
                  {m} more min
                </Chip>
              ))}
              <Button
                variant="outline"
                size="tap"
                onClick={() => setShowFindMore(true)}
                className="gap-1.5"
              >
                <MoreHorizontal className="h-4 w-4" />
                Find more places
              </Button>
            </div>
          )}
          {showFindMore && (
            <FindMorePlaces
              origin={origin}
              onDone={() => setShowFindMore(false)}
            />
          )}
        </section>
      )}

      {minutesElapsed !== null &&
        minutesRemaining === 0 &&
        pendingStops.length > 0 && (
          <InlineAlert tone="warning" title="Time's up">
            Your window ended. Extend by tapping a chip above, or end the shift
            any time.
          </InlineAlert>
        )}

      {volunteer && (
        <p className="text-center text-xs text-muted-foreground">
          Acting as{' '}
          <span className="font-medium text-foreground">
            {volunteer.displayName}
          </span>
        </p>
      )}
    </div>
  )
}
