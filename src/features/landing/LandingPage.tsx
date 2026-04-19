import { APP_CONFIG } from '@/config/app.config'
import { useIsAppConfigured } from '@/data/useIsAppConfigured'
import { LandingNav } from './LandingNav'
import { CTAFooter } from './sections/CTAFooter'
import { FAQ } from './sections/FAQ'
import { Features } from './sections/Features'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { OpenSource } from './sections/OpenSource'
import { Preview } from './sections/Preview'
import { WhoItsFor } from './sections/WhoItsFor'

export function LandingPage() {
  const configured = useIsAppConfigured()
  const primaryCtaLabel = configured ? 'Open app' : 'Get started'
  const primaryCtaTo = configured ? '/volunteer' : APP_CONFIG.setupRoute
  const secondaryCtaLabel = configured ? 'Open setup' : 'Coordinator sign in'
  const secondaryCtaTo = configured
    ? APP_CONFIG.setupRoute
    : APP_CONFIG.adminLoginRoute

  return (
    <div className="min-h-screen scroll-smooth bg-background text-foreground">
      <LandingNav primaryCtaLabel={primaryCtaLabel} primaryCtaTo={primaryCtaTo} />
      <main>
        <Hero
          primaryCtaLabel={primaryCtaLabel}
          primaryCtaTo={primaryCtaTo}
          secondaryCtaLabel={secondaryCtaLabel}
          secondaryCtaTo={secondaryCtaTo}
        />
        <HowItWorks />
        <Preview />
        <Features />
        <WhoItsFor />
        <OpenSource />
        <FAQ />
        <CTAFooter primaryCtaLabel={primaryCtaLabel} primaryCtaTo={primaryCtaTo} />
      </main>
    </div>
  )
}
