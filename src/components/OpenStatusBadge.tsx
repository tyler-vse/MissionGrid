import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OpenHoursHint } from '@/domain/models/location'
import { formatHoursRange, getOpenStatus } from '@/lib/openHours'
import { cn } from '@/lib/utils'

export function OpenStatusBadge({
  hours,
  className,
  showRange = false,
}: {
  hours?: OpenHoursHint | null
  className?: string
  showRange?: boolean
}) {
  if (!hours) return null
  const status = getOpenStatus(hours)
  if (status === 'unknown') return null
  const range = showRange ? formatHoursRange(hours) : null

  return (
    <Badge
      variant={status === 'open' ? 'success' : 'muted'}
      className={cn('gap-1', className)}
    >
      <Clock className="h-3 w-3" aria-hidden />
      {status === 'open' ? 'Open' : 'Closed'}
      {range && <span className="ml-1 font-medium opacity-80">{range}</span>}
    </Badge>
  )
}
