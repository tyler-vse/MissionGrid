import type { ActivityStatus } from '@/domain/models/activityStatus'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const labels: Record<ActivityStatus, string> = {
  available: 'Available',
  claimed: 'Claimed',
  completed: 'Done',
  skipped: 'Skipped',
  pending_review: 'Review',
}

export function StatusBadge({
  status,
  className,
}: {
  status: ActivityStatus
  className?: string
}) {
  const variant =
    status === 'completed'
      ? 'success'
      : status === 'claimed'
        ? 'default'
        : status === 'skipped'
          ? 'muted'
          : status === 'pending_review'
            ? 'secondary'
            : 'outline'

  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {labels[status]}
    </Badge>
  )
}
