import { Link } from 'react-router-dom'
import { APP_CONFIG } from '@/config/app.config'
import { isSupabaseConfigured } from '@/config/runtimeConfig'
import { useRegistry } from '@/providers/useRegistry'
import { useMockBackendStore } from '@/store/mockBackendStore'

export function ProviderStatusBanner() {
  const registry = useRegistry()
  const mockOrg = useMockBackendStore((s) => s.organization)
  const cfg = registry.effectiveConfig
  const supa = isSupabaseConfigured(cfg)

  let message: string
  if (supa) {
    message = `Backend: Supabase (${cfg.organizationId ? 'connected' : 'missing org id'})`
  } else if (mockOrg) {
    message = 'Backend: mock data on this device'
  } else {
    message = 'Backend: not configured'
  }

  return (
    <div className="border-b border-border/60 bg-muted/40 px-4 py-1.5 text-center text-[11px] text-muted-foreground">
      <span>{message}</span>
      {' · '}
      <Link
        to={APP_CONFIG.setupRoute}
        className="text-primary underline-offset-2 hover:underline"
      >
        Setup / reconnect
      </Link>
    </div>
  )
}
