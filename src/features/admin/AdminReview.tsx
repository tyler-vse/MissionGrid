import { Check, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineAlert } from '@/components/ui/inline-alert'
import { SectionHeader } from '@/components/ui/section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useServiceAreas } from '@/data/useServiceAreas'
import {
  useApproveSuggestedPlace,
  useRejectSuggestedPlace,
  useSuggestedPlaces,
} from '@/data/useSuggestedPlaces'
import { formatDistanceMeters, haversineMeters } from '@/lib/distance'
import { useRegistry } from '@/providers/useRegistry'
import { cn } from '@/lib/utils'

export function AdminReview() {
  const registry = useRegistry()
  const { data: suggestions = [], isLoading } = useSuggestedPlaces()
  const serviceAreas = useServiceAreas()
  const approve = useApproveSuggestedPlace()
  const reject = useRejectSuggestedPlace()

  const center = serviceAreas[0]
    ? { lat: serviceAreas[0].centerLat, lng: serviceAreas[0].centerLng }
    : null

  const pending = suggestions.filter((s) => s.status === 'pending_review')
  const recent = suggestions
    .filter((s) => s.status !== 'pending_review')
    .slice(-8)
    .reverse()

  const backendSupportsReview = Boolean(
    registry.backend.listSuggestedPlaces &&
      registry.backend.approveSuggestedPlace &&
      registry.backend.rejectSuggestedPlace,
  )

  const onApprove = (id: string, name: string) => {
    approve.mutate(id, {
      onSuccess: () => toast.success(`${name} approved and added`),
      onError: (e) => toast.error(String(e)),
    })
  }

  const onReject = (id: string, name: string) => {
    reject.mutate(id, {
      onSuccess: () => toast.message(`${name} rejected`),
      onError: (e) => toast.error(String(e)),
    })
  }

  if (!backendSupportsReview) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Review queue" />
        <InlineAlert tone="info" title="Review not available yet">
          Your backend doesn&apos;t support the suggested-places queue. Connect
          the mock backend, or upgrade to a compatible Supabase schema.
        </InlineAlert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Review queue"
        description="Volunteer-suggested places waiting on admin approval."
        action={
          pending.length > 0 ? (
            <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
              {pending.length} pending
            </span>
          ) : null
        }
      />

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && pending.length === 0 && (
        <EmptyState
          icon={ShieldCheck}
          title="All caught up"
          description="No places are waiting for review right now."
        />
      )}

      {pending.length > 0 && (
        <ul className="space-y-3">
          {pending.map((p) => {
            const distance = center
              ? haversineMeters(center, { lat: p.lat, lng: p.lng })
              : null
            return (
              <li
                key={p.id}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.address}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                      {distance !== null && (
                        <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                          {formatDistanceMeters(distance)} from center
                        </span>
                      )}
                      {p.types?.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="rounded-full border px-2 py-0.5 font-medium capitalize"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReject(p.id, p.name)}
                    disabled={reject.isPending}
                  >
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => onApprove(p.id, p.name)}
                    disabled={approve.isPending}
                  >
                    <Check className="h-4 w-4" />
                    Approve
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {recent.length > 0 && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="text-base font-bold">Recently decided</h3>
          <ul className="mt-2 divide-y text-sm">
            {recent.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="truncate font-medium">{p.name}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
                    p.status === 'approved'
                      ? 'bg-success/15 text-success'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
