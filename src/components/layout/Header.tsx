import { Link } from 'react-router-dom'
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

export function Header({ className }: { className?: string }) {
  const { volunteers, activeVolunteerId, setActiveVolunteerId } =
    useActiveVolunteer()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        className,
      )}
    >
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
        </div>
      </div>
    </header>
  )
}
