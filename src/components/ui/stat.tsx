import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatProps {
  label: string
  value: string | number
  icon?: LucideIcon
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'info' | 'muted'
  className?: string
}

const toneStyles: Record<NonNullable<StatProps['tone']>, string> = {
  default: 'bg-card text-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
}

export function Stat({
  label,
  value,
  icon: Icon,
  tone = 'default',
  className,
}: StatProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start justify-between rounded-xl border p-3 shadow-sm',
        toneStyles[tone],
        className,
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide opacity-80">
          {label}
        </span>
        {Icon && <Icon className="h-4 w-4 opacity-70" aria-hidden />}
      </div>
      <span className="mt-2 text-2xl font-bold tabular-nums">{value}</span>
    </div>
  )
}
