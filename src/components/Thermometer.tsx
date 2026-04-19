import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface Milestone {
  at: number
  label: string
}

const MILESTONES: Milestone[] = [
  { at: 25, label: 'Great start' },
  { at: 50, label: 'Halfway there' },
  { at: 75, label: 'Home stretch' },
  { at: 100, label: 'Complete' },
]

function milestoneFor(pct: number): Milestone | null {
  let current: Milestone | null = null
  for (const m of MILESTONES) {
    if (pct >= m.at) current = m
  }
  return current
}

export interface ThermometerProps {
  value: number
  completed?: number
  total?: number
  size?: 'sm' | 'md' | 'lg'
  showMilestones?: boolean
  className?: string
  /** Aria label override */
  label?: string
}

export function Thermometer({
  value,
  completed,
  total,
  size = 'md',
  showMilestones = true,
  className,
  label,
}: ThermometerProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const reached = milestoneFor(pct)

  const [pulseKey, setPulseKey] = useState<number | null>(null)
  const prevMilestone = useRef<number | null>(reached?.at ?? null)
  useEffect(() => {
    const current = reached?.at ?? null
    if (current !== null && current !== prevMilestone.current) {
      setPulseKey(Date.now())
    }
    prevMilestone.current = current
  }, [reached?.at])

  const heights = {
    sm: 'h-2.5',
    md: 'h-4',
    lg: 'h-6',
  }
  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }
  const numberSize = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div>
          <div className={cn('font-bold tabular-nums text-foreground', numberSize[size])}>
            {pct}%
          </div>
          {total !== undefined && (
            <div className={cn('text-muted-foreground', textSize[size])}>
              <span className="font-semibold text-foreground tabular-nums">
                {completed ?? 0}
              </span>{' '}
              of{' '}
              <span className="font-semibold text-foreground tabular-nums">
                {total}
              </span>{' '}
              places done
            </div>
          )}
        </div>
        {reached && showMilestones && (
          <span
            key={pulseKey ?? 'static'}
            className={cn(
              'rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success',
              pulseKey && 'animate-pulse',
            )}
          >
            {reached.label}
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-label={label ?? 'Completion progress'}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-muted',
          heights[size],
        )}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {showMilestones &&
          MILESTONES.slice(0, -1).map((m) => (
            <div
              key={m.at}
              aria-hidden
              className="absolute top-0 bottom-0 w-px bg-background/60"
              style={{ left: `${m.at}%` }}
            />
          ))}
      </div>

      {showMilestones && size !== 'sm' && (
        <div className="mt-1 flex justify-between text-[10px] font-medium text-muted-foreground">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      )}
    </div>
  )
}
