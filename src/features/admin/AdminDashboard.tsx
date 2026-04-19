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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { APP_CONFIG } from '@/config/app.config'
import { CsvImport } from '@/features/admin/CsvImport'
import { useOrganization } from '@/data/useOrganization'
import { useProgress } from '@/data/useProgress'
import { useVolunteers } from '@/data/useVolunteers'
import { useMockBackendStore } from '@/store/mockBackendStore'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

export function AdminDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: org } = useOrganization()
  const { data: progress } = useProgress()
  const { data: volunteers = [] } = useVolunteers()
  const [tab, setTab] = useState<'overview' | 'imports' | 'review' | 'volunteers'>(
    'overview',
  )

  const reset = () => {
    useMockBackendStore.getState().resetToEmpty()
    useRuntimeConfigStore.getState().reset()
    queryClient.clear()
    toast.message('Reset — run setup again.')
    void navigate('/setup', { replace: true })
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
                Use setup to connect Supabase for shared data across devices.
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
              Preview, optional geocode, then import. See docs for column headers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImport idPrefix="admin" />
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
              <p className="text-xs text-muted-foreground">
                API keys are stored in this browser only. To change them, open{' '}
                <Link className="text-primary underline" to={APP_CONFIG.setupRoute}>
                  {APP_CONFIG.setupRoute}
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
