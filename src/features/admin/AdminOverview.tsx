import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  CircleOff,
  FileUp,
  Link2,
  MapPin,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Thermometer } from '@/components/Thermometer'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineAlert } from '@/components/ui/inline-alert'
import { SectionHeader } from '@/components/ui/section-header'
import { Stat } from '@/components/ui/stat'
import { APP_CONFIG } from '@/config/app.config'
import {
  encodeInviteHash,
} from '@/config/runtimeConfig'
import type { ActivityStatus } from '@/domain/models/activityStatus'
import {
  DEFAULT_PLACE_CATEGORY,
  PLACE_CATEGORY_ORDER,
  PLACE_CATEGORY_PRESETS,
  type PlaceCategoryId,
} from '@/domain/models/placeCategory'
import { queryKeys } from '@/data/queryKeys'
import { useOrganization } from '@/data/useOrganization'
import { useProgress } from '@/data/useProgress'
import { useRecentEvents } from '@/data/useRecentEvents'
import { useSuggestedPlaces } from '@/data/useSuggestedPlaces'
import { useMockBackendStore } from '@/store/mockBackendStore'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'
import { cn } from '@/lib/utils'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'

function eventIcon(to: ActivityStatus) {
  switch (to) {
    case 'completed':
      return Check
    case 'claimed':
      return Sparkles
    case 'skipped':
      return X
    case 'pending_review':
      return ShieldCheck
    default:
      return CircleOff
  }
}

function eventLabel(to: ActivityStatus): string {
  switch (to) {
    case 'available':
      return 'marked available'
    case 'claimed':
      return 'claimed'
    case 'completed':
      return 'completed'
    case 'skipped':
      return 'skipped'
    case 'pending_review':
      return 'flagged for review'
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.round(hr / 24)
  return `${days}d ago`
}

export function AdminOverview() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: org } = useOrganization()
  const { data: progress } = useProgress()
  const { data: events = [] } = useRecentEvents(15)
  const { data: suggested = [] } = useSuggestedPlaces()
  const placeCategoryDefault =
    useRuntimeConfigStore((s) => s.placeCategoryDefault) ??
    DEFAULT_PLACE_CATEGORY
  const patchRuntime = useRuntimeConfigStore((s) => s.patch)
  const supabaseUrl = useRuntimeConfigStore((s) => s.supabaseUrl)
  const supabaseAnonKey = useRuntimeConfigStore((s) => s.supabaseAnonKey)
  const organizationId = useRuntimeConfigStore((s) => s.organizationId)
  const googleMapsApiKey = useRuntimeConfigStore((s) => s.googleMapsApiKey)

  const canShowInviteCard = Boolean(
    supabaseUrl && supabaseAnonKey && organizationId,
  )

  const latestInviteQuery = useQuery({
    queryKey: queryKeys.orgInvites(organizationId),
    enabled: canShowInviteCard,
    queryFn: async (): Promise<string | null> => {
      const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
      const { data, error } = await supabase
        .from('org_invites')
        .select('token')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return (data?.[0]?.token as string | undefined) ?? null
    },
  })

  const inviteUrl = (() => {
    const token = latestInviteQuery.data
    if (!canShowInviteCard || !token) return null
    const origin =
      typeof window !== 'undefined' ? window.location.origin : ''
    const hash = encodeInviteHash({
      v: 1,
      supabaseUrl,
      supabaseAnonKey,
      organizationId,
      inviteToken: token,
      googleMapsApiKey: googleMapsApiKey?.trim() || undefined,
    })
    return `${origin}${APP_CONFIG.inviteRoute}#${hash}`
  })()

  const truncatedInvite = inviteUrl
    ? inviteUrl.length > 60
      ? `${inviteUrl.slice(0, 48)}…${inviteUrl.slice(-8)}`
      : inviteUrl
    : null

  const setPlaceCategoryDefault = (next: PlaceCategoryId) => {
    patchRuntime({ placeCategoryDefault: next })
    toast.success(
      `Volunteers will now see ${PLACE_CATEGORY_PRESETS[next].label.toLowerCase()} recommendations`,
    )
  }

  const pendingReviewCount = suggested.filter(
    (p) => p.status === 'pending_review',
  ).length

  const reset = () => {
    useMockBackendStore.getState().resetToEmpty()
    useRuntimeConfigStore.getState().reset()
    queryClient.clear()
    toast.message('Reset — running setup again.')
    void navigate('/setup', { replace: true })
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={org?.name ?? 'Organization'}
        description="Coverage, activity, and queue at a glance."
      />

      {canShowInviteCard && (
        <section
          className="rounded-2xl border bg-card p-4 shadow-sm"
          aria-labelledby="invite-link-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Link2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p
                  id="invite-link-heading"
                  className="text-sm font-semibold"
                >
                  Volunteer invite link
                </p>
                {truncatedInvite ? (
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {truncatedInvite}
                  </p>
                ) : latestInviteQuery.isLoading ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No invite link yet — create one from Manage.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {inviteUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteUrl)
                      toast.success('Copied invite link')
                    } catch {
                      toast.error(
                        'Clipboard blocked — open Manage to copy manually.',
                      )
                    }
                  }}
                >
                  Copy
                </Button>
              )}
              <Button type="button" size="sm" asChild>
                <Link to="/admin/links">Manage invite links</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-sm">
        {progress && progress.total > 0 ? (
          <>
            <Thermometer
              value={progress.percentComplete}
              completed={
                progress.byStatus.find((s) => s.status === 'completed')?.count ?? 0
              }
              total={progress.total}
              size="md"
            />
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
              <Stat
                label="Review"
                value={
                  progress.byStatus.find((s) => s.status === 'pending_review')
                    ?.count ?? 0
                }
                tone="warning"
              />
            </div>
          </>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No places imported yet"
            description="Use CSV import to load your list."
            action={
              <Button asChild>
                <Link to="/admin/imports">
                  <FileUp className="h-4 w-4" />
                  Import CSV
                </Link>
              </Button>
            }
          />
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/admin/imports"
          className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50"
        >
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <FileUp className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">CSV imports</p>
            <p className="text-sm text-muted-foreground">
              Add more places from a spreadsheet.
            </p>
          </div>
        </Link>
        <Link
          to="/admin/review"
          className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/50"
        >
          <div className="rounded-full bg-warning/10 p-3 text-warning">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Review queue</p>
            <p className="text-sm text-muted-foreground">
              {pendingReviewCount > 0
                ? `${pendingReviewCount} place${pendingReviewCount === 1 ? '' : 's'} awaiting review`
                : 'No places waiting on approval'}
            </p>
          </div>
        </Link>
      </div>

      <section
        className="rounded-2xl border bg-card p-5 shadow-sm"
        aria-labelledby="recommendations-heading"
      >
        <div className="mb-3">
          <h2
            id="recommendations-heading"
            className="text-base font-bold tracking-tight"
          >
            Recommended places
          </h2>
          <p className="text-sm text-muted-foreground">
            Default category for &ldquo;Find more places&rdquo; during shifts.
            Volunteers see this automatically; admins can override per search.
          </p>
        </div>
        <div
          role="radiogroup"
          aria-label="Default place category"
          className="flex flex-wrap gap-2"
        >
          {PLACE_CATEGORY_ORDER.map((id) => {
            const preset = PLACE_CATEGORY_PRESETS[id]
            const active = id === placeCategoryDefault
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPlaceCategoryDefault(id)}
                className={cn(
                  'inline-flex h-9 items-center rounded-full border px-3 text-sm font-medium transition-colors',
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
      </section>

      <section
        className="rounded-2xl border bg-card p-5 shadow-sm"
        aria-labelledby="activity-heading"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="activity-heading"
            className="text-base font-bold tracking-tight"
          >
            Recent activity
          </h2>
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recent updates from the field yet.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {events.map((e) => {
              const Icon = eventIcon(e.toStatus)
              return (
                <li key={e.id} className="flex items-start gap-3 py-2.5">
                  <div className="mt-0.5 rounded-full bg-muted p-1.5 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="font-semibold">
                        {e.volunteerName ?? 'A volunteer'}
                      </span>{' '}
                      {eventLabel(e.toStatus)}{' '}
                      <span className="font-semibold">
                        {e.locationName ?? 'a place'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {relativeTime(e.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5"
        aria-labelledby="danger-heading"
      >
        <h2
          id="danger-heading"
          className="flex items-center gap-2 text-base font-bold tracking-tight text-destructive"
        >
          <RotateCcw className="h-4 w-4" />
          Reset this device
        </h2>
        <InlineAlert tone="destructive" className="mt-3">
          Clears in-memory mock data and runtime keys on this browser only.
          Supabase data is untouched.
        </InlineAlert>
        <div className="mt-3">
          <Button variant="destructive" onClick={reset}>
            Reset & rerun setup
          </Button>
        </div>
      </section>

      <div className="text-center">
        <Button variant="ghost" asChild>
          <Link to="/volunteer">
            <Plus className="h-4 w-4" /> Go to volunteer view
          </Link>
        </Button>
      </div>
    </div>
  )
}
