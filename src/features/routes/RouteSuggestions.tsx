import { useQuery } from '@tanstack/react-query'
import { useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { APP_CONFIG, type TimeWindowMinutes } from '@/config/app.config'
import { filterLocationsByArea } from '@/domain/services/areaFilter'
import { useClaimLocation } from '@/data/useClaimLocation'
import { useCompleteLocation } from '@/data/useCompleteLocation'
import { useLocations } from '@/data/useLocations'
import { useServiceAreas } from '@/data/useServiceAreas'
import { useSkipLocation } from '@/data/useSkipLocation'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { useRegistry } from '@/providers/useRegistry'
import { useAreaFilterStore } from '@/store/areaFilterStore'

function parseMinutes(raw: string | null): TimeWindowMinutes {
  const n = Number(raw)
  const allowed = APP_CONFIG.defaultTimeWindows as readonly number[]
  if (!Number.isFinite(n) || !allowed.includes(n)) return 30
  return n as TimeWindowMinutes
}

export function RouteSuggestions() {
  const registry = useRegistry()
  const [params, setParams] = useSearchParams()
  const minutes = parseMinutes(params.get('minutes'))
  const { data: locations = [], isLoading } = useLocations()
  const serviceAreas = useServiceAreas()
  const { volunteer, activeVolunteerId } = useActiveVolunteer()
  const areaSearch = useAreaFilterStore((s) => s.searchText)
  const centerLat = useAreaFilterStore((s) => s.centerLat)
  const centerLng = useAreaFilterStore((s) => s.centerLng)
  const radiusMeters = useAreaFilterStore((s) => s.radiusMeters)
  const polygon = useAreaFilterStore((s) => s.polygon)
  const claim = useClaimLocation()
  const complete = useCompleteLocation()
  const skip = useSkipLocation()

  useEffect(() => {
    if (!params.get('minutes')) {
      setParams({ minutes: '30' }, { replace: true })
    }
  }, [params, setParams])

  const center = useMemo(
    () =>
      serviceAreas[0]
        ? { lat: serviceAreas[0].centerLat, lng: serviceAreas[0].centerLng }
        : { lat: 39.7392, lng: -104.9903 },
    [serviceAreas],
  )

  const orgId = locations[0]?.organizationId

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

  const locationFingerprint = useMemo(
    () => filteredLocations.map((l) => `${l.id}:${l.status}`).join('|'),
    [filteredLocations],
  )

  const { data: suggestion = null } = useQuery({
    queryKey: [
      'routeSuggestion',
      orgId,
      activeVolunteerId,
      minutes,
      center.lat,
      center.lng,
      locationFingerprint,
    ],
    queryFn: () =>
      registry.routing.suggestRoute({
        organizationId: orgId!,
        volunteerId: activeVolunteerId!,
        locations: filteredLocations,
        timeWindowMinutes: minutes,
        origin: center,
      }),
    enabled: Boolean(
      orgId && activeVolunteerId && filteredLocations.length > 0,
    ),
  })

  const stops = useMemo(() => {
    if (!suggestion) return []
    const map = new Map(filteredLocations.map((l) => [l.id, l]))
    return suggestion.locationIds.map((id) => map.get(id)).filter(Boolean)
  }, [suggestion, filteredLocations])

  const handle = (kind: 'claim' | 'complete' | 'skip', id: string) => {
    if (!activeVolunteerId) {
      toast.error('Pick a volunteer in the header')
      return
    }
    const p =
      kind === 'claim'
        ? claim.mutateAsync({ locationId: id, volunteerId: activeVolunteerId })
        : kind === 'complete'
          ? complete.mutateAsync({ locationId: id, volunteerId: activeVolunteerId })
          : skip.mutateAsync({ locationId: id, volunteerId: activeVolunteerId })
    void p.then(() => toast.success(kind === 'complete' ? 'Marked done' : 'Updated'))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Suggested route</h1>
          <p className="text-sm text-muted-foreground">
            ~{minutes} minute window — nearest stops first (simple heuristic).
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/volunteer">Change time</Link>
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading stops…</p>
      )}

      {!isLoading && stops.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No stops in this window</CardTitle>
            <CardDescription>
              Try a longer window or check the locations list for open stops.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link to="/locations">Browse all stops</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <ol className="space-y-3">
        {stops.map((loc, idx) => (
          <li key={loc!.id}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {idx + 1}. {loc!.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {loc!.address}
                    </CardDescription>
                  </div>
                  <StatusBadge status={loc!.status} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {loc!.status === 'available' && (
                  <Button
                    size="sm"
                    disabled={claim.isPending}
                    onClick={() => void handle('claim', loc!.id)}
                  >
                    Claim
                  </Button>
                )}
                {loc!.status !== 'completed' && loc!.status !== 'skipped' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={complete.isPending}
                    onClick={() => void handle('complete', loc!.id)}
                  >
                    Complete
                  </Button>
                )}
                {loc!.status !== 'completed' && loc!.status !== 'skipped' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={skip.isPending}
                    onClick={() => void handle('skip', loc!.id)}
                  >
                    Skip
                  </Button>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>

      {volunteer && (
        <p className="text-center text-xs text-muted-foreground">
          Acting as <span className="font-medium text-foreground">{volunteer.displayName}</span>
        </p>
      )}
    </div>
  )
}
