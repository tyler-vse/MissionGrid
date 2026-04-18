import { Home, List, Map, Route, TrendingUp } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/volunteer', label: 'Home', icon: Home },
  { to: '/routes', label: 'Routes', icon: Route },
  { to: '/locations', label: 'Stops', icon: List },
  { to: '/map', label: 'Map', icon: Map },
  { to: '/progress', label: 'Progress', icon: TrendingUp },
] as const

export function MobileTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-lg justify-around px-1 pt-1">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-w-[56px] flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors',
                isActive && 'bg-muted text-foreground',
              )
            }
            end={to === '/volunteer'}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
