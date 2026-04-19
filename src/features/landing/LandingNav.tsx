import { Link } from 'react-router-dom'
import { BrandLockup } from '@/components/branding/BrandLockup'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/config/app.config'

type LandingNavProps = {
  primaryCtaLabel: string
  primaryCtaTo: string
}

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#preview', label: 'Preview' },
  { href: '#features', label: 'Features' },
  { href: '#who-its-for', label: 'Who it’s for' },
  { href: '#faq', label: 'FAQ' },
]

export function LandingNav({ primaryCtaLabel, primaryCtaTo }: LandingNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${APP_CONFIG.name} home`}
        >
          <BrandLockup variant="icon" size="md" className="!h-9 !w-9" />
          <span className="font-semibold tracking-tight">{APP_CONFIG.name}</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Landing sections">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to={APP_CONFIG.adminLoginRoute}>Coordinator sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={primaryCtaTo}>{primaryCtaLabel}</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
