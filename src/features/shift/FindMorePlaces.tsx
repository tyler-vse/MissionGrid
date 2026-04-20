import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Check, LocateFixed, MapPin, Search } from 'lucide-react'
import { toast } from 'sonner'
import { LocationCard } from '@/components/LocationCard'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineAlert } from '@/components/ui/inline-alert'
import { isGoogleMapsConfigured, mergeRuntimeWithEnv } from '@/config/runtimeConfig'
import { filterLocationsByArea } from '@/domain/services/areaFilter'
import type { Location } from '@/domain/models/location'
import {
  DEFAULT_PLACE_CATEGORY,
  PLACE_CATEGORY_ORDER,
  PLACE_CATEGORY_PRESETS,
  type PlaceCategoryId,
} from '@/domain/models/placeCategory'
import type { PlaceSearchResult } from '@/providers/places/PlacesProvider'
import { useCompleteLocation } from '@/data/useCompleteLocation'
import { useLocations } from '@/data/useLocations'
import { useServiceAreas } from '@/data/useServiceAreas'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { useRegistry } from '@/providers/useRegistry'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'
import { useShiftStore } from '@/store/shiftStore'
import type { LatLng } from '@/lib/distance'
import { haversineMeters } from '@/lib/distance'
import { cn } from '@/lib/utils'

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isDuplicate(
  result: PlaceSearchResult,
  existing: Location[],
): boolean {
  const key = normalize(result.name)
  for (const loc of existing) {
    if (normalize(loc.name).includes(key) || key.includes(normalize(loc.name))) {
      if (loc.lat == null || loc.lng == null) {
        // Name match is enough to dedupe address-only stops.
        return true
      }
      const dist = haversineMeters(
        { lat: loc.lat, lng: loc.lng },
        result.location,
      )
      if (dist < 60) return true
    }
  }
  return false
}

export function FindMorePlaces({
  origin,
  onDone,
}: {
  origin: LatLng
  onDone?: () => void
}) {
  const registry = useRegistry()
  const { data: locations = [] } = useLocations()
  const serviceAreas = useServiceAreas()
  const shift = useShiftStore()

  const runtime = useRuntimeConfigStore(
    useShallow((s) => ({
      supabaseUrl: s.supabaseUrl,
      supabaseAnonKey: s.supabaseAnonKey,
      googleMapsApiKey: s.googleMapsApiKey,
      organizationId: s.organizationId,
      volunteerId: s.volunteerId,
      inviteToken: s.inviteToken,
    })),
  )
  const placesAvailable = isGoogleMapsConfigured(mergeRuntimeWithEnv(runtime))

  const orgDefaultCategory =
    useRuntimeConfigStore((s) => s.placeCategoryDefault) ??
    DEFAULT_PLACE_CATEGORY
  const { volunteer, activeVolunteerId } = useActiveVolunteer()
  const isAdmin = Boolean(volunteer?.isAdmin)
  const complete = useCompleteLocation()

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([])
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategoryId>(
    orgDefaultCategory,
  )
  const [dropInOpen, setDropInOpen] = useState(false)
  const [dropInName, setDropInName] = useState('')
  const [dropInAddress, setDropInAddress] = useState('')
  const [dropInCoords, setDropInCoords] = useState<LatLng | null>(null)
  const [dropInGeoLoading, setDropInGeoLoading] = useState(false)
  const [dropInSubmitting, setDropInSubmitting] = useState(false)

  const activeCategory: PlaceCategoryId = isAdmin
    ? selectedCategory
    : orgDefaultCategory
  const activePreset = PLACE_CATEGORY_PRESETS[activeCategory]

  const internalCandidates = useMemo(() => {
    const area = serviceAreas[0]
    const filtered = filterLocationsByArea(locations, {
      center: area
        ? { lat: area.centerLat, lng: area.centerLng }
        : origin,
      radiusMeters: area?.radiusMeters ?? 5000,
    })
    const handled = new Set([
      ...shift.completedLocationIds,
      ...shift.skippedLocationIds,
      ...shift.claimedLocationIds,
      ...shift.addedLocationIds,
    ])
    return filtered
      .filter((l) => l.status === 'available' && !handled.has(l.id))
      .slice(0, 6)
  }, [locations, serviceAreas, origin, shift])

  const runPlaceSearch = async () => {
    if (!placesAvailable) return
    const trimmed = query.trim()
    const hasCategoryAnchor = Boolean(
      activePreset.keyword || activePreset.googleType,
    )
    if (trimmed.length < 2 && !hasCategoryAnchor) {
      toast.error('Enter something to search for')
      return
    }
    setSearching(true)
    try {
      const area = serviceAreas[0]
      const composedQuery = [trimmed, activePreset.keyword]
        .filter((part): part is string => !!part)
        .join(' ')
      const results = await registry.places.searchText(composedQuery, {
        bounds: area
          ? {
              south: area.centerLat - 0.03,
              west: area.centerLng - 0.03,
              north: area.centerLat + 0.03,
              east: area.centerLng + 0.03,
            }
          : undefined,
        type: activePreset.googleType,
        keyword: activePreset.keyword,
      })
      const filtered = results.filter((r) => !isDuplicate(r, locations))
      setPlaceResults(filtered.slice(0, 8))
      if (filtered.length === 0) {
        toast.message('No new places found — everything nearby is already listed.')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const addInternal = (loc: Location) => {
    shift.recordAdded(loc.id)
    toast.success(`${loc.name} added to your shift`)
  }

  const addDiscovered = async (r: PlaceSearchResult) => {
    if (!registry.backend.createSuggestedPlace) {
      toast.error('Suggested places are not supported on this backend yet')
      return
    }
    const orgId = locations[0]?.organizationId
    if (!orgId) return
    try {
      const created = await registry.backend.createSuggestedPlace({
        organizationId: orgId,
        name: r.name,
        address: r.formattedAddress,
        lat: r.location.lat,
        lng: r.location.lng,
        source: 'volunteer_shift',
        submittedByVolunteerId: activeVolunteerId ?? undefined,
      })
      shift.recordAdded(created.id)
      setPlaceResults((list) => list.filter((p) => p.placeId !== r.placeId))
      toast.success(`${r.name} sent to admin review and added to your shift`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add place')
    }
  }

  const captureDropInLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error("Geolocation isn't available on this device")
      return
    }
    setDropInGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDropInCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
        setDropInGeoLoading(false)
        toast.success('Current location captured')
      },
      (err) => {
        setDropInGeoLoading(false)
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied'
            : "Couldn't read your location",
        )
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    )
  }

  const resetDropIn = () => {
    setDropInName('')
    setDropInAddress('')
    setDropInCoords(null)
  }

  const submitDropIn = async () => {
    const name = dropInName.trim()
    if (!name) {
      toast.error('Add a place name')
      return
    }
    if (!registry.backend.createSuggestedPlace) {
      toast.error('Drop-ins are not supported on this backend yet')
      return
    }
    if (!activeVolunteerId) {
      toast.error('Pick a volunteer in the header')
      return
    }
    const orgId = locations[0]?.organizationId
    if (!orgId) {
      toast.error('No organization configured')
      return
    }
    setDropInSubmitting(true)
    try {
      const coords = dropInCoords ?? origin
      const created = await registry.backend.createSuggestedPlace({
        organizationId: orgId,
        name,
        address: dropInAddress.trim(),
        lat: coords.lat,
        lng: coords.lng,
        source: 'volunteer_dropin',
        submittedByVolunteerId: activeVolunteerId,
      })
      await complete.mutateAsync({
        locationId: created.id,
        volunteerId: activeVolunteerId,
        shiftId: shift.shiftId ?? null,
        memberId: shift.partyMemberId ?? null,
      })
      shift.recordAdded(created.id)
      shift.recordComplete(created.id)
      const done = useShiftStore.getState().completedLocationIds.length
      toast.success(
        `${created.name} logged as complete — ${done} place${done === 1 ? '' : 's'} done`,
      )
      resetDropIn()
      setDropInOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not log drop-in')
    } finally {
      setDropInSubmitting(false)
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {!placesAvailable && (
        <InlineAlert tone="info">
          Google Places isn&apos;t set up, so we&apos;re only showing places
          already in your list.
        </InlineAlert>
      )}

      {internalCandidates.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Nearby in your area
          </h3>
          {internalCandidates.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              origin={origin}
              actions={
                <Button
                  size="tap"
                  variant="secondary"
                  onClick={() => addInternal(loc)}
                  className="ml-auto"
                >
                  Add to shift
                </Button>
              }
            />
          ))}
        </div>
      )}

      {placesAvailable && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">
            Search for more
          </h3>
          {isAdmin && (
            <div
              role="radiogroup"
              aria-label="Recommendation category"
              className="flex flex-wrap gap-1.5"
            >
              {PLACE_CATEGORY_ORDER.map((id) => {
                const preset = PLACE_CATEGORY_PRESETS[id]
                const active = id === selectedCategory
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedCategory(id)}
                    className={cn(
                      'inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors',
                      active
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    {preset.label}
                  </button>
                )
              })}
            </div>
          )}
          {isAdmin && activeCategory !== 'all' && (
            <p className="text-xs text-muted-foreground">
              Filtering recommendations: {activePreset.label}
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void runPlaceSearch()
              }}
              placeholder="e.g. community center, pantry"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="button"
              onClick={() => void runPlaceSearch()}
              disabled={searching}
              className="gap-1.5"
            >
              <Search className="h-4 w-4" />
              {searching ? 'Searching…' : 'Search'}
            </Button>
          </div>
          {placeResults.length > 0 && (
            <ul className="space-y-2">
              {placeResults.map((r) => (
                <li
                  key={r.placeId}
                  className="rounded-xl border bg-card p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{r.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {r.formattedAddress}
                      </p>
                    </div>
                    <Button
                      size="tap"
                      variant="secondary"
                      onClick={() => void addDiscovered(r)}
                      className="shrink-0"
                    >
                      Add
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {internalCandidates.length === 0 && placeResults.length === 0 && !placesAvailable && (
        <EmptyState
          icon={Search}
          title="No more nearby places"
          description="Everything in your service area is already on your route."
        />
      )}

      <div className="space-y-2 rounded-xl border border-dashed bg-background p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              Log a drop-in
            </h3>
            <p className="text-xs text-muted-foreground">
              At a place that isn&rsquo;t on your route? Add it and mark it
              complete in one tap.
            </p>
          </div>
          {!dropInOpen && (
            <Button
              size="tap"
              variant="outline"
              onClick={() => setDropInOpen(true)}
              className="shrink-0 gap-1.5"
            >
              <MapPin className="h-4 w-4" />
              Add drop-in
            </Button>
          )}
        </div>
        {dropInOpen && (
          <div className="space-y-2 pt-1">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Place name
              </span>
              <input
                type="text"
                value={dropInName}
                onChange={(e) => setDropInName(e.target.value)}
                placeholder="e.g. Mack's Barbershop"
                autoFocus
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">
                Address (optional)
              </span>
              <input
                type="text"
                value={dropInAddress}
                onChange={(e) => setDropInAddress(e.target.value)}
                placeholder="1234 Main St"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={captureDropInLocation}
                disabled={dropInGeoLoading}
                className="gap-1.5"
              >
                <LocateFixed className="h-4 w-4" />
                {dropInGeoLoading
                  ? 'Locating…'
                  : dropInCoords
                    ? 'Location captured'
                    : 'Use my location'}
              </Button>
              {dropInCoords && (
                <span className="text-xs text-muted-foreground">
                  {dropInCoords.lat.toFixed(5)}, {dropInCoords.lng.toFixed(5)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  resetDropIn()
                  setDropInOpen(false)
                }}
                disabled={dropInSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="tap"
                variant="success"
                onClick={() => void submitDropIn()}
                disabled={dropInSubmitting || !dropInName.trim()}
                className="gap-1.5"
              >
                <Check className="h-4 w-4" />
                {dropInSubmitting ? 'Saving…' : 'Log as complete'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Drop-ins are sent to the admin review queue for approval.
            </p>
          </div>
        )}
      </div>

      {onDone && (
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onDone}>
            Done adding
          </Button>
        </div>
      )}
    </div>
  )
}
