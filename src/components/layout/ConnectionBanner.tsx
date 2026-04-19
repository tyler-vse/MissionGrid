import { onlineManager } from '@tanstack/react-query'
import { CloudOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

type Status = 'online' | 'offline' | 'reconnecting'

export function ConnectionBanner() {
  const [status, setStatus] = useState<Status>(() =>
    typeof navigator !== 'undefined' && navigator.onLine
      ? 'online'
      : 'offline',
  )

  useEffect(() => {
    const handleOnline = () => {
      setStatus('reconnecting')
      window.setTimeout(() => setStatus('online'), 1200)
    }
    const handleOffline = () => setStatus('offline')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    const unsub = onlineManager.subscribe((online) => {
      if (!online) setStatus('offline')
    })
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsub()
    }
  }, [])

  if (status === 'online') return null

  const isOffline = status === 'offline'
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold',
        isOffline
          ? 'bg-warning text-warning-foreground'
          : 'bg-success text-success-foreground',
      )}
    >
      {isOffline ? (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          Offline — changes will sync when you reconnect
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Reconnecting…
        </>
      )}
    </div>
  )
}
