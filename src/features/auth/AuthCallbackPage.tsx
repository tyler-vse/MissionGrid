import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppName } from '@/components/branding/AppName'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { APP_CONFIG } from '@/config/app.config'
import {
  decodeOrgRef,
  type OrgRefPayloadV1,
} from '@/config/runtimeConfig'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

type CallbackStatus =
  | 'working'
  | 'need_config'
  | 'no_session'
  | 'no_volunteer'
  | 'error'

function readOrgRefFromUrl(): OrgRefPayloadV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const url = new URL(window.location.href)
    const sb = url.searchParams.get('sb')
    if (!sb) return null
    return decodeOrgRef(sb)
  } catch {
    return null
  }
}

function computeInitialStatus(): CallbackStatus {
  const ref = readOrgRefFromUrl()
  const stored = useRuntimeConfigStore.getState()
  const url = ref?.supabaseUrl || stored.supabaseUrl
  const key = ref?.supabaseAnonKey || stored.supabaseAnonKey
  const orgId = ref?.organizationId || stored.organizationId
  if (!url || !key || !orgId) return 'need_config'
  return 'working'
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<CallbackStatus>(computeInitialStatus)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'working') return
    let cancelled = false

    const ref = readOrgRefFromUrl()
    const stored = useRuntimeConfigStore.getState()
    if (ref) {
      stored.patch({
        supabaseUrl: ref.supabaseUrl,
        supabaseAnonKey: ref.supabaseAnonKey,
        organizationId: ref.organizationId,
        googleMapsApiKey: ref.googleMapsApiKey ?? '',
      })
    }

    const effectiveUrl = ref?.supabaseUrl || stored.supabaseUrl
    const effectiveKey = ref?.supabaseAnonKey || stored.supabaseAnonKey
    const effectiveOrgId = ref?.organizationId || stored.organizationId

    void (async () => {
      try {
        const supabase = requireSupabaseClient(effectiveUrl, effectiveKey)

        let session = (await supabase.auth.getSession()).data.session
        if (!session) {
          session = await new Promise((resolve) => {
            let sub: { data: { subscription: { unsubscribe: () => void } } } | null = null
            const timer = setTimeout(() => {
              sub?.data.subscription.unsubscribe()
              resolve(null)
            }, 4000)
            sub = supabase.auth.onAuthStateChange((_event, s) => {
              if (s) {
                clearTimeout(timer)
                sub?.data.subscription.unsubscribe()
                resolve(s)
              }
            })
          })
        }

        if (cancelled) return
        if (!session) {
          setStatus('no_session')
          return
        }

        const { data: volunteerId, error } = await supabase.rpc(
          'link_volunteer_to_auth',
          { p_organization_id: effectiveOrgId },
        )
        if (cancelled) return
        if (error) {
          if (/no_volunteer_for_email/i.test(error.message)) {
            setStatus('no_volunteer')
            setMessage(
              'This email isn\u2019t a volunteer on the linked organization. Ask your coordinator to share the invite link so you can join.',
            )
            return
          }
          if (/could not find the function/i.test(error.message)) {
            setStatus('error')
            setMessage(
              'Server is missing link_volunteer_to_auth. Re-run docs/supabase/schema.sql in Supabase.',
            )
            return
          }
          setStatus('error')
          setMessage(error.message)
          return
        }

        if (!volunteerId || typeof volunteerId !== 'string') {
          setStatus('no_volunteer')
          return
        }

        useRuntimeConfigStore.getState().patch({ volunteerId })

        let isAdminOrg: string | null = null
        try {
          const adminCheck = await supabase.rpc('current_admin_org')
          isAdminOrg = (adminCheck.data as string | null) ?? null
        } catch {
          isAdminOrg = null
        }

        queryClient.clear()
        toast.success('Signed in')

        if (isAdminOrg) {
          navigate('/admin', { replace: true })
        } else {
          navigate('/volunteer', { replace: true })
        }
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setMessage(e instanceof Error ? e.message : String(e))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [navigate, queryClient, status])

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back to <AppName />
        </h1>
      </div>

      {status === 'working' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signing you in&hellip;</CardTitle>
            <CardDescription>
              Verifying your magic link and restoring your profile.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {status === 'need_config' && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-base">
              This device isn&apos;t connected yet
            </CardTitle>
            <CardDescription>
              Open your invite link or admin bookmark link first, then click
              the email link again.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={APP_CONFIG.loginRoute}>Go to sign in</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to={APP_CONFIG.setupRoute}>Run setup</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {status === 'no_session' && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">
              Sign-in link didn&apos;t work
            </CardTitle>
            <CardDescription>
              The magic link may have expired. Request a new one from the sign-in page.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link to={APP_CONFIG.loginRoute}>Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {status === 'no_volunteer' && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">
              We couldn&apos;t find your volunteer record
            </CardTitle>
            <CardDescription>
              {message ??
                'This email is not registered with the organization. Ask your coordinator for the invite link.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={APP_CONFIG.loginRoute}>Try another email</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {status === 'error' && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Something went wrong</CardTitle>
            <CardDescription>
              {message ?? 'Unknown error while completing sign-in.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <p>
              Try opening the email link again. If this keeps happening, ask
              your admin to re-run <span className="font-mono">docs/supabase/schema.sql</span>.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link to={APP_CONFIG.loginRoute}>Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
