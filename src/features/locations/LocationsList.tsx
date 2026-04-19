import {
  Check,
  Filter,
  List as ListIcon,
  Locate,
  Map as MapIcon,
  Navigation,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { LocationCard } from '@/components/LocationCard'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Chip } from '@/components/ui/chip'
import { SkeletonList } from '@/components/ui/skeleton'
import type { ActivityStatus } from '@/domain/models/activityStatus'
import { filterLocationsByArea } from '@/domain/services/areaFilter'
import { AreaTools } from '@/features/map/AreaTools'
import { useClaimLocation } from '@/data/useClaimLocation'
import { useCompleteLocation } from '@/data/useCompleteLocation'
import { useLocations } from '@/data/useLocations'
import { useServiceAreas } from '@/data/useServiceAreas'
import { useSkipLocation } from '@/data/useSkipLocation'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { useRegistry } from '@/providers/useRegistry'
import { useAreaFilterStore } from '@/store/areaFilterStore'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | ActivityStatus
type View = 'list' | 'map'

const filterTabs: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Open' },
  { id: 'claimed', label: 'Claimed' },
  { id: 'completed', label: 'Done' },
  { id: 'pending_review', label: 'Review' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'no_go', label: 'No-go' },
]

export function LocationsList() {
  const { data: locations = [], isLoading } = useLocations()
  const serviceAreas = useServiceAreas()
  const registry = useRegistry()
  const { activeVolunteerId } = useActiveVolunteer()
  const claim = useClaimLocation()
  const complete = useCompleteLocation()
  const skip = useSkipLocation()

  const [view, setView] = useState<View>('list')
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const areaSearch = useAreaFilterStore((s) => s.searchText)
  const centerLat = useAreaFilterStore((s) => s.centerLat)
  const centerLng = useAreaFilterStore((s) => s.centerLng)
  const radiusMeters = useAreaFilterStore((s) => s.radiusMeters)
  const polygon = useAreaFilterStore((s) => s.polygon)
  const resetFilters = useAreaFilterStore((s) => s.reset)

  const activeFilterCount =
    (areaSearch ? 1 : 0) +
    (radiusMeters ? 1 : 0) +
    (polygon ? 1 : 0)

  const defaultArea = serviceAreas[0]

  const center = useMemo(
    () =>
      defaultArea
        ? { lat: defaultArea.centerLat, lng: defaultArea.centerLng }
        : { lat: 39.7392, lng: -104.9903 },
    [defaultArea],
  )

  const filtered = useMemo(() => {
    const c =
      centerLat != null && centerLng != null
        ? { lat: centerLat, lng: centerLng }
        : null
    const byArea = filterLocationsByArea(locations, {
      textQuery: areaSearch,
      center: c,
      radiusMeters,
      polygon,
    })
    return byArea.filter((l) => {
      if (filter !== 'all' && l.status !== filter) return false
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return (
        l.name.toLowerCase().includes(s) ||
        l.address.toLowerCase().includes(s) ||
        (l.city?.toLowerCase().includes(s) ?? false)
      )
    })
  }, [
    locations,
    filter,
    search,
    areaSearch,
    centerLat,
    centerLng,
    radiusMeters,
    polygon,
  ])

  const selected = filtered.find((l) => l.id === selectedId) ?? null

  const act = async (kind: 'claim' | 'complete' | 'skip', id: string) => {
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
        toast.success('Claimed')
      } else if (kind === 'complete') {
        await complete.mutateAsync({
          locationId: id,
          volunteerId: activeVolunteerId,
        })
        toast.success('Marked done')
      } else {
        await skip.mutateAsync({
          locationId: id,
          volunteerId: activeVolunteerId,
        })
        toast('Skipped')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update stop')
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Places</h1>
        <p className="text-sm text-muted-foreground">
          Search, filter, and update coverage across your service area.
        </p>
      </header>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div
          role="tablist"
          aria-label="View"
          className="inline-flex rounded-lg border bg-muted p-0.5"
        >
          <button
            role="tab"
            aria-selected={view === 'list'}
            onClick={() => setView('list')}
            className={cn(
              'tap inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors',
              view === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            <ListIcon className="h-4 w-4" />
            List
          </button>
          <button
            role="tab"
            aria-selected={view === 'map'}
            onClick={() => setView('map')}
            className={cn(
              'tap inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors',
              view === 'map'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            <MapIcon className="h-4 w-4" />
            Map
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                aria-label="Filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] font-bold leading-5 text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter places</SheetTitle>
                <SheetDescription>
                  Narrow by text, radius, or a custom service polygon.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <AreaTools />
              </div>
              <div className="mt-4 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetFilters()
                    setSearch('')
                    setFilter('all')
                  }}
                >
                  Clear all
                </Button>
                <Button size="sm" onClick={() => setFiltersOpen(false)}>
                  Done
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-11 pl-9"
          placeholder="Search name, address, or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search places"
        />
      </div>

      {/* Status chips */}
      <div
        role="tablist"
        aria-label="Status filter"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {filterTabs.map((t) => (
          <Chip
            key={t.id}
            size="sm"
            selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            role="tab"
            aria-selected={filter === t.id}
            className="shrink-0"
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {view === 'map' ? (
        <div className="space-y-3">
          <div className="relative">
            {registry.map.renderMap({
              locations: filtered,
              center,
              selectedId,
              onSelectLocation: setSelectedId,
              area: defaultArea
                ? {
                    center: {
                      lat: defaultArea.centerLat,
                      lng: defaultArea.centerLng,
                    },
                    radiusMeters: defaultArea.radiusMeters,
                    polygon: defaultArea.polygon ?? null,
                  }
                : null,
              heightClassName: 'h-[60vh]',
            })}
            <Button
              variant="outline"
              size="icon"
              aria-label="Recenter map"
              className="absolute right-3 top-3 bg-background shadow-sm"
              onClick={() => setSelectedId(null)}
            >
              <Locate className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold">Legend:</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1d4ed8]" /> Open
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0284c7]" />{' '}
              Claimed
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" /> Done
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" />{' '}
              Review
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" /> No-go
            </span>
          </div>

          <Sheet
            open={Boolean(selected)}
            onOpenChange={(open) => {
              if (!open) setSelectedId(null)
            }}
          >
            <SheetContent side="bottom" className="max-h-[70vh]">
              {selected && (
                <>
                  <SheetHeader>
                    <SheetTitle>{selected.name}</SheetTitle>
                    <SheetDescription>{selected.address}</SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-3">
                    <LocationCard
                      location={selected}
                      origin={center}
                      actions={
                        <>
                          {selected.lat != null && selected.lng != null && (
                            <Button
                              asChild
                              size="tap"
                              variant="secondary"
                              className="flex-1 gap-1.5"
                            >
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Navigation className="h-4 w-4" />
                                Navigate
                              </a>
                            </Button>
                          )}
                          {selected.status === 'available' && (
                            <Button
                              size="tap"
                              variant="outline"
                              disabled={claim.isPending}
                              onClick={() => void act('claim', selected.id)}
                              className="gap-1.5"
                            >
                              <Plus className="h-4 w-4" />
                              Claim
                            </Button>
                          )}
                          {selected.status !== 'completed' &&
                            selected.status !== 'skipped' &&
                            selected.status !== 'no_go' && (
                              <Button
                                size="tap"
                                variant="success"
                                disabled={complete.isPending}
                                onClick={() =>
                                  void act('complete', selected.id)
                                }
                                className="flex-1 gap-1.5"
                              >
                                <Check className="h-4 w-4" />
                                Complete
                              </Button>
                            )}
                          {selected.status !== 'completed' &&
                            selected.status !== 'skipped' &&
                            selected.status !== 'no_go' && (
                              <Button
                                size="tap"
                                variant="ghost"
                                disabled={skip.isPending}
                                onClick={() => void act('skip', selected.id)}
                                aria-label={`Skip ${selected.name}`}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                        </>
                      }
                    />
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="space-y-2">
          {isLoading && <SkeletonList count={4} />}
          {!isLoading && filtered.length === 0 && (
            <EmptyState
              icon={Filter}
              title="No places match"
              description={
                search || activeFilterCount > 0
                  ? 'Try clearing filters or searching for something else.'
                  : 'No places in this list yet — imports can be made from the admin panel.'
              }
              action={
                (search || activeFilterCount > 0) && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      resetFilters()
                      setSearch('')
                      setFilter('all')
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          )}
          <ul className="space-y-2">
            {filtered.map((loc) => (
              <li key={loc.id}>
                <LocationCard
                  location={loc}
                  origin={center}
                  actions={
                    <>
                      {loc.lat != null && loc.lng != null && (
                        <Button
                          asChild
                          size="sm"
                          variant="secondary"
                          className="gap-1.5"
                        >
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Navigation className="h-4 w-4" />
                            Navigate
                          </a>
                        </Button>
                      )}
                      {loc.status === 'available' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={claim.isPending}
                          onClick={() => void act('claim', loc.id)}
                        >
                          Claim
                        </Button>
                      )}
                      {loc.status !== 'completed' &&
                        loc.status !== 'skipped' &&
                        loc.status !== 'no_go' && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              disabled={complete.isPending}
                              onClick={() => void act('complete', loc.id)}
                            >
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={skip.isPending}
                              onClick={() => void act('skip', loc.id)}
                              aria-label={`Skip ${loc.name}`}
                            >
                              Skip
                            </Button>
                          </>
                        )}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
