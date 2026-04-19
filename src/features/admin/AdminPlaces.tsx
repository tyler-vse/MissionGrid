import {
  Archive,
  Ban,
  Building2,
  Check,
  MapPin,
  RotateCcw,
  Search,
  ShieldAlert,
  Undo2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/components/ui/section-header'
import { StatusBadge } from '@/components/StatusBadge'
import { Textarea } from '@/components/ui/textarea'
import { Chip } from '@/components/ui/chip'
import {
  useAdminLocations,
  useArchiveLocation,
  useClearLocationNoGo,
  useRestoreLocation,
  useSetLocationNoGo,
} from '@/data/useAdminLocations'
import { formatUnknownError } from '@/lib/errors'
import { cn } from '@/lib/utils'
import type { Location } from '@/domain/models/location'

type Filter = 'active' | 'no_go' | 'archived' | 'all'

const filterTabs: { id: Filter; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'no_go', label: 'No-go' },
  { id: 'archived', label: 'Archived' },
  { id: 'all', label: 'All' },
]

export function AdminPlaces() {
  const { data: locations = [], isLoading } = useAdminLocations()
  const archiveMutation = useArchiveLocation()
  const restoreMutation = useRestoreLocation()
  const setNoGo = useSetLocationNoGo()
  const clearNoGo = useClearLocationNoGo()

  const [filter, setFilter] = useState<Filter>('active')
  const [search, setSearch] = useState('')
  const [noGoTarget, setNoGoTarget] = useState<Location | null>(null)
  const [noGoReason, setNoGoReason] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return locations.filter((l) => {
      if (filter === 'active') {
        if (l.archivedAt) return false
        if (l.status === 'no_go') return false
      } else if (filter === 'no_go') {
        if (l.status !== 'no_go') return false
      } else if (filter === 'archived') {
        if (!l.archivedAt) return false
      }
      if (!q) return true
      return (
        l.name.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        (l.city?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [locations, filter, search])

  const counts = useMemo(() => {
    let active = 0
    let noGo = 0
    let archived = 0
    for (const l of locations) {
      if (l.archivedAt) archived += 1
      else if (l.status === 'no_go') noGo += 1
      else active += 1
    }
    return { active, noGo, archived, all: locations.length }
  }, [locations])

  const onArchive = async (loc: Location) => {
    if (
      !window.confirm(
        `Remove "${loc.name}"? Volunteers will no longer see it. You can restore it later.`,
      )
    )
      return
    try {
      await archiveMutation.mutateAsync(loc.id)
      toast.success('Place removed')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const onRestore = async (loc: Location) => {
    try {
      await restoreMutation.mutateAsync(loc.id)
      toast.success('Place restored')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const openNoGoDialog = (loc: Location) => {
    setNoGoTarget(loc)
    setNoGoReason(loc.noGoReason ?? '')
  }

  const confirmNoGo = async () => {
    if (!noGoTarget) return
    try {
      await setNoGo.mutateAsync({
        locationId: noGoTarget.id,
        reason: noGoReason.trim() || undefined,
      })
      toast.success('Flagged as no-go — volunteers will see a warning')
      setNoGoTarget(null)
      setNoGoReason('')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const onClearNoGo = async (loc: Location) => {
    try {
      await clearNoGo.mutateAsync(loc.id)
      toast.success('No-go cleared')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Places"
        description="Remove stops that no longer apply, or red-flag any place where a business asked not to receive flyers."
      />

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

      <div
        role="tablist"
        aria-label="Filter places"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {filterTabs.map((t) => {
          const count =
            t.id === 'active'
              ? counts.active
              : t.id === 'no_go'
                ? counts.noGo
                : t.id === 'archived'
                  ? counts.archived
                  : counts.all
          return (
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
              <span className="ml-1 rounded-full bg-background/60 px-1.5 py-0 text-[10px] font-bold tabular-nums">
                {count}
              </span>
            </Chip>
          )
        })}
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading places…</p>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No places match"
          description={
            search
              ? 'Try clearing the search box.'
              : filter === 'archived'
                ? 'Nothing removed yet.'
                : filter === 'no_go'
                  ? 'No businesses have been flagged yet.'
                  : 'Import places to get started.'
          }
        />
      )}

      {filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((loc) => (
            <li
              key={loc.id}
              className={cn(
                'rounded-2xl border bg-card p-4 shadow-sm',
                loc.status === 'no_go' &&
                  'border-destructive/40 bg-destructive/5',
                loc.archivedAt && 'opacity-70',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-bold">{loc.name}</p>
                    <StatusBadge status={loc.status} />
                    {loc.archivedAt && (
                      <Badge variant="muted" className="gap-1">
                        <Archive className="h-3 w-3" />
                        Archived
                      </Badge>
                    )}
                    {loc.lat == null || loc.lng == null ? (
                      <Badge variant="outline" className="gap-1">
                        <MapPin className="h-3 w-3" />
                        No coords
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {loc.address}
                    {loc.city ? `, ${loc.city}` : ''}
                    {loc.state ? `, ${loc.state}` : ''}
                  </p>
                  {loc.status === 'no_go' && loc.noGoReason && (
                    <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
                      <ShieldAlert
                        className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                        aria-hidden
                      />
                      {loc.noGoReason}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                {loc.archivedAt ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void onRestore(loc)}
                    disabled={restoreMutation.isPending}
                    className="gap-1.5"
                  >
                    <Undo2 className="h-4 w-4" />
                    Restore
                  </Button>
                ) : (
                  <>
                    {loc.status === 'no_go' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void onClearNoGo(loc)}
                        disabled={clearNoGo.isPending}
                        className="gap-1.5"
                      >
                        <Check className="h-4 w-4" />
                        Clear no-go
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openNoGoDialog(loc)}
                        className="gap-1.5"
                      >
                        <Ban className="h-4 w-4" />
                        Mark no-go
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void onArchive(loc)}
                      disabled={archiveMutation.isPending}
                      className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Archive className="h-4 w-4" />
                      Remove
                    </Button>
                  </>
                )}
                {loc.status !== 'no_go' && !loc.archivedAt && (
                  <span className="ml-auto self-center text-xs text-muted-foreground">
                    <RotateCcw className="mr-1 inline h-3 w-3" aria-hidden />
                    Changes are reversible
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(noGoTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setNoGoTarget(null)
            setNoGoReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark "{noGoTarget?.name}" as no-go</DialogTitle>
            <DialogDescription>
              Volunteers will still see this place but it will display a red "Do
              not flyer" warning and can't be claimed. The reason is shown to
              volunteers so they understand why.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="no-go-reason">Reason (optional)</Label>
            <Textarea
              id="no-go-reason"
              rows={3}
              placeholder="e.g. Owner called and asked us to stop — 2026-03-12"
              value={noGoReason}
              onChange={(e) => setNoGoReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setNoGoTarget(null)
                setNoGoReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmNoGo()}
              disabled={setNoGo.isPending}
            >
              {setNoGo.isPending ? 'Saving…' : 'Flag as no-go'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
