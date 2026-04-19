import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ProviderStatusBanner } from '@/components/layout/ProviderStatusBanner'
import { AppName } from '@/components/branding/AppName'
import { Logo } from '@/components/branding/Logo'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { APP_CONFIG } from '@/config/app.config'
import { useActiveVolunteer } from '@/data/useVolunteer'
import { cn } from '@/lib/utils'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

export function Header({ className }: { className?: string }) {
  const { volunteers, activeVolunteerId, setActiveVolunteerId } =
    useActiveVolunteer()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const supabaseUrl = useRuntimeConfigStore((s) => s.supabaseUrl)
  const supabaseAnonKey = useRuntimeConfigStore((s) => s.supabaseAnonKey)
  const patch = useRuntimeConfigStore((s) => s.patch)
  const signOutable = Boolean(supabaseUrl && supabaseAnonKey)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      try {
        const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
        await supabase.auth.signOut()
      } catch {
        /* ignore — we still want to clear the local session */
      }
      patch({ volunteerId: '' })
      queryClient.clear()
      toast.success('Signed out')
    } finally {
      setSigningOut(false)
      navigate(APP_CONFIG.loginRoute, { replace: true })
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        className,
      )}
    >
      <ProviderStatusBanner />
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        <Link to="/volunteer" className="flex items-center gap-2 min-w-0">
          <Logo className="shrink-0" />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 truncate">
              <AppName className="truncate text-base" />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {APP_CONFIG.tagline}
            </p>
          </div>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {volunteers.length > 0 && (
            <Select
              value={activeVolunteerId ?? undefined}
              onValueChange={(v) => setActiveVolunteerId(v)}
            >
              <SelectTrigger className="h-9 w-[120px]" aria-label="Volunteer">
                <SelectValue placeholder="Volunteer" />
              </SelectTrigger>
              <SelectContent>
                {volunteers.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">Admin</Link>
          </Button>
          {signOutable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">
                {signingOut ? 'Signing out…' : 'Sign out'}
              </span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
