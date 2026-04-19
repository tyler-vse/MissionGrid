import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AdminBookmarkCard } from '@/components/links/AdminBookmarkCard'
import { InviteLinkCard } from '@/components/links/InviteLinkCard'
import { Button } from '@/components/ui/button'
import { InlineAlert } from '@/components/ui/inline-alert'
import { SectionHeader } from '@/components/ui/section-header'
import { APP_CONFIG } from '@/config/app.config'
import {
  encodeAdminHash,
  encodeInviteHash,
} from '@/config/runtimeConfig'
import { queryKeys } from '@/data/queryKeys'
import { useOrganization } from '@/data/useOrganization'
import { formatUnknownError } from '@/lib/errors'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

interface InviteRow {
  id: string
  token: string
  createdAt: string
  expiresAt: string | null
}

function newInviteToken(): string {
  return `inv_${crypto.randomUUID().replace(/-/g, '')}`
}

export function AdminLinks() {
  const queryClient = useQueryClient()
  const supabaseUrl = useRuntimeConfigStore((s) => s.supabaseUrl)
  const supabaseAnonKey = useRuntimeConfigStore((s) => s.supabaseAnonKey)
  const organizationId = useRuntimeConfigStore((s) => s.organizationId)
  const googleMapsApiKey = useRuntimeConfigStore((s) => s.googleMapsApiKey)

  const { data: org } = useOrganization()
  const orgName = org?.name
  const [showAllTokens, setShowAllTokens] = useState(false)

  const connected = Boolean(supabaseUrl && supabaseAnonKey && organizationId)

  const invitesQuery = useQuery({
    queryKey: queryKeys.orgInvites(organizationId),
    enabled: connected,
    queryFn: async (): Promise<InviteRow[]> => {
      const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
      const { data, error } = await supabase
        .from('org_invites')
        .select('id, token, created_at, expires_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id as string,
        token: row.token as string,
        createdAt: row.created_at as string,
        expiresAt: (row.expires_at as string | null) ?? null,
      }))
    },
  })

  const rotateMutation = useMutation({
    mutationFn: async () => {
      const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
      const token = newInviteToken()
      const { error } = await supabase
        .from('org_invites')
        .insert({ organization_id: organizationId, token })
      if (error) throw error
      return token
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.orgInvites(organizationId),
      })
      toast.success(
        'New invite link ready. Old links still work until you delete them in Supabase.',
      )
    },
    onError: (e) => {
      toast.error(formatUnknownError(e))
    },
  })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const gmaps = googleMapsApiKey?.trim() || undefined

  const adminUrl = useMemo(() => {
    if (!connected) return ''
    const hash = encodeAdminHash({
      v: 1,
      supabaseUrl,
      supabaseAnonKey,
      organizationId,
      googleMapsApiKey: gmaps,
    })
    return `${origin}${APP_CONFIG.adminConnectRoute}#${hash}`
  }, [connected, gmaps, organizationId, origin, supabaseAnonKey, supabaseUrl])

  const inviteRows = invitesQuery.data ?? []
  const latestInvite = inviteRows[0]

  const buildInviteUrl = (token: string) => {
    const hash = encodeInviteHash({
      v: 1,
      supabaseUrl,
      supabaseAnonKey,
      organizationId,
      inviteToken: token,
      googleMapsApiKey: gmaps,
    })
    return `${origin}${APP_CONFIG.inviteRoute}#${hash}`
  }

  if (!connected) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Links"
          description="Share invite and admin bookmark links with your team."
        />
        <InlineAlert tone="destructive">
          This device isn&apos;t connected to a Supabase project yet.
        </InlineAlert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Links"
        description="Share your volunteer invite link and admin bookmark. Rotate the invite any time; older tokens keep working until you delete them in Supabase."
      />

      <section
        className="rounded-2xl border bg-card p-5 shadow-sm"
        aria-labelledby="invite-heading"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2
            id="invite-heading"
            className="text-base font-bold tracking-tight"
          >
            Volunteer invite
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={rotateMutation.isPending}
            onClick={() => rotateMutation.mutate()}
          >
            <RotateCw className="h-4 w-4" />
            {rotateMutation.isPending ? 'Rotating…' : 'Rotate invite'}
          </Button>
        </div>

        {invitesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading invite links…</p>
        ) : invitesQuery.isError ? (
          <InlineAlert tone="destructive">
            {formatUnknownError(invitesQuery.error)}
          </InlineAlert>
        ) : !latestInvite ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No invite tokens exist yet for this organization. Create one to
              share with volunteers.
            </p>
            <Button
              type="button"
              onClick={() => rotateMutation.mutate()}
              disabled={rotateMutation.isPending}
            >
              {rotateMutation.isPending
                ? 'Creating…'
                : 'Create first invite link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <InviteLinkCard
              inviteUrl={buildInviteUrl(latestInvite.token)}
              orgName={orgName}
              showVolunteerPrimer={false}
            />

            {inviteRows.length > 1 && (
              <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">
                    Older invite tokens ({inviteRows.length - 1})
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllTokens((v) => !v)}
                  >
                    {showAllTokens ? 'Hide' : 'Show'}
                  </Button>
                </div>
                {showAllTokens && (
                  <ul className="space-y-2">
                    {inviteRows.slice(1).map((row) => (
                      <li
                        key={row.id}
                        className="flex flex-col gap-1 rounded border bg-background p-2 text-xs"
                      >
                        <p className="font-mono break-all">{row.token}</p>
                        <p className="text-muted-foreground">
                          Created{' '}
                          {new Date(row.createdAt).toLocaleString()}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  buildInviteUrl(row.token),
                                )
                                toast.success('Copied invite link')
                              } catch {
                                toast.error(
                                  'Clipboard blocked — select and copy manually.',
                                )
                              }
                            }}
                          >
                            Copy link
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  To permanently disable an old token, delete its row in
                  Supabase &rarr; Table editor &rarr; org_invites.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section
        className="rounded-2xl border bg-card p-5 shadow-sm"
        aria-labelledby="admin-heading"
      >
        <div className="mb-3">
          <h2
            id="admin-heading"
            className="text-base font-bold tracking-tight"
          >
            Admin bookmark
          </h2>
          <p className="text-sm text-muted-foreground">
            Open on any device you want to admin from, then sign in with your
            email and password.
          </p>
        </div>
        <AdminBookmarkCard adminUrl={adminUrl} orgName={orgName} />
      </section>
    </div>
  )
}
