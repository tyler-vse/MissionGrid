import type { ActivityStatus } from '@/domain/models/activityStatus'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const labels: Record<ActivityStatus, string> = {
  available: 'Open',
  claimed: 'Claimed',
  completed: 'Done',
  skipped: 'Skipped',
  pending_review: 'Review',
}

const variantFor: Record<ActivityStatus, NonNullable<BadgeProps['variant']>> = {
  available: 'default',
  claimed: 'info',
  completed: 'success',
  skipped: 'muted',
  pending_review: 'warning',
}

export function StatusBadge({
  status,
  className,
}: {
  status: ActivityStatus
  className?: string
}) {
  return (
    <Badge variant={variantFor[status]} className={cn(className)}>
      {labels[status]}
    </Badge>
  )
}
