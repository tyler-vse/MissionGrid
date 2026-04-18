import { APP_CONFIG } from '@/config/app.config'
import { cn } from '@/lib/utils'

/** Simple wordmark-style mark; swap for an SVG asset when rebranding. */
export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm',
        className,
      )}
      aria-hidden
    >
      {APP_CONFIG.slug.slice(0, 2).toUpperCase()}
    </div>
  )
}
