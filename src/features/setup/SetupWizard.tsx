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
  encodeAdminHash,
  encodeInviteHash,
  testGoogleMapsKey,
  testSupabaseConnection,
} from '@/config/runtimeConfig'
import { CenterPointPicker } from '@/features/setup/CenterPointPicker'
import { completeSupabaseOrgSetup } from '@/features/setup/completeSupabaseSetup'
import schemaSql from '../../../docs/supabase/schema.sql?raw'
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

function deriveSupabaseSqlEditorUrl(projectUrl: string): string {
  const fallback = 'https://supabase.com/dashboard'
  try {
    const u = new URL(projectUrl)
    const match = u.hostname.match(/^([a-z0-9-]+)\.supabase\.(co|in)$/i)
    const ref = match?.[1]
    if (!ref) return fallback
    return `https://supabase.com/dashboard/project/${ref}/sql/new`
  } catch {
    return fallback
  }
}

function deriveSupabaseUrlConfigUrl(projectUrl: string): string {
  const fallback = 'https://supabase.com/dashboard'
  try {
    const u = new URL(projectUrl)
    const match = u.hostname.match(/^([a-z0-9-]+)\.supabase\.(co|in)$/i)
    const ref = match?.[1]
    if (!ref) return fallback
    return `https://supabase.com/dashboard/project/${ref}/auth/url-configuration`
  } catch {
    return fallback
  }
}

function ExternalStepButton({
  href,
  children,
  size = 'sm',
  variant = 'outline',
}: {
  href: string
  children: React.ReactNode
  size?: 'sm' | 'default'
  variant?: 'outline' | 'secondary' | 'default'
}) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
    >
      {children}
    </Button>
  )
}

const CSV_TEMPLATE_CONTENT = `name,address,lat,lng,city,state,postal_code,category,notes
Community Center,"1200 Market St",39.7392,-104.9903,Denver,CO,80204,community,Open daily 8-6
Transit Plaza,"1210 Market St",39.741,-104.988,Denver,CO,80204,public,Wheelchair accessible
`

const CSV_SAMPLE_ROWS = `name,address,lat,lng,category
Community Center,"1200 Market St",39.7392,-104.9903,community
Transit Plaza,"1210 Market St",39.741,-104.988,public`

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'missiongrid-locations-template.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const RADIUS_PRESETS: Array<{ label: string; meters: number }> = [
  { label: '500 m', meters: 500 },
  { label: '1 km', meters: 1000 },
  { label: '2.5 km', meters: 2500 },
  { label: '5 km', meters: 5000 },
  { label: '10 km', meters: 10000 },
]

export function SetupWizard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'choose' | 'mock' | 'supabase'>('choose')
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null)
  const [supabaseFailReason, setSupabaseFailReason] = useState<
    'schema_missing' | 'auth' | 'network' | 'other' | null
  >(null)
  const [googleOk, setGoogleOk] = useState<boolean | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [adminUrl, setAdminUrl] = useState<string | null>(null)
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
      const adminHash = encodeAdminHash({
        v: 1,
        supabaseUrl: url,
        supabaseAnonKey: key,
        organizationId: result.organizationId,
        googleMapsApiKey: values.googleMapsApiKey?.trim() || undefined,
      })
      setAdminUrl(`${origin}${APP_CONFIG.adminConnectRoute}#${adminHash}`)
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
                <Input
                  id="sbUrl"
                  {...form.register('supabaseUrl', {
                    onChange: () => {
                      setSupabaseOk(null)
                      setSupabaseFailReason(null)
                    },
                  })}
                  placeholder="https://xxx.supabase.co"
                />
              </div>
              <div>
                <Label htmlFor="sbKey">Supabase anon public key</Label>
                <Input
                  id="sbKey"
                  type="password"
                  autoComplete="off"
                  {...form.register('supabaseAnonKey', {
                    onChange: () => {
                      setSupabaseOk(null)
                      setSupabaseFailReason(null)
                    },
                  })}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const u = form.getValues('supabaseUrl')?.trim() ?? ''
                  const k = form.getValues('supabaseAnonKey')?.trim() ?? ''
                  const r = await testSupabaseConnection(u, k)
                  setSupabaseOk(r.ok)
                  setSupabaseFailReason(r.ok ? null : r.reason)
                  toast[r.ok ? 'success' : 'error'](
                    r.ok ? 'Connection OK' : r.message,
                  )
                }}
              >
                Test Supabase connection
              </Button>

              {supabaseFailReason === 'schema_missing' && (
                <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      Supabase project is reachable, but MissionGrid tables are missing.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Run the schema SQL once in your project&apos;s SQL editor, then
                      re-test the connection.
                    </p>
                  </div>
                  <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
                    <li>Click <span className="font-medium text-foreground">Copy schema SQL</span>.</li>
                    <li>Click <span className="font-medium text-foreground">Open SQL Editor</span> (opens your Supabase dashboard).</li>
                    <li>Paste the SQL and press <span className="font-medium text-foreground">Run</span>.</li>
                    <li>Come back here and click <span className="font-medium text-foreground">Test Supabase connection</span> again.</li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(schemaSql)
                          toast.success('Schema SQL copied to clipboard')
                        } catch {
                          toast.error(
                            'Clipboard blocked — select and copy the SQL from docs/supabase/schema.sql manually.',
                          )
                        }
                      }}
                    >
                      Copy schema SQL
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const projectUrl = form.getValues('supabaseUrl')?.trim() ?? ''
                        const target = deriveSupabaseSqlEditorUrl(projectUrl)
                        window.open(target, '_blank', 'noopener,noreferrer')
                      }}
                    >
                      Open SQL Editor
                    </Button>
                  </div>
                </div>
              )}

              {supabaseOk === false && supabaseFailReason !== 'schema_missing' && (
                <p className="text-xs text-muted-foreground">
                  Double-check the project URL and anon public key from Supabase
                  Settings → API.
                </p>
              )}

              {supabaseOk !== true && (
                <p className="text-xs text-muted-foreground">
                  Pass the connection test to continue.
                </p>
              )}

              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium text-foreground">
                  Allow sign-in links to return here
                </p>
                <p className="text-xs text-muted-foreground">
                  In Supabase &rarr; Authentication &rarr; URL Configuration, add this site to the <span className="font-medium text-foreground">Site URL</span> and <span className="font-medium text-foreground">Redirect URLs</span> allowlist so admin and volunteer magic links can land back on this app:
                </p>
                <pre className="whitespace-pre-wrap break-all rounded border bg-background p-2 font-mono text-xs text-foreground">
{`${window.location.origin}
${window.location.origin}${APP_CONFIG.authCallbackRoute}`}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const text = `${window.location.origin}\n${window.location.origin}${APP_CONFIG.authCallbackRoute}`
                      try {
                        await navigator.clipboard.writeText(text)
                        toast.success('URLs copied')
                      } catch {
                        toast.error(
                          'Clipboard blocked \u2014 select the URLs above and copy manually.',
                        )
                      }
                    }}
                  >
                    Copy redirect URLs
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const projectUrl =
                        form.getValues('supabaseUrl')?.trim() ?? ''
                      const target = deriveSupabaseUrlConfigUrl(projectUrl)
                      window.open(target, '_blank', 'noopener,noreferrer')
                    }}
                  >
                    Open URL Configuration
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You only need to do this once per Supabase project. Without
                  it, magic-link emails can&apos;t send people back to
                  MissionGrid.
                </p>
              </div>
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
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Optional. Needed for the map view, Places search, and turning
                addresses into coordinates during CSV import. Follow the seven
                steps below in order — each button opens the exact Google Cloud
                page you need.
              </p>

              <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      1. Open Google Cloud Console
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sign in with the Google account that will own the billing for this app.
                    </p>
                    <ExternalStepButton href="https://console.cloud.google.com/">
                      Open Google Cloud Console
                    </ExternalStepButton>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      2. Create or pick a project
                    </p>
                    <p className="text-xs text-muted-foreground">
                      At the top of the page, click the project dropdown and
                      either create a new project (give it any name — e.g.
                      &ldquo;MissionGrid&rdquo;) or pick an existing one.
                    </p>
                    <ExternalStepButton href="https://console.cloud.google.com/projectselector2/home/dashboard">
                      Open project picker
                    </ExternalStepButton>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      3. Link a billing account
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Google requires a billing account to use Maps, but there is
                      a generous monthly free credit that covers small nonprofits.
                      Follow the page&apos;s prompts to add a card — you will not
                      be charged unless you exceed the free tier.
                    </p>
                    <ExternalStepButton href="https://console.cloud.google.com/billing">
                      Open billing
                    </ExternalStepButton>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      4. Enable the three APIs MissionGrid needs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Open each link and click the blue <span className="font-medium text-foreground">Enable</span> button. You need all three.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <ExternalStepButton href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com">
                        Enable Maps JavaScript API
                      </ExternalStepButton>
                      <ExternalStepButton href="https://console.cloud.google.com/apis/library/places-backend.googleapis.com">
                        Enable Places API
                      </ExternalStepButton>
                      <ExternalStepButton href="https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com">
                        Enable Geocoding API
                      </ExternalStepButton>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      5. Create an API key
                    </p>
                    <p className="text-xs text-muted-foreground">
                      On the Credentials page, click <span className="font-medium text-foreground">+ Create credentials</span> → <span className="font-medium text-foreground">API key</span>. Copy the key that appears.
                    </p>
                    <ExternalStepButton href="https://console.cloud.google.com/apis/credentials">
                      Open Credentials
                    </ExternalStepButton>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium text-foreground">
                      6. Restrict the key to this app&apos;s domains
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Back on the Credentials page, click the key you just made.
                      Under <span className="font-medium text-foreground">Application restrictions</span> pick <span className="font-medium text-foreground">HTTP referrers</span>, then paste these two lines into the allowed referrers list. Under <span className="font-medium text-foreground">API restrictions</span>, restrict to the three APIs you enabled in step 4.
                    </p>
                    <pre className="whitespace-pre-wrap break-all rounded border bg-background p-2 font-mono text-xs text-foreground">
{`${window.location.origin}/*
http://localhost:5173/*`}
                    </pre>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const text = `${window.location.origin}/*\nhttp://localhost:5173/*`
                        try {
                          await navigator.clipboard.writeText(text)
                          toast.success('Allowed referrers copied')
                        } catch {
                          toast.error('Clipboard blocked — select and copy the lines above manually.')
                        }
                      }}
                    >
                      Copy allowed referrers
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      7. Paste the key below and test it
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Paste the key you copied in step 5 into the box below, then
                      press <span className="font-medium text-foreground">Test Google key</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="gkey">Google Maps JavaScript API key</Label>
                <Input
                  id="gkey"
                  type="password"
                  autoComplete="off"
                  placeholder="AIza…"
                  {...form.register('googleMapsApiKey', {
                    onChange: () => setGoogleOk(null),
                  })}
                />
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

              {googleOk === true && (
                <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    Key is working — you can continue.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Press <span className="font-medium text-foreground">Next</span> below to set up your service area.
                  </p>
                </div>
              )}

              {googleOk === false && (
                <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium text-foreground">
                    Google rejected that key.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check that you enabled all three APIs in step 4, that billing
                    is linked in step 3, and that the referrers from step 6 include
                    this exact domain.
                  </p>
                </div>
              )}

              <details className="rounded-md border border-border bg-background p-3 text-sm">
                <summary className="cursor-pointer font-medium text-foreground">
                  If you get stuck
                </summary>
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                  <li>
                    <span className="font-medium text-foreground">
                      RefererNotAllowedMapError
                    </span>{' '}
                    — the HTTP referrers in step 6 don&apos;t include the domain
                    you&apos;re loading the app from. Re-copy the two lines above
                    into Google Cloud.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      ApiNotActivatedMapError
                    </span>{' '}
                    — one of the three APIs in step 4 is not enabled. Open each
                    link again and confirm you see a green &ldquo;API enabled&rdquo; status.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      BillingNotEnabledMapError
                    </span>{' '}
                    — you need to link a billing account (step 3) before Maps
                    will answer.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">
                      InvalidKeyMapError
                    </span>{' '}
                    — the key was copied incorrectly. Re-copy from the
                    Credentials page (step 5) and paste again.
                  </li>
                </ul>
              </details>

              <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Don&apos;t have a key yet? You can add one later in Admin
                  settings. Without a key the map view and address-only CSV
                  import are disabled.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    form.setValue('googleMapsApiKey', '')
                    setGoogleOk(null)
                    toast.message('Skipping Google Maps — you can add a key later.')
                    setStep(4)
                  }}
                >
                  Skip for now
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (() => {
            const currentRadius = form.watch('radiusMeters')
            const currentLat = form.watch('centerLat')
            const currentLng = form.watch('centerLng')
            const currentKey = form.watch('googleMapsApiKey') ?? ''
            return (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                This is the area your volunteers will cover. The <span className="font-medium text-foreground">center point</span> is the middle of your territory; the <span className="font-medium text-foreground">radius</span> is how far out from the center it extends.
              </p>

              <div>
                <Label htmlFor="serviceAreaName">Service area name</Label>
                <Input id="serviceAreaName" {...form.register('serviceAreaName')} />
                <p className="mt-1 text-xs text-muted-foreground">
                  A friendly name volunteers will see (e.g. &ldquo;Downtown coverage&rdquo; or &ldquo;East side route&rdquo;).
                </p>
              </div>

              <div className="space-y-3">
                <Label>Center point</Label>

                <CenterPointPicker
                  apiKey={currentKey}
                  apiKeyOk={googleOk === true}
                  lat={currentLat}
                  lng={currentLng}
                  radiusMeters={currentRadius}
                  onChange={({ lat, lng }) => {
                    form.setValue('centerLat', lat, { shouldValidate: true })
                    form.setValue('centerLng', lng, { shouldValidate: true })
                  }}
                  onJumpToKeyStep={() => setStep(3)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!('geolocation' in navigator)) {
                        toast.error('This browser does not support geolocation.')
                        return
                      }
                      toast.message('Asking your browser for your location…')
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          form.setValue('centerLat', Number(pos.coords.latitude.toFixed(6)), {
                            shouldValidate: true,
                          })
                          form.setValue('centerLng', Number(pos.coords.longitude.toFixed(6)), {
                            shouldValidate: true,
                          })
                          toast.success('Centered on your current location.')
                        },
                        (err) => {
                          toast.error(
                            err.code === err.PERMISSION_DENIED
                              ? 'Location permission denied — you can still type coordinates manually.'
                              : 'Could not get your location. Type coordinates manually instead.',
                          )
                        },
                        { enableHighAccuracy: true, timeout: 10000 },
                      )
                    }}
                  >
                    Use my current location
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Exact coordinates
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="centerLat" className="sr-only">
                        Center latitude
                      </Label>
                      <Input
                        id="centerLat"
                        type="number"
                        step="any"
                        placeholder="39.7392"
                        {...form.register('centerLat', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="centerLng" className="sr-only">
                        Center longitude
                      </Label>
                      <Input
                        id="centerLng"
                        type="number"
                        step="any"
                        placeholder="-104.9903"
                        {...form.register('centerLng', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Latitude is between -90 and 90; longitude is between -180 and 180. Edits here sync with the picker above.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="radiusMeters">Radius (meters)</Label>
                <div className="flex flex-wrap gap-2">
                  {RADIUS_PRESETS.map((preset) => {
                    const active = currentRadius === preset.meters
                    return (
                      <Button
                        key={preset.meters}
                        type="button"
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        onClick={() =>
                          form.setValue('radiusMeters', preset.meters, {
                            shouldValidate: true,
                          })
                        }
                      >
                        {preset.label}
                      </Button>
                    )
                  })}
                </div>
                <Input
                  id="radiusMeters"
                  type="number"
                  placeholder="2500"
                  {...form.register('radiusMeters', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const r = currentRadius
                    if (!Number.isFinite(r) || r <= 0) return 'Pick a preset above or type a number of meters.'
                    const km = (r / 1000).toFixed(r >= 1000 ? 1 : 2)
                    const across = ((r * 2) / 1000).toFixed(r >= 1000 ? 1 : 2)
                    return `≈ ${km} km from the center in every direction, so your service area is about ${across} km across.`
                  })()}
                </p>
              </div>
            </div>
            )
          })()}

          {step === 5 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="csvText">Paste your locations CSV</Label>
                <p className="text-xs text-muted-foreground">
                  Required columns: <span className="font-mono">name</span>, <span className="font-mono">address</span>, and either <span className="font-mono">lat</span>/<span className="font-mono">lng</span> or an address we can geocode. Optional:
                  <span className="font-mono"> city</span>, <span className="font-mono">state</span>, <span className="font-mono">postal_code</span>, <span className="font-mono">category</span>, <span className="font-mono">notes</span>.
                </p>
              </div>

              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  New to CSVs? Start from the template, or load two sample rows so you can see the format:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      downloadCsvTemplate()
                      toast.success('Template downloaded — open it in Sheets or Excel.')
                    }}
                  >
                    Download template CSV
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      form.setValue('csvText', CSV_SAMPLE_ROWS, { shouldValidate: true })
                      toast.success('Sample rows loaded — edit them or paste your own.')
                    }}
                  >
                    Load sample rows
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      form.setValue('csvText', '', { shouldValidate: true })
                      toast.message('Starting with two sample locations — import your real list from Admin later.')
                    }}
                  >
                    Skip — I&apos;ll add locations later
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: open your list in Google Sheets or Excel → File → Download → Comma-separated values (.csv) → open the file in any text editor and paste everything here.
                </p>
              </div>

              <Textarea
                id="csvText"
                rows={8}
                placeholder={`name,address,lat,lng,category\nCommunity Center,"1200 Market St",39.7392,-104.9903,community`}
                {...form.register('csvText')}
              />

              {(() => {
                const text = form.watch('csvText') ?? ''
                if (!text.trim()) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      No CSV pasted — MissionGrid will start you off with two sample locations.
                    </p>
                  )
                }
                const preview = parseLocationCsvPreview(text)
                const valid = preview.rows.filter(
                  (r) => r.data && !r.issues.some((i) => i.severity === 'error') && !r.isDuplicate,
                ).length
                const flagged = preview.rows.filter((r) =>
                  r.issues.some((i) => i.severity === 'error'),
                ).length
                const duplicates = preview.rows.filter((r) => r.isDuplicate).length
                const firstIssues = preview.rows
                  .flatMap((r) =>
                    r.issues
                      .filter((i) => i.severity === 'error')
                      .map((i) => ({ row: r.rowNumber, message: i.message })),
                  )
                  .slice(0, 3)
                return (
                  <div className="space-y-2 rounded-md border border-border bg-background p-3 text-sm">
                    <p className="font-medium text-foreground">Preview</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="text-emerald-600 dark:text-emerald-400">{valid} valid</span>
                      {' · '}
                      <span className={flagged > 0 ? 'text-destructive' : ''}>{flagged} flagged</span>
                      {' · '}
                      {duplicates} duplicate{duplicates === 1 ? '' : 's'}
                    </p>
                    {firstIssues.length > 0 && (
                      <ul className="ml-4 list-disc space-y-1 text-xs text-muted-foreground">
                        {firstIssues.map((iss, idx) => (
                          <li key={`${iss.row}-${idx}`}>
                            <span className="font-medium text-foreground">Row {iss.row}:</span>{' '}
                            {iss.message}
                          </li>
                        ))}
                      </ul>
                    )}
                    {preview.errors.length > 0 && (
                      <p className="text-xs text-destructive">
                        CSV could not be parsed: {preview.errors[0]}
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {mode === 'supabase' && step === 6 && inviteUrl && (
            <div className="space-y-4 text-sm">
              <div className="space-y-2">
                <p className="font-medium text-foreground">Volunteer invite link</p>
                <p className="break-all rounded border bg-muted p-2 font-mono text-xs">{inviteUrl}</p>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteUrl)
                      toast.success('Copied invite link')
                    } catch {
                      toast.error('Clipboard blocked — select the link above and copy it manually.')
                    }
                  }}
                >
                  Copy invite link
                </Button>
              </div>

              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <p className="font-medium text-foreground">Share it with volunteers</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(inviteUrl, '_blank', 'noopener,noreferrer')}
                  >
                    Open link in new tab
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const orgName = form.getValues('organizationName')?.trim() || 'our team'
                      const subject = encodeURIComponent(`You're invited to ${orgName}`)
                      const body = encodeURIComponent(
                        `Hi,\n\nYou're invited to join ${orgName} on MissionGrid. Tap the link below to set up your account:\n\n${inviteUrl}\n\nThanks!`,
                      )
                      window.location.href = `mailto:?subject=${subject}&body=${body}`
                    }}
                  >
                    Share by email
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const orgName = form.getValues('organizationName')?.trim() || 'our team'
                      const body = encodeURIComponent(`Join ${orgName} on MissionGrid: ${inviteUrl}`)
                      window.location.href = `sms:?&body=${body}`
                    }}
                  >
                    Share by text
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  &ldquo;Share by text&rdquo; opens your phone&apos;s messages app — works best on iOS / Android.
                </p>
              </div>

              <div className="space-y-2 rounded-md border border-border bg-background p-3">
                <p className="font-medium text-foreground">What volunteers will see</p>
                <ol className="ml-4 list-decimal space-y-1 text-xs text-muted-foreground">
                  <li>They tap the link you sent and MissionGrid opens in their browser.</li>
                  <li>They enter their name and email — no password needed.</li>
                  <li>They tap <span className="font-medium text-foreground">Join</span> and land on the volunteer home screen, ready to check in locations.</li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  Tip: press <span className="font-medium text-foreground">Open link in new tab</span> above to try the flow yourself before sharing it.
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                You can always find this invite link again from Admin settings.
              </p>

              {adminUrl && (
                <div className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">
                      Your admin bookmark link
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Save this on every device you&apos;ll admin from. Opening
                      it once lets you sign in with email + password from then
                      on.
                    </p>
                  </div>
                  <p className="break-all rounded border bg-background p-2 font-mono text-xs">
                    {adminUrl}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(adminUrl)
                          toast.success('Copied admin link')
                        } catch {
                          toast.error(
                            'Clipboard blocked — select the link above and copy it manually.',
                          )
                        }
                      }}
                    >
                      Copy admin link
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(adminUrl, '_blank', 'noopener,noreferrer')
                      }
                    >
                      Open in new tab
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const orgName =
                          form.getValues('organizationName')?.trim() ||
                          'your team'
                        const subject = encodeURIComponent(
                          `Admin bookmark for ${orgName} on MissionGrid`,
                        )
                        const body = encodeURIComponent(
                          `Open this link on any device you admin from, then sign in with your email and password:\n\n${adminUrl}\n\nKeep this link private — it lets anyone who has it reach the admin sign-in page for ${orgName}.`,
                        )
                        window.location.href = `mailto:?subject=${subject}&body=${body}`
                      }}
                    >
                      Email myself
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Signing in requires the email and password you set in Step
                    3 (Admin account). The link only pre-loads the Supabase
                    connection — not your password.
                  </p>
                </div>
              )}
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
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                onClick={next}
                disabled={mode === 'supabase' && step === 1 && supabaseOk !== true}
                title={
                  mode === 'supabase' && step === 1 && supabaseOk !== true
                    ? 'Pass the connection test first'
                    : undefined
                }
              >
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
