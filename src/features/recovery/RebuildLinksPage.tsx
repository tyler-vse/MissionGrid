import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppName } from '@/components/branding/AppName'
import { BrandLockup } from '@/components/branding/BrandLockup'
import { AdminBookmarkCard } from '@/components/links/AdminBookmarkCard'
import { InviteLinkCard } from '@/components/links/InviteLinkCard'
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
import {
  encodeAdminHash,
  encodeInviteHash,
  testSupabaseConnection,
} from '@/config/runtimeConfig'
import { formatUnknownError } from '@/lib/errors'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

interface RebuiltOrg {
  organizationId: string
  organizationName: string
  organizationSlug: string
  inviteToken: string | null
  inviteUrl: string | null
  adminUrl: string
}

export function RebuildLinksPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const runtimePatch = useRuntimeConfigStore((s) => s.patch)

  const [supabaseUrl, setSupabaseUrl] = useState('')
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('')
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [orgs, setOrgs] = useState<RebuiltOrg[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRebuild = async () => {
    const url = supabaseUrl.trim()
    const key = supabaseAnonKey.trim()
    const gmaps = googleMapsApiKey.trim() || undefined
    if (!url || !key) {
      toast.error('Supabase URL and anon key are required')
      return
    }

    setBusy(true)
    setError(null)
    setOrgs(null)
    try {
      const test = await testSupabaseConnection(url, key)
      if (!test.ok) {
        setError(test.message)
        toast.error(test.message)
        return
      }

      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      const { data: orgRows, error: orgsErr } = await supabase
        .from('organizations')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false })
      if (orgsErr) throw orgsErr

      const { data: inviteRows, error: invitesErr } = await supabase
        .from('org_invites')
        .select('organization_id, token, created_at')
        .order('created_at', { ascending: false })
      if (invitesErr) throw invitesErr

      const latestTokenByOrg = new Map<string, string>()
      for (const row of inviteRows ?? []) {
        const orgId = row.organization_id as string
        if (!latestTokenByOrg.has(orgId)) {
          latestTokenByOrg.set(orgId, row.token as string)
        }
      }

      const origin = window.location.origin
      const rebuilt: RebuiltOrg[] = (orgRows ?? []).map((row) => {
        const organizationId = row.id as string
        const inviteToken = latestTokenByOrg.get(organizationId) ?? null
        const adminHash = encodeAdminHash({
          v: 1,
          supabaseUrl: url,
          supabaseAnonKey: key,
          organizationId,
          googleMapsApiKey: gmaps,
        })
        const inviteUrl = inviteToken
          ? `${origin}${APP_CONFIG.inviteRoute}#${encodeInviteHash({
              v: 1,
              supabaseUrl: url,
              supabaseAnonKey: key,
              organizationId,
              inviteToken,
              googleMapsApiKey: gmaps,
            })}`
          : null
        return {
          organizationId,
          organizationName: (row.name as string) ?? 'Organization',
          organizationSlug: (row.slug as string) ?? '',
          inviteToken,
          inviteUrl,
          adminUrl: `${origin}${APP_CONFIG.adminConnectRoute}#${adminHash}`,
        }
      })

      if (rebuilt.length === 0) {
        setError(
          'Connected, but no organizations found in this Supabase project. Run setup first.',
        )
        toast.message('No organizations found in this project.')
        return
      }

      setOrgs(rebuilt)
      toast.success(
        rebuilt.length === 1
          ? 'Rebuilt links for your organization.'
          : `Rebuilt links for ${rebuilt.length} organizations.`,
      )
    } catch (e) {
      const message = formatUnknownError(e)
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  const connectDevice = (org: RebuiltOrg) => {
    runtimePatch({
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
      googleMapsApiKey: googleMapsApiKey.trim(),
      organizationId: org.organizationId,
      inviteToken: org.inviteToken ?? '',
    })
    void queryClient.invalidateQueries()
    toast.success('Connected this device — sign in to continue.')
    void navigate(APP_CONFIG.adminLoginRoute, { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 space-y-3 text-center">
        <BrandLockup size="md" className="mb-3" />
        <h1 className="text-2xl font-bold tracking-tight">
          Rebuild your <AppName /> links
        </h1>
        <p className="text-sm text-muted-foreground">
          Already ran setup but lost the invite or admin bookmark link? Paste
          your Supabase project URL and anon public key below and we&apos;ll
          reconstruct them — nothing is changed in your database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Supabase project</CardTitle>
          <CardDescription>
            Find these in Supabase dashboard &rarr; Settings &rarr; API. The
            anon public key is safe to paste here; it&apos;s the same one your
            admins embed in the invite and bookmark links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="rebuildSupabaseUrl">Supabase project URL</Label>
            <Input
              id="rebuildSupabaseUrl"
              placeholder="https://xxx.supabase.co"
              value={supabaseUrl}
              onChange={(e) => {
                setSupabaseUrl(e.target.value)
                setOrgs(null)
                setError(null)
              }}
            />
          </div>
          <div>
            <Label htmlFor="rebuildSupabaseKey">Supabase anon public key</Label>
            <Input
              id="rebuildSupabaseKey"
              type="password"
              autoComplete="off"
              value={supabaseAnonKey}
              onChange={(e) => {
                setSupabaseAnonKey(e.target.value)
                setOrgs(null)
                setError(null)
              }}
            />
          </div>
          <div>
            <Label htmlFor="rebuildGmapsKey">
              Google Maps API key (optional)
            </Label>
            <Input
              id="rebuildGmapsKey"
              type="password"
              autoComplete="off"
              placeholder="AIza…"
              value={googleMapsApiKey}
              onChange={(e) => setGoogleMapsApiKey(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Only needed if you want the rebuilt links to preload a Maps key
              for the map view and address geocoding.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button variant="ghost" asChild className="flex-1 sm:flex-none">
            <Link to={APP_CONFIG.adminLoginRoute}>Back to admin sign in</Link>
          </Button>
          <Button
            type="button"
            onClick={() => void handleRebuild()}
            disabled={busy}
            className="flex-1 sm:flex-none"
          >
            {busy ? 'Rebuilding…' : 'Rebuild links'}
          </Button>
        </CardFooter>
      </Card>

      {error && !orgs && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {orgs && orgs.length > 0 && (
        <div className="mt-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            {orgs.length === 1
              ? 'Rebuilt links for the organization in this Supabase project.'
              : `Rebuilt links for ${orgs.length} organizations. Pick the one you want to share.`}
          </p>
          {orgs.map((org) => (
            <Card key={org.organizationId}>
              <CardHeader>
                <CardTitle className="text-base">
                  {org.organizationName}
                </CardTitle>
                <CardDescription>
                  {org.organizationSlug
                    ? `Slug: ${org.organizationSlug}`
                    : `Org id: ${org.organizationId}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {org.inviteUrl ? (
                  <InviteLinkCard
                    inviteUrl={org.inviteUrl}
                    orgName={org.organizationName}
                    showVolunteerPrimer={false}
                  />
                ) : (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">
                      No invite token found for this org.
                    </p>
                    <p className="mt-1 text-xs">
                      You can still use the admin bookmark below to sign in,
                      then create a new invite link from the Admin &rarr; Links
                      tab.
                    </p>
                  </div>
                )}

                <AdminBookmarkCard
                  adminUrl={org.adminUrl}
                  orgName={org.organizationName}
                />
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => connectDevice(org)}>
                  Use on this device
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    window.open(org.adminUrl, '_blank', 'noopener,noreferrer')
                  }
                >
                  Open admin link
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Nothing typed here is saved until you pick &ldquo;Use on this
        device&rdquo;. Keys are only held in memory for the active session.
      </p>
    </div>
  )
}
