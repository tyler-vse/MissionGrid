import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type * as React from 'react'
import { cn } from '@/lib/utils'

type Tone = 'info' | 'success' | 'warning' | 'destructive'

const icons: Record<Tone, React.ComponentType<{ className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
}

const styles: Record<Tone, string> = {
  info: 'bg-info/10 text-info border-info/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive:
    'bg-destructive/10 text-destructive border-destructive/20',
}

export interface InlineAlertProps {
  tone?: Tone
  title?: string
  children?: React.ReactNode
  className?: string
  icon?: boolean
}

export function InlineAlert({
  tone = 'info',
  title,
  children,
  className,
  icon = true,
}: InlineAlertProps) {
  const Icon = icons[tone]
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
        styles[tone],
        className,
      )}
    >
      {icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold leading-tight">{title}</p>}
        {children && (
          <div className={cn(title && 'mt-0.5', 'leading-snug')}>
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
