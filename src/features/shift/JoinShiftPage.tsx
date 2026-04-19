import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { QrCode } from 'lucide-react'
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
import { decodePartyHash } from '@/config/runtimeConfig'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'
import { useShiftStore } from '@/store/shiftStore'
import type { TimeWindowMinutes } from '@/config/app.config'

const schema = z.object({
  displayName: z.string().trim().min(1, 'Your first name is required'),
})

type Form = z.infer<typeof schema>

interface ParseResult {
  shiftId: string | null
  token: string | null
  error: string | null
}

function parsePartyHash(): ParseResult {
  if (typeof window === 'undefined') {
    return {
      shiftId: null,
      token: null,
      error: 'Open this link in your browser.',
    }
  }
  const raw = window.location.hash.replace(/^#/, '').trim()
  if (!raw) {
    return {
      shiftId: null,
      token: null,
      error:
        'This page needs a party link from the shift leader. Ask them to share the QR code.',
    }
  }
  const payload = decodePartyHash(raw)
  if (!payload) {
    return {
      shiftId: null,
      token: null,
      error: 'This party link is invalid or expired.',
    }
  }
  // Apply org context so the Supabase client can talk to the same project.
  useRuntimeConfigStore.setState((s) => ({
    ...s,
    supabaseUrl: payload.supabaseUrl,
    supabaseAnonKey: payload.supabaseAnonKey,
    organizationId: payload.organizationId,
    googleMapsApiKey: payload.googleMapsApiKey ?? s.googleMapsApiKey,
  }))
  return {
    shiftId: payload.shiftId,
    token: payload.partyToken,
    error: null,
  }
}

export function JoinShiftPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [parsed] = useState(parsePartyHash)
  const [busy, setBusy] = useState(false)
  const startLocalShift = useShiftStore((s) => s.startShift)
  const setPartyMember = useShiftStore((s) => s.setPartyMember)

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '' },
  })

  useEffect(() => {
    if (parsed.error) {
      form.setFocus('displayName')
    }
  }, [parsed.error, form])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!parsed.shiftId || !parsed.token) return
    const s = useRuntimeConfigStore.getState()
    const url = s.supabaseUrl
    const key = s.supabaseAnonKey
    if (!url || !key) {
      toast.error('Missing org context — ask the leader to re-share the QR.')
      return
    }
    setBusy(true)
    try {
      const supabase = requireSupabaseClient(url, key)
      const { data: memberRow, error } = await supabase.rpc(
        'join_shift_party',
        {
          p_shift_id: parsed.shiftId,
          p_token: parsed.token,
          p_display_name: values.displayName,
        },
      )
      if (error) {
        toast.error(error.message)
        return
      }
      const memberId = (memberRow as { id?: string } | null)?.id ?? null

      // Fetch the shift so we know minutes + origin + campaign
      const { data: shiftRow } = await supabase
        .from('shifts')
        .select('*')
        .eq('id', parsed.shiftId)
        .maybeSingle()

      const minutes = (shiftRow?.time_window_minutes ?? 30) as TimeWindowMinutes
      const origin =
        shiftRow?.origin_lat != null && shiftRow?.origin_lng != null
          ? {
              lat: shiftRow.origin_lat as number,
              lng: shiftRow.origin_lng as number,
              label: 'Party leader',
            }
          : null

      startLocalShift({
        minutes,
        origin,
        shiftId: parsed.shiftId,
        campaignId: (shiftRow?.campaign_id as string | null) ?? null,
        partySize: (shiftRow?.party_size as number | null) ?? 1,
        partyMemberId: memberId,
      })
      setPartyMember(memberId)

      void queryClient.invalidateQueries()
      toast.success(`You\u2019re in — welcome to the party, ${values.displayName}!`)
      void navigate('/shift', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 space-y-3 text-center">
        <BrandLockup size="lg" className="mb-3" />
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight">
          <QrCode className="h-6 w-6 text-primary" aria-hidden />
          Join the shift
        </h1>
        <p className="text-sm text-muted-foreground">
          You&apos;ll be added to the active <AppName /> shift — no sign-up,
          just your first name.
        </p>
      </div>

      {parsed.error && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t use this link</CardTitle>
            <CardDescription>{parsed.error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {!parsed.error && (
        <Card>
          <CardHeader>
            <CardTitle>Tell your team who you are</CardTitle>
            <CardDescription>
              Your name shows up in the shift members list so the leader knows
              who joined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="displayName">First name</Label>
              <Input
                id="displayName"
                autoFocus
                autoComplete="given-name"
                {...form.register('displayName')}
              />
              {form.formState.errors.displayName && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.displayName.message}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full"
              disabled={busy}
              onClick={() => void onSubmit()}
            >
              {busy ? 'Joining\u2026' : 'Join the shift'}
            </Button>
            <Button variant="ghost" asChild className="w-full">
              <Link to={APP_CONFIG.inviteRoute}>
                Become a full volunteer instead
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
