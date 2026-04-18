import { APP_CONFIG } from '@/config/app.config'
import { cn } from '@/lib/utils'

export function AppName({ className }: { className?: string }) {
  return (
    <span className={cn('font-semibold tracking-tight', className)}>
      {APP_CONFIG.name}
    </span>
  )
}
