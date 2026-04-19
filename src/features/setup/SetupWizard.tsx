import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { APP_CONFIG } from '@/config/app.config'
import {
  encodeInviteHash,
  testGoogleMapsKey,
  testSupabaseConnection,
} from '@/config/runtimeConfig'
import { completeSupabaseOrgSetup } from '@/features/setup/completeSupabaseSetup'
import { WIZARD_STEP_LABELS } from '@/features/setup/steps/constants'
import {
  parseLocationCsv,
  parseLocationCsvPreview,
  previewRowsToImportable,
} from '@/lib/csv'
import { geocodeBatch } from '@/lib/geocodeBatch'
import { useMockBackendStore } from '@/store/mockBackendStore'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

const wizardSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationSlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens'),
  supabaseUrl: z.string().optional(),
  supabaseAnonKey: z.string().optional(),
  adminEmail: z.string().optional(),
  adminPassword: z.string().optional(),
  googleMapsApiKey: z.string().optional(),
  serviceAreaName: z.string().min(2),
  centerLat: z.number().finite(),
  centerLng: z.number().finite(),
  radiusMeters: z.number().int().positive().max(50_000),
  csvText: z.string().optional(),
})

type WizardForm = z.infer<typeof wizardSchema>

export function SetupWizard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'choose' | 'mock' | 'supabase'>('choose')
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null)
  const [googleOk, setGoogleOk] = useState<boolean | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const configured = useMockBackendStore((s) => s.appConfiguration?.isConfigured)
  const runtimePatch = useRuntimeConfigStore((s) => s.patch)

  const form = useForm<WizardForm>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      organizationName: 'Sample Street Team',
      organizationSlug: 'sample-street-team',
      supabaseUrl: '',
      supabaseAnonKey: '',
      adminEmail: '',
      adminPassword: '',
      googleMapsApiKey: '',
      serviceAreaName: 'Downtown coverage',
      centerLat: 39.7392,
      centerLng: -104.9903,
      radiusMeters: 2500,
      csvText: '',
    },
  })

  const loadDemo = () => {
    useMockBackendStore.getState().loadDemo()
    void queryClient.invalidateQueries()
    toast.success('Demo organization loaded')
    void navigate('/volunteer', { replace: true })
  }

  const finishMock = (values: WizardForm) => {
    const parsed = values.csvText?.trim()
      ? parseLocationCsv(values.csvText)
      : { rows: [], errors: [] as string[] }

    if (values.csvText?.trim() && parsed.errors.length) {
      toast.error(parsed.errors[0] ?? 'CSV has errors')
      return
    }
    if (values.csvText?.trim() && parsed.rows.length === 0) {
      toast.error('No valid rows found in CSV')
      return
    }

    const rows =
      parsed.rows.length > 0
        ? parsed.rows.map((r) => ({
            name: r.name,
            address: r.address,
            lat: r.lat,
            lng: r.lng,
            category: r.category,
            city: r.city,
            state: r.state,
            postalCode: r.postalCode,
            notes: r.notes,
          }))
        : [
            {
              name: 'Community Center',
              address: '1200 Market St',
              lat: 39.7392,
              lng: -104.9903,
              category: 'community',
            },
            {
              name: 'Transit Plaza',
              address: '1210 Market St',
              lat: 39.741,
              lng: -104.988,
              category: 'public',
            },
          ]

    useMockBackendStore.getState().finishSetup({
      organizationName: values.organizationName,
      organizationSlug: values.organizationSlug,
      serviceAreaName: values.serviceAreaName,
      centerLat: values.centerLat,
      centerLng: values.centerLng,
      radiusMeters: values.radiusMeters,
      csvLocations: rows,
    })
    void queryClient.invalidateQueries()
    toast.success('Setup complete')
    void navigate('/volunteer', { replace: true })
  }

  const finishSupabase = async () => {
    const values = form.getValues()
    const url = values.supabaseUrl?.trim() ?? ''
    const key = values.supabaseAnonKey?.trim() ?? ''
    const email = values.adminEmail?.trim() ?? ''
    const password = values.adminPassword ?? ''
    if (!url || !key) {
      toast.error('Supabase URL and anon key are required')
      return
    }
    if (!email || password.length < 8) {
      toast.error('Admin email and password (8+ chars) are required')
      return
    }

    let importRows = previewRowsToImportable(
      parseLocationCsvPreview(values.csvText ?? '').rows,
      { includeDuplicates: false },
    )
    if (importRows.length === 0 && !(values.csvText ?? '').trim()) {
      importRows = [
        {
          name: 'Community Center',
          address: '1200 Market St',
          lat: 39.7392,
          lng: -104.9903,
          category: 'community',
        },
        {
          name: 'Transit Plaza',
          address: '1210 Market St',
          lat: 39.741,
          lng: -104.988,
          category: 'public',
        },
      ]
    }

    const preview = parseLocationCsvPreview(values.csvText ?? '').rows
    const needsGeo = preview.filter(
      (r) =>
        r.data &&
        (r.data.lat === undefined || r.data.lng === undefined) &&
        !r.issues.some((i) => i.severity === 'error'),
    )
    if (needsGeo.length > 0) {
      toast.message('Geocoding rows without coordinates…')
      const { createGoogleGeocoder } = await import(
        '@/providers/geocoding/googleGeocoder'
      )
      const gkey = values.googleMapsApiKey?.trim()
      if (!gkey) {
        toast.error('Add a Google Maps API key on step 4 to geocode, or lat/lng in CSV.')
        return
      }
      const geo = createGoogleGeocoder(gkey)
      const items = preview
        .map((r, index) => ({ r, index }))
        .filter(
          ({ r }) =>
            r.data &&
            (r.data.lat === undefined || r.data.lng === undefined) &&
            !r.issues.some((i) => i.severity === 'error'),
        )
        .map(({ r, index }) => ({
          index,
          query: [r.data!.address, r.data!.city, r.data!.state, r.data!.postalCode]
            .filter(Boolean)
            .join(', '),
        }))
        .filter((x) => x.query.length > 3)
      const results = await geocodeBatch(geo, items, { delayMs: 150 })
      const idxToCoord = new Map<number, { lat: number; lng: number }>()
      for (const res of results) {
        if (res.ok) idxToCoord.set(res.index, { lat: res.lat, lng: res.lng })
      }
      importRows = preview
        .map((r, i) => {
          if (!r.data) return null
          const c = idxToCoord.get(i)
          const lat = r.data.lat ?? c?.lat
          const lng = r.data.lng ?? c?.lng
          if (lat === undefined || lng === undefined) return null
          if (r.issues.some((x) => x.severity === 'error')) return null
          if (r.isDuplicate) return null
          return {
            ...r.data,
            lat,
            lng,
          }
        })
        .filter(Boolean) as typeof importRows
    }

    if (importRows.length === 0) {
      toast.error('No importable rows (check CSV and coordinates).')
      return
    }

    setBusy(true)
    try {
      const result = await completeSupabaseOrgSetup({
        supabaseUrl: url,
        supabaseAnonKey: key,
        orgName: values.organizationName,
        orgSlug: values.organizationSlug,
        adminEmail: email,
        adminPassword: password,
        serviceAreaName: values.serviceAreaName,
        centerLat: values.centerLat,
        centerLng: values.centerLng,
        radiusMeters: values.radiusMeters,
        csvRows: importRows,
      })
      const origin = window.location.origin
      const hash = encodeInviteHash({
        v: 1,
        supabaseUrl: url,
        supabaseAnonKey: key,
        organizationId: result.organizationId,
        inviteToken: result.inviteToken,
        googleMapsApiKey: values.googleMapsApiKey?.trim() || undefined,
      })
      const link = `${origin}${APP_CONFIG.inviteRoute}#${hash}`
      setInviteUrl(link)
      runtimePatch({
        supabaseUrl: url,
        supabaseAnonKey: key,
        googleMapsApiKey: values.googleMapsApiKey?.trim() ?? '',
        organizationId: result.organizationId,
        volunteerId: result.volunteerId,
        inviteToken: result.inviteToken,
      })
      void queryClient.invalidateQueries()
      toast.success('Cloud setup complete — copy the invite link for volunteers.')
      setStep(6)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const next = () => {
    if (mode === 'mock') {
      if (step === 0) setStep(4)
      else if (step === 4) setStep(5)
      return
    }
    if (mode === 'supabase') {
      if (step < 6) setStep((s) => s + 1)
    }
  }

  const back = () => {
    if (mode === 'mock') {
      if (step === 5) setStep(4)
      else if (step === 4) setStep(0)
      else if (step === 0) setMode('choose')
      return
    }
    if (mode === 'supabase') {
      if (step > 0) setStep((s) => s - 1)
      else setMode('choose')
    }
  }

  const stepTitle = useMemo(() => {
    if (mode === 'choose') return 'Choose setup'
    if (mode === 'mock') {
      if (step === 0) return WIZARD_STEP_LABELS[0]
      if (step === 4) return WIZARD_STEP_LABELS[4]
      if (step === 5) return WIZARD_STEP_LABELS[5]
      return WIZARD_STEP_LABELS[6]
    }
    return WIZARD_STEP_LABELS[step] ?? 'Setup'
  }, [mode, step])

  if (mode === 'choose') {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Set up <AppName />
          </h1>
          <p className="text-sm text-muted-foreground">{APP_CONFIG.description}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>How do you want to run the app?</CardTitle>
            <CardDescription>
              Try instantly on this device, or connect your nonprofit&apos;s Supabase project.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button type="button" onClick={loadDemo}>
              Try sample data (this device only)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMode('mock')
                setStep(0)
              }}
            >
              Guided setup — offline mock
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMode('supabase')
                setStep(0)
              }}
            >
              Guided setup — Supabase + invite link
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Set up <AppName />
        </h1>
        <p className="text-sm text-muted-foreground">{APP_CONFIG.description}</p>
        {configured && (
          <p className="text-xs text-accent">
            This device already has mock data. Supabase keys live in browser storage.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{stepTitle}</CardTitle>
          <CardDescription>
            {mode === 'supabase' ? `Step ${step + 1} of 7` : 'Mock setup — a few quick steps'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'mock' && step === 0 && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="organizationName">Organization name</Label>
                <Input id="organizationName" {...form.register('organizationName')} />
                {form.formState.errors.organizationName && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.organizationName.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="organizationSlug">URL slug</Label>
                <Input id="organizationSlug" {...form.register('organizationSlug')} />
                {form.formState.errors.organizationSlug && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.organizationSlug.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {mode === 'supabase' && step === 0 && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="organizationName">Organization name</Label>
                <Input id="organizationName" {...form.register('organizationName')} />
              </div>
              <div>
                <Label htmlFor="organizationSlug">URL slug</Label>
                <Input id="organizationSlug" {...form.register('organizationSlug')} />
              </div>
            </div>
          )}

          {mode === 'supabase' && step === 1 && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="sbUrl">Supabase project URL</Label>
                <Input id="sbUrl" {...form.register('supabaseUrl')} placeholder="https://xxx.supabase.co" />
              </div>
              <div>
                <Label htmlFor="sbKey">Supabase anon public key</Label>
                <Input id="sbKey" {...form.register('supabaseAnonKey')} type="password" autoComplete="off" />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const u = form.getValues('supabaseUrl')?.trim() ?? ''
                  const k = form.getValues('supabaseAnonKey')?.trim() ?? ''
                  const r = await testSupabaseConnection(u, k)
                  setSupabaseOk(r.ok)
                  toast[r.ok ? 'success' : 'error'](
                    r.ok ? 'Connection OK' : r.message,
                  )
                }}
              >
                Test Supabase connection
              </Button>
              {supabaseOk === false && (
                <p className="text-xs text-muted-foreground">
                  Run <code className="rounded bg-muted px-1">docs/supabase/schema.sql</code> in the SQL editor if tables are missing.
                </p>
              )}
            </div>
          )}

          {mode === 'supabase' && step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Creates the first admin volunteer in your Supabase project (email/password auth).
              </p>
              <div>
                <Label htmlFor="adminEmail">Admin email</Label>
                <Input id="adminEmail" type="email" {...form.register('adminEmail')} />
              </div>
              <div>
                <Label htmlFor="adminPassword">Password (8+ characters)</Label>
                <Input id="adminPassword" type="password" {...form.register('adminPassword')} />
              </div>
            </div>
          )}

          {mode === 'supabase' && step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Optional. Needed for map view, Places search, and CSV geocoding.
              </p>
              <div>
                <Label htmlFor="gkey">Google Maps JavaScript API key</Label>
                <Input id="gkey" type="password" {...form.register('googleMapsApiKey')} autoComplete="off" />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const k = form.getValues('googleMapsApiKey')?.trim() ?? ''
                  const r = await testGoogleMapsKey(k)
                  setGoogleOk(r.ok)
                  toast[r.ok ? 'success' : 'error'](r.ok ? 'Maps key OK' : r.message)
                }}
              >
                Test Google key
              </Button>
              {googleOk === false && (
                <p className="text-xs text-muted-foreground">
                  Enable Maps JavaScript API + Places + Geocoding in Google Cloud.
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="serviceAreaName">Service area name</Label>
                <Input id="serviceAreaName" {...form.register('serviceAreaName')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="centerLat">Center latitude</Label>
                  <Input
                    id="centerLat"
                    type="number"
                    step="any"
                    {...form.register('centerLat', { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="centerLng">Center longitude</Label>
                  <Input
                    id="centerLng"
                    type="number"
                    step="any"
                    {...form.register('centerLng', { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="radiusMeters">Radius (meters)</Label>
                <Input
                  id="radiusMeters"
                  type="number"
                  {...form.register('radiusMeters', { valueAsNumber: true })}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-2">
              <Label htmlFor="csvText">Paste CSV</Label>
              <p className="text-xs text-muted-foreground">
                Headers: name, address, lat, lng — optional city, state, postal_code, category, notes.
              </p>
              <Textarea
                id="csvText"
                rows={8}
                placeholder={`name,address,lat,lng,category\nCommunity Center,"1200 Market St",39.7392,-104.9903,community`}
                {...form.register('csvText')}
              />
            </div>
          )}

          {mode === 'supabase' && step === 6 && inviteUrl && (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">Volunteer invite link</p>
              <p className="break-all rounded border bg-muted p-2 font-mono text-xs">{inviteUrl}</p>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl)
                  toast.success('Copied invite link')
                }}
              >
                Copy link
              </Button>
              <p className="text-xs text-muted-foreground">
                Share this link anywhere. Volunteers enter name + email; no password.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={loadDemo}>
            Try sample data
          </Button>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" variant="ghost" onClick={() => setMode('choose')}>
              Back to modes
            </Button>
            {(mode === 'mock' ? step > 0 : step > 0) && (
              <Button type="button" variant="secondary" onClick={back}>
                Back
              </Button>
            )}
            {mode === 'mock' && step === 5 ? (
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                onClick={() => void form.handleSubmit(finishMock)()}
              >
                Finish setup
              </Button>
            ) : mode === 'supabase' && step === 5 ? (
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                disabled={busy}
                onClick={() => void finishSupabase()}
              >
                {busy ? 'Creating…' : 'Create cloud org'}
              </Button>
            ) : mode === 'supabase' && step === 6 ? (
              <Button type="button" className="flex-1 sm:flex-none" asChild>
                <Link to="/volunteer">Go to volunteer home</Link>
              </Button>
            ) : (
              <Button type="button" className="flex-1 sm:flex-none" onClick={next}>
                Next
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already configured?{' '}
        <Link className="text-primary underline-offset-4 hover:underline" to="/volunteer">
          Go to volunteer home
        </Link>
      </p>
    </div>
  )
}
