import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AppName } from '@/components/branding/AppName'
import { BrandLockup } from '@/components/branding/BrandLockup'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_CONFIG } from '@/config/app.config'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

const schema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
})

type Form = z.infer<typeof schema>

export function AdminLoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const supabaseUrl = useRuntimeConfigStore((s) => s.supabaseUrl)
  const supabaseAnonKey = useRuntimeConfigStore((s) => s.supabaseAnonKey)
  const [busy, setBusy] = useState(false)
  const connected = Boolean(supabaseUrl && supabaseAnonKey)
  const [checkingSession, setCheckingSession] = useState(connected)

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (!connected) return
    let cancelled = false
    void (async () => {
      try {
        const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
        const { data } = await supabase.auth.getSession()
        if (!cancelled && data.session) {
          navigate('/admin', { replace: true })
          return
        }
      } catch {
        /* ignore and show the form */
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [connected, navigate, supabaseAnonKey, supabaseUrl])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!connected) {
      toast.error(
        'This device isn\u2019t connected yet. Open your admin bookmark link first.',
      )
      return
    }
    setBusy(true)
    try {
      const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      void queryClient.invalidateQueries()
      toast.success('Signed in')
      navigate('/admin', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 space-y-3 text-center">
        <BrandLockup size="md" className="mb-3" />
        <h1 className="text-2xl font-bold tracking-tight">
          Admin sign in — <AppName />
        </h1>
        <p className="text-sm text-muted-foreground">
          Bookmark this page to come back on this device.
        </p>
      </div>

      {!connected ? (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-base">
              This device isn&apos;t connected yet
            </CardTitle>
            <CardDescription>
              Open your admin bookmark link first. You saved it at the end of
              the setup wizard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              If you don&apos;t have the link, run setup from scratch or ask a
              fellow admin to share theirs.
            </p>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to={APP_CONFIG.setupRoute}>Run setup</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/volunteer">Go to volunteer home</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : checkingSession ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">One moment…</CardTitle>
            <CardDescription>
              Checking whether you&apos;re already signed in.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use the email and password you set during setup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="adminLoginEmail">Email</Label>
              <Input
                id="adminLoginEmail"
                type="email"
                autoComplete="email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="adminLoginPassword">Password</Label>
              <Input
                id="adminLoginPassword"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              type="button"
              className="w-full"
              disabled={busy}
              onClick={() => void onSubmit()}
            >
              {busy ? 'Signing in\u2026' : 'Sign in'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Forgot your password? Reset it from your Supabase dashboard under
              Authentication &rarr; Users.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
