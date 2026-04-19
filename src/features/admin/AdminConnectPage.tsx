import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { APP_CONFIG } from '@/config/app.config'
import {
  decodeAdminHash,
  type AdminBookmarkPayloadV1,
} from '@/config/runtimeConfig'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

type ParseResult =
  | { ok: true; payload: AdminBookmarkPayloadV1 }
  | { ok: false; error: string }

function parseAdminHashFromLocation(): ParseResult {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'Open this page in your browser.' }
  }
  const raw = window.location.hash.replace(/^#/, '').trim()
  if (!raw) {
    return {
      ok: false,
      error:
        'This page needs an admin bookmark link. Ask whoever ran setup to share their admin link with you.',
    }
  }
  const payload = decodeAdminHash(raw)
  if (!payload) {
    return {
      ok: false,
      error: 'This admin bookmark link is invalid or expired.',
    }
  }
  return { ok: true, payload }
}

export function AdminConnectPage() {
  const navigate = useNavigate()
  const patch = useRuntimeConfigStore((s) => s.patch)
  const [result] = useState<ParseResult>(parseAdminHashFromLocation)
  const error = result.ok ? null : result.error

  useEffect(() => {
    if (!result.ok) return
    const { payload } = result
    patch({
      supabaseUrl: payload.supabaseUrl,
      supabaseAnonKey: payload.supabaseAnonKey,
      organizationId: payload.organizationId,
      googleMapsApiKey: payload.googleMapsApiKey ?? '',
    })
    void navigate(APP_CONFIG.adminLoginRoute, { replace: true })
  }, [navigate, patch, result])

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6 space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          Connect <AppName />
        </h1>
        <p className="text-sm text-muted-foreground">
          Linking this device to your organization&apos;s Supabase project…
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-base">
              Can&apos;t use this link
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              If you already set up the organization on another device, open
              that device&apos;s admin bookmark link here.
            </p>
            <p>If this is a new organization, run setup first.</p>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={APP_CONFIG.setupRoute}>Organization setup</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to={APP_CONFIG.adminLoginRoute}>Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">One moment…</CardTitle>
            <CardDescription>
              Redirecting you to the admin sign-in page.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
