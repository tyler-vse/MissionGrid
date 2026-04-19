import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ActivityStatus } from '@/domain/models/activityStatus'
import { filterLocationsByArea } from '@/domain/services/areaFilter'
import { AreaTools } from '@/features/map/AreaTools'
import { useClaimLocation } from '@/data/useClaimLocation'
import { useCompleteLocation } from '@/data/useCompleteLocation'
import { useLocations } from '@/data/useLocations'
import { useSkipLocation } from '@/data/useSkipLocation'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { useAreaFilterStore } from '@/store/areaFilterStore'

type Filter = 'all' | ActivityStatus

export function LocationsList() {
  const { data: locations = [], isLoading } = useLocations()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const { activeVolunteerId } = useActiveVolunteer()
  const claim = useClaimLocation()
  const complete = useCompleteLocation()
  const skip = useSkipLocation()
  const areaSearch = useAreaFilterStore((s) => s.searchText)
  const centerLat = useAreaFilterStore((s) => s.centerLat)
  const centerLng = useAreaFilterStore((s) => s.centerLng)
  const radiusMeters = useAreaFilterStore((s) => s.radiusMeters)
  const polygon = useAreaFilterStore((s) => s.polygon)

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
      if (!q.trim()) return true
      const s = q.toLowerCase()
      return (
        l.name.toLowerCase().includes(s) ||
        l.address.toLowerCase().includes(s)
      )
    })
  }, [locations, filter, q, areaSearch, centerLat, centerLng, radiusMeters, polygon])

  const act = (kind: 'claim' | 'complete' | 'skip', id: string) => {
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
    void p.then(() => toast.success('Updated'))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Locations</h1>
        <p className="text-sm text-muted-foreground">
          Filter, search, and update stops in real time.
        </p>
      </div>

      <AreaTools />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search name or address…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 sm:grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="available">Open</TabsTrigger>
          <TabsTrigger value="claimed">Claimed</TabsTrigger>
          <TabsTrigger value="completed">Done</TabsTrigger>
          <TabsTrigger value="skipped">Skip</TabsTrigger>
          <TabsTrigger value="pending_review">Review</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-3 space-y-2">
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No matches.</p>
        )}
        <ul className="space-y-2">
          {filtered.map((loc) => (
            <li
              key={loc.id}
              className="rounded-xl border bg-card p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{loc.name}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {loc.address}
                  </p>
                </div>
                <StatusBadge status={loc.status} />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {loc.status === 'available' && (
                  <Button
                    size="sm"
                    disabled={claim.isPending}
                    onClick={() => void act('claim', loc.id)}
                  >
                    Claim
                  </Button>
                )}
                {loc.status !== 'completed' && loc.status !== 'skipped' && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={complete.isPending}
                      onClick={() => void act('complete', loc.id)}
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={skip.isPending}
                      onClick={() => void act('skip', loc.id)}
                    >
                      Skip
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
