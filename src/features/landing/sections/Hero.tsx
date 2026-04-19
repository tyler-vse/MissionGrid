import { ArrowRight, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandLockup } from '@/components/branding/BrandLockup'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/config/app.config'
import { GithubIcon } from '../GithubIcon'

type HeroProps = {
  primaryCtaLabel: string
  primaryCtaTo: string
  secondaryCtaLabel: string
  secondaryCtaTo: string
}

export function Hero({
  primaryCtaLabel,
  primaryCtaTo,
  secondaryCtaLabel,
  secondaryCtaTo,
}: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(ellipse_at_top,theme(colors.primary/15),transparent_60%)]"
      />

      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-20 text-center sm:px-6 sm:py-28">
        <BrandLockup variant="lockup" size="lg" className="!mx-0" />

        <div className="flex max-w-3xl flex-col gap-5">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            {APP_CONFIG.tagline}
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Coordinate field coverage without duplicate effort.
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            {APP_CONFIG.description} Mobile-first, open-source, and self-hosted on your own stack.
          </p>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="xl" className="w-full sm:w-auto">
            <Link to={primaryCtaTo}>
              {primaryCtaLabel}
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
            <Link to={secondaryCtaTo}>{secondaryCtaLabel}</Link>
          </Button>
        </div>

        <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <GithubIcon className="h-4 w-4" />
            Open source — MIT
          </li>
          <li className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-primary"
            />
            Bring your own Supabase + Google keys
          </li>
          <li className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" aria-hidden />
            Mobile-first PWA
          </li>
        </ul>
      </div>
    </section>
  )
}
