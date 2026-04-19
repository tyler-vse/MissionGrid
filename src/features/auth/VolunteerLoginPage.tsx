import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { APP_CONFIG } from '@/config/app.config'
import { encodeOrgRef } from '@/config/runtimeConfig'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

const schema = z.object({
  email: z.string().email('Valid email is required'),
})

type Form = z.infer<typeof schema>

export function VolunteerLoginPage() {
  const supabaseUrl = useRuntimeConfigStore((s) => s.supabaseUrl)
  const supabaseAnonKey = useRuntimeConfigStore((s) => s.supabaseAnonKey)
  const organizationId = useRuntimeConfigStore((s) => s.organizationId)
  const googleMapsApiKey = useRuntimeConfigStore((s) => s.googleMapsApiKey)
  const connected = Boolean(supabaseUrl && supabaseAnonKey && organizationId)

  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    if (!connected) {
      toast.error(
        'This device isn\u2019t connected yet. Open your invite link first.',
      )
      return
    }
    setBusy(true)
    try {
      const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
      const orgRef = encodeOrgRef({
        v: 1,
        supabaseUrl,
        supabaseAnonKey,
        organizationId,
        googleMapsApiKey: googleMapsApiKey || undefined,
      })
      const redirectTo = `${window.location.origin}${APP_CONFIG.authCallbackRoute}?sb=${orgRef}`
      const email = values.email.trim().toLowerCase()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectTo,
        },
      })
      if (error) {
        toast.error(error.message)
        return
      }
      setSent(email)
      toast.success('Check your email for the sign-in link.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Volunteer sign in &mdash; <AppName />
        </h1>
        <p className="text-sm text-muted-foreground">
          No password. We&apos;ll email you a one-tap sign-in link.
        </p>
      </div>

      {!connected ? (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="text-base">
              Open your invite link first
            </CardTitle>
            <CardDescription>
              Your organization sent you a one-time link that connects this
              device. Tap that link, then come back here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Don&apos;t have the invite link? Ask your coordinator to resend
              it.
            </p>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/">Back home</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : sent ? (
        <Card className="border-emerald-500/50">
          <CardHeader>
            <CardTitle className="text-base">Check your email</CardTitle>
            <CardDescription>
              We sent a sign-in link to <span className="font-medium text-foreground">{sent}</span>. Tap it on any device to come back into MissionGrid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              The link expires after an hour. You can request another any time.
            </p>
            <p>
              Tip: save that email &mdash; opening it on a new phone or browser is all you&apos;ll need to return.
            </p>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSent(null)
                form.reset({ email: '' })
              }}
            >
              Use a different email
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sign in with email</CardTitle>
            <CardDescription>
              Enter the email you used when you joined. We&apos;ll send you a
              secure one-time sign-in link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="volunteerLoginEmail">Email</Label>
              <Input
                id="volunteerLoginEmail"
                type="email"
                autoComplete="email"
                inputMode="email"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.email.message}
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
              {busy ? 'Sending\u2026' : 'Email me a sign-in link'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Admins, use the <Link to={APP_CONFIG.adminLoginRoute} className="underline underline-offset-4">admin sign-in page</Link> with your password.
            </p>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
