import { Home, List, Play, TrendingUp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useShiftStore } from '@/store/shiftStore'
import { cn } from '@/lib/utils'

const baseTabs = [
  { to: '/volunteer', label: 'Home', icon: Home, end: true },
  { to: '/locations', label: 'Places', icon: List, end: false },
  { to: '/progress', label: 'Progress', icon: TrendingUp, end: false },
] as const

export function MobileTabBar() {
  const shiftActive = useShiftStore((s) => s.status === 'active')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5">
        <NavLink
          to="/volunteer"
          end
          className={({ isActive }) =>
            cn(
              'tap flex min-w-[56px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors',
              isActive && 'text-primary',
            )
          }
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </NavLink>

        {shiftActive && (
          <NavLink
            to="/shift"
            className={({ isActive }) =>
              cn(
                'tap flex min-w-[56px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-semibold text-primary transition-colors',
                isActive && 'bg-primary/10',
              )
            }
          >
            <span className="relative">
              <Play className="h-5 w-5" />
              <span
                aria-hidden
                className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-background"
              />
            </span>
            <span>Shift</span>
          </NavLink>
        )}

        {baseTabs.slice(1).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'tap flex min-w-[56px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors',
                isActive && 'text-primary',
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
