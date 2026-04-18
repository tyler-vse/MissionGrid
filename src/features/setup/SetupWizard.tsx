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
import { Textarea } from '@/components/ui/textarea'
import { APP_CONFIG } from '@/config/app.config'
import { parseLocationCsv } from '@/lib/csv'
import { useMockBackendStore } from '@/store/mockBackendStore'

const fullSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  organizationSlug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and hyphens'),
  serviceAreaName: z.string().min(2),
  centerLat: z.number().finite(),
  centerLng: z.number().finite(),
  radiusMeters: z.number().int().positive().max(50_000),
  csvText: z.string().optional(),
})

type FullForm = z.infer<typeof fullSchema>

export function SetupWizard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const configured = useMockBackendStore((s) => s.appConfiguration?.isConfigured)

  const form = useForm<FullForm>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      organizationName: 'Sample Street Team',
      organizationSlug: 'sample-street-team',
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

  const onFinish = form.handleSubmit((values) => {
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
    toast.success('Setup complete — welcome volunteers!')
    void navigate('/volunteer', { replace: true })
  })

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Set up <AppName />
        </h1>
        <p className="text-sm text-muted-foreground">{APP_CONFIG.description}</p>
        {configured && (
          <p className="text-xs text-accent">
            This device already has an organization. You can import more stops or
            reset from Admin.
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization setup</CardTitle>
          <CardDescription>
            Step {step + 1} of 4 — keep it simple; you can refine later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
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

          {step === 1 && (
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

          {step === 2 && (
            <div className="space-y-2">
              <Label htmlFor="csvText">Paste CSV (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Headers: name, address, lat, lng — optional category.
              </p>
              <Textarea
                id="csvText"
                rows={8}
                placeholder={`name,address,lat,lng,category\nCommunity Center,"1200 Market St",39.7392,-104.9903,community`}
                {...form.register('csvText')}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Organization:</span>{' '}
                {form.getValues('organizationName')} ({form.getValues('organizationSlug')})
              </p>
              <p>
                <span className="font-medium text-foreground">Service area:</span>{' '}
                {form.getValues('serviceAreaName')}
              </p>
              <p>
                CSV rows:{' '}
                {form.getValues('csvText')?.trim()
                  ? parseLocationCsv(form.getValues('csvText') ?? '').rows.length
                  : '2 sample stops (no CSV provided)'}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={loadDemo}>
            Try sample data
          </Button>
          <div className="flex w-full gap-2 sm:w-auto">
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" className="flex-1 sm:flex-none" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            ) : (
              <Button type="button" className="flex-1 sm:flex-none" onClick={() => void onFinish()}>
                Finish setup
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
