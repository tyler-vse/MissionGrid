import { Clock, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/components/ui/section-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCampaigns } from '@/data/useCampaigns'
import { useShifts } from '@/data/useShifts'
import { useVolunteers } from '@/data/useVolunteers'
import type { Shift } from '@/domain/models/shift'
import { shiftDurationMinutes } from '@/domain/services/manHours'

type StatusFilter = 'all' | Shift['status']

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function statusTone(status: Shift['status']): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'abandoned':
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export function AdminShifts() {
  const { data: shifts = [], isLoading } = useShifts({ campaignId: null })
  const { data: volunteers = [] } = useVolunteers()
  const { data: campaigns = [] } = useCampaigns()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [campaignFilter, setCampaignFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const volunteerById = useMemo(
    () => new Map(volunteers.map((v) => [v.id, v])),
    [volunteers],
  )
  const campaignById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c])),
    [campaigns],
  )

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate).getTime() : null
    const toTs = toDate ? new Date(toDate).getTime() + 86_400_000 - 1 : null
    return shifts.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (campaignFilter === 'none' && s.campaignId) return false
      if (
        campaignFilter !== 'all' &&
        campaignFilter !== 'none' &&
        s.campaignId !== campaignFilter
      )
        return false
      const startTs = new Date(s.startedAt).getTime()
      if (fromTs !== null && startTs < fromTs) return false
      if (toTs !== null && startTs > toTs) return false
      return true
    })
  }, [shifts, statusFilter, campaignFilter, fromDate, toDate])

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Shifts"
        description="Review and correct historical shifts — fix missing end times, party sizes, or campaign tags."
      />

      <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="shift-filter-status">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger id="shift-filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="ended">Ended</SelectItem>
              <SelectItem value="abandoned">Abandoned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="shift-filter-campaign">Campaign</Label>
          <Select value={campaignFilter} onValueChange={setCampaignFilter}>
            <SelectTrigger id="shift-filter-campaign">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              <SelectItem value="none">No campaign</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="shift-filter-from">From</Label>
          <Input
            id="shift-filter-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="shift-filter-to">To</Label>
          <Input
            id="shift-filter-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading shifts…</p>
      )}

      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Clock}
          title={shifts.length === 0 ? 'No shifts yet' : 'No matches'}
          description={
            shifts.length === 0
              ? 'Shifts will appear here once volunteers start logging routes.'
              : 'Try loosening your filters to see more shifts.'
          }
        />
      )}

      {filtered.length > 0 && (
        <ul className="space-y-2">
          {filtered.map((s) => {
            const leader = volunteerById.get(s.leaderVolunteerId)
            const campaign = s.campaignId
              ? campaignById.get(s.campaignId)
              : null
            const duration = shiftDurationMinutes(s)
            return (
              <li key={s.id}>
                <Link
                  to={`/admin/shifts/${s.id}`}
                  className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {leader?.displayName ?? 'Unknown leader'}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusTone(s.status)}`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatDateTime(s.startedAt)}
                      {s.endedAt ? ` → ${formatDateTime(s.endedAt)}` : ''}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {duration}m · party {s.partySize}
                      {campaign ? ` · ${campaign.name}` : ' · No campaign'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
