import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
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
import { decodeInviteHash } from '@/config/runtimeConfig'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
})

type Form = z.infer<typeof schema>

function parseInviteFromUrl(): { ready: boolean; inviteError: string | null } {
  if (typeof window === 'undefined') {
    return {
      ready: false,
      inviteError: 'Open this page in your browser using the invite link.',
    }
  }
  const raw = window.location.hash.replace(/^#/, '').trim()
  if (!raw) {
    return {
      ready: false,
      inviteError:
        'This page needs an invite link from your organization. Ask your coordinator to share the volunteer link.',
    }
  }
  const payload = decodeInviteHash(raw)
  if (!payload) {
    return { ready: false, inviteError: 'This invite link is invalid or expired.' }
  }
  useRuntimeConfigStore.getState().applyInvitePayload(payload)
  return { ready: true, inviteError: null }
}

export function JoinPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [{ ready, inviteError }] = useState(parseInviteFromUrl)

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const s = useRuntimeConfigStore.getState()
    const url = s.supabaseUrl
    const key = s.supabaseAnonKey
    const orgId = s.organizationId
    const token = s.inviteToken
    if (!url || !key || !orgId || !token) {
      toast.error('Invite data missing — open the link again.')
      return
    }
    try {
      const supabase = requireSupabaseClient(url, key)
      const { data, error } = await supabase.rpc('join_volunteer', {
        p_invite_token: token,
        p_organization_id: orgId,
        p_first_name: values.firstName.trim(),
        p_last_name: values.lastName.trim(),
        p_email: values.email.trim().toLowerCase(),
      })
      if (error) {
        toast.error(error.message)
        return
      }
      const volunteerId = data as string
      useRuntimeConfigStore.getState().patch({ volunteerId })
      void queryClient.invalidateQueries()
      toast.success('Welcome — you are signed in as a volunteer.')
      void navigate('/volunteer', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Join <AppName />
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your name and email. You’ll appear as First L. to your team.
        </p>
      </div>

      {inviteError && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Can’t use this link</CardTitle>
            <CardDescription>{inviteError}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link to={APP_CONFIG.setupRoute}>Organization setup</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {ready && !inviteError && (
        <Card>
          <CardHeader>
            <CardTitle>Volunteer signup</CardTitle>
            <CardDescription>
              No password — your device remembers this profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" autoComplete="given-name" {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" autoComplete="family-name" {...form.register('lastName')} />
              {form.formState.errors.lastName && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
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
          </CardContent>
          <CardFooter>
            <Button type="button" className="w-full" onClick={() => void onSubmit()}>
              Continue to field app
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
