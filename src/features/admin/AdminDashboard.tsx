import {
  ArrowLeft,
  Building2,
  FileUp,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AppName } from '@/components/branding/AppName'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/config/app.config'
import { AdminCampaignDetail } from '@/features/admin/AdminCampaignDetail'
import { AdminCampaigns } from '@/features/admin/AdminCampaigns'
import { AdminLinks } from '@/features/admin/AdminLinks'
import { AdminOverview } from '@/features/admin/AdminOverview'
import { AdminImport } from '@/features/admin/AdminImport'
import { AdminPlaces } from '@/features/admin/AdminPlaces'
import { AdminReview } from '@/features/admin/AdminReview'
import { AdminVolunteers } from '@/features/admin/AdminVolunteers'
import { cn } from '@/lib/utils'
import { requireSupabaseClient } from '@/providers/backend/supabaseClient'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

const navItems = [
  { to: '/admin', end: true, label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/campaigns', end: false, label: 'Campaigns', icon: Megaphone },
  { to: '/admin/places', end: false, label: 'Places', icon: Building2 },
  { to: '/admin/imports', end: false, label: 'Imports', icon: FileUp },
  { to: '/admin/review', end: false, label: 'Review', icon: ShieldCheck },
  {
    to: '/admin/volunteers',
    end: false,
    label: 'Volunteers',
    icon: Users,
  },
  { to: '/admin/links', end: false, label: 'Links', icon: Link2 },
] as const

export function AdminDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const supabaseUrl = useRuntimeConfigStore((s) => s.supabaseUrl)
  const supabaseAnonKey = useRuntimeConfigStore((s) => s.supabaseAnonKey)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = requireSupabaseClient(supabaseUrl, supabaseAnonKey)
        await supabase.auth.signOut()
      }
      queryClient.clear()
      toast.success('Signed out')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setSigningOut(false)
      navigate(APP_CONFIG.adminLoginRoute, { replace: true })
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Back" asChild>
            <Link to="/volunteer">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Admin
            </p>
            <h1 className="truncate text-lg font-bold">
              <AppName />
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/volunteer">Volunteer view</Link>
            </Button>
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
          </div>
        </div>
        <nav
          aria-label="Admin sections"
          className="mx-auto flex max-w-3xl gap-1 overflow-x-auto border-t px-2 py-2"
        >
          {navItems.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'tap inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-6">
        <Routes>
          <Route index element={<AdminOverview />} />
          <Route path="campaigns" element={<AdminCampaigns />} />
          <Route path="campaigns/:id" element={<AdminCampaignDetail />} />
          <Route path="places" element={<AdminPlaces />} />
          <Route path="imports" element={<AdminImport />} />
          <Route path="review" element={<AdminReview />} />
          <Route path="volunteers" element={<AdminVolunteers />} />
          <Route path="links" element={<AdminLinks />} />
        </Routes>
      </main>
    </div>
  )
}
