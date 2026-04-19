import { UserCheck, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineAlert } from '@/components/ui/inline-alert'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { APP_CONFIG } from '@/config/app.config'
import { useLocations } from '@/data/useLocations'
import { useRecentEvents } from '@/data/useRecentEvents'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { useVolunteers } from '@/data/useVolunteers'
import { cn } from '@/lib/utils'

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const n = new Date()
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.round(hr / 24)
  return `${days}d ago`
}

export function AdminVolunteers() {
  const { data: volunteers = [], isLoading } = useVolunteers()
  const { data: locations = [] } = useLocations()
  const { data: events = [] } = useRecentEvents(200)
  const { activeVolunteerId } = useActiveVolunteer()

  // Re-derive "active now" every minute so the indicator stays correct during
  // long admin sessions. Using a ticking clock keeps render pure.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const stats = useMemo(() => {
    const perVolunteer = new Map<
      string,
      { lastSeen: string | null; completedToday: number; active: boolean }
    >()
    for (const v of volunteers) {
      perVolunteer.set(v.id, {
        lastSeen: null,
        completedToday: 0,
        active: false,
      })
    }
    for (const e of events) {
      if (!e.volunteerId) continue
      const entry = perVolunteer.get(e.volunteerId)
      if (!entry) continue
      if (!entry.lastSeen || e.createdAt > entry.lastSeen) {
        entry.lastSeen = e.createdAt
      }
      if (e.toStatus === 'completed' && isToday(e.createdAt)) {
        entry.completedToday += 1
      }
    }
    // "Active" = handled a stop in the last 30 min
    const threshold = now - 30 * 60_000
    for (const [, v] of perVolunteer) {
      if (v.lastSeen && new Date(v.lastSeen).getTime() > threshold) {
        v.active = true
      }
    }
    return perVolunteer
  }, [events, volunteers, now])

  const totalLocations = locations.length

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Volunteers"
        description={
          totalLocations > 0
            ? `${volunteers.length} volunteer${volunteers.length === 1 ? '' : 's'} covering ${totalLocations} place${totalLocations === 1 ? '' : 's'}.`
            : 'Invite volunteers via the setup invite link.'
        }
      />

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && volunteers.length === 0 && (
        <EmptyState
          icon={Users}
          title="No volunteers yet"
          description="Re-run setup to generate a Supabase invite link, or load the demo org."
          action={
            <Button asChild>
              <Link to={APP_CONFIG.setupRoute}>Open setup</Link>
            </Button>
          }
        />
      )}

      {!isLoading && volunteers.length > 0 && (
        <ul className="space-y-2">
          {volunteers.map((v) => {
            const info = stats.get(v.id)!
            const isMe = v.id === activeVolunteerId
            return (
              <li
                key={v.id}
                className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm"
              >
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                  {v.displayName.slice(0, 1).toUpperCase()}
                  {info.active && (
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-card"
                      title="Active in the last 30 min"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {v.displayName}
                    {isMe && (
                      <span className="ml-2 text-xs font-medium text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {info.active ? (
                      <span className="font-medium text-success">
                        Active now
                      </span>
                    ) : (
                      `Last seen ${relativeTime(info.lastSeen)}`
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={cn(
                      'text-base font-bold tabular-nums',
                      info.completedToday > 0
                        ? 'text-success'
                        : 'text-muted-foreground',
                    )}
                  >
                    {info.completedToday}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    done today
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <InlineAlert tone="info" icon={false}>
        <p className="flex items-start gap-2 text-sm">
          <UserCheck className="mt-0.5 h-4 w-4 shrink-0" />
          API keys are stored in this browser only. Share the invite link from
          setup to add more volunteers.
        </p>
      </InlineAlert>
    </div>
  )
}
