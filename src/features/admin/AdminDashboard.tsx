import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppName } from '@/components/branding/AppName'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { APP_CONFIG } from '@/config/app.config'
import { useImportLocationsFromCsv } from '@/data/useImportLocationsFromCsv'
import { useOrganization } from '@/data/useOrganization'
import { useProgress } from '@/data/useProgress'
import { useVolunteers } from '@/data/useVolunteers'
import { parseLocationCsv } from '@/lib/csv'
import { useMockBackendStore } from '@/store/mockBackendStore'

export function AdminDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: org } = useOrganization()
  const { data: progress } = useProgress()
  const { data: volunteers = [] } = useVolunteers()
  const importCsv = useImportLocationsFromCsv()
  const [tab, setTab] = useState<'overview' | 'imports' | 'review' | 'volunteers'>(
    'overview',
  )
  const [csvText, setCsvText] = useState('')

  const reset = () => {
    useMockBackendStore.getState().resetToEmpty()
    queryClient.clear()
    toast.message('Reset demo — run setup again.')
    void navigate('/setup', { replace: true })
  }

  const onImport = () => {
    const parsed = parseLocationCsv(csvText)
    if (parsed.errors.length) {
      toast.error(parsed.errors[0] ?? 'CSV error')
      return
    }
    if (parsed.rows.length === 0) {
      toast.error('No rows to import')
      return
    }
    importCsv.mutate(parsed.rows, {
      onSuccess: (r) => {
        toast.success(`Imported ${r.imported} stops`)
        setCsvText('')
      },
      onError: (e) => toast.error(String(e)),
    })
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 pb-12">
      <div className="mb-6 flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Imports, review queue, and org progress for <AppName />.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/volunteer">Volunteer</Link>
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as typeof tab)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2 gap-1 sm:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="imports">Imports</TabsTrigger>
          <TabsTrigger value="review">Review</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'overview' && (
        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
              <CardDescription>
                {org?.name ?? 'No organization loaded — open Setup.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {progress && (
                <p>
                  Completion:{' '}
                  <span className="font-semibold">{progress.percentComplete}%</span>{' '}
                  ({progress.byStatus.find((s) => s.status === 'completed')?.count ?? 0}{' '}
                  completed of {progress.total})
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Phase 2: connect Supabase for real shared data and admin auth.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Danger zone</CardTitle>
              <CardDescription>Clears in-memory mock data on this device.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={reset}>
                Reset & go to setup
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'imports' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CSV import</CardTitle>
            <CardDescription>
              Headers: name, address, lat, lng — optional category. Phase 2 will
              geocode addresses automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="adminCsv">Paste CSV</Label>
              <Textarea
                id="adminCsv"
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`name,address,lat,lng\nNew Stop,"1300 Market St",39.74,-104.99`}
              />
            </div>
            <Button onClick={onImport} disabled={importCsv.isPending}>
              Import to organization
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suggested places</CardTitle>
            <CardDescription>
              Phase 3: review queue for Places API suggestions will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No pending suggestions in the mock backend. When discovery ships,
            volunteers can propose new stops for admin approval.
          </CardContent>
        </Card>
      )}

      {tab === 'volunteers' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volunteers</CardTitle>
            <CardDescription>Personas for one-tap field actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {volunteers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No volunteers yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {volunteers.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <span className="font-medium">{v.displayName}</span>
                    <span className="text-xs text-muted-foreground">{v.id}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">
                Optional Phase 2 credential fields (UI only)
              </Label>
              <div className="mt-2 grid gap-2">
                <Input disabled placeholder="Supabase URL" />
                <Input disabled placeholder="Supabase anon key" />
                <Input disabled placeholder="Google Maps API key" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {APP_CONFIG.name} keeps secrets out of git — these will wire to the
                provider registry in Phase 2.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
