import { useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Search } from 'lucide-react'
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
  const { volunteer } = useActiveVolunteer()
  const isAdmin = Boolean(volunteer?.isAdmin)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [placeResults, setPlaceResults] = useState<PlaceSearchResult[]>([])
  const [selectedCategory, setSelectedCategory] = useState<PlaceCategoryId>(
    orgDefaultCategory,
  )

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
      })
      shift.recordAdded(created.id)
      setPlaceResults((list) => list.filter((p) => p.placeId !== r.placeId))
      toast.success(`${r.name} sent to admin review and added to your shift`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not add place')
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
