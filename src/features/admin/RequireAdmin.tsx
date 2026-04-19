import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { APP_CONFIG } from '@/config/app.config'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

type GuardStatus = 'checking' | 'allowed' | 'unauthenticated' | 'not-admin'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const supabaseUrl = useRuntimeConfigStore((s) => s.supabaseUrl)
  const supabaseAnonKey = useRuntimeConfigStore((s) => s.supabaseAnonKey)
  const connected = Boolean(supabaseUrl && supabaseAnonKey)
  const [status, setStatus] = useState<GuardStatus>(
    connected ? 'checking' : 'unauthenticated',
  )

  useEffect(() => {
    if (!connected) return
    let cancelled = false
    void (async () => {
      try {
        const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
        const { data: sessionData } = await supabase.auth.getSession()
        if (cancelled) return
        if (!sessionData.session) {
          setStatus('unauthenticated')
          return
        }

        const { data, error } = await supabase.rpc('current_admin_org')
        if (cancelled) return
        if (error) {
          if (isMissingFunctionError(error)) {
            console.warn(
              'current_admin_org RPC missing — re-run docs/supabase/schema.sql. Falling back to session-only check.',
            )
            setStatus('allowed')
            return
          }
          toast.error(`Admin check failed: ${error.message}`)
          setStatus('not-admin')
          return
        }
        if (!data) {
          toast.error('Your account is not an admin for this organization.')
          await supabase.auth.signOut().catch(() => {})
          setStatus('not-admin')
          return
        }
        setStatus('allowed')
      } catch (e) {
        if (cancelled) return
        toast.error(e instanceof Error ? e.message : String(e))
        setStatus('unauthenticated')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connected, supabaseAnonKey, supabaseUrl])

  if (status === 'checking') {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Checking admin access&hellip;</CardTitle>
            <CardDescription>One moment while we verify your session.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (status === 'unauthenticated' || status === 'not-admin') {
    return <Navigate to={APP_CONFIG.adminLoginRoute} replace />
  }

  return <>{children}</>
}

function isMissingFunctionError(error: { code?: string; message?: string }): boolean {
  const msg = error.message ?? ''
  return (
    error.code === 'PGRST202' ||
    /could not find the function/i.test(msg) ||
    /function .* does not exist/i.test(msg)
  )
}
