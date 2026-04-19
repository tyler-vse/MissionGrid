import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AppName } from '@/components/branding/AppName'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/config/app.config'
import { GithubIcon } from '../GithubIcon'

type CTAFooterProps = {
  primaryCtaLabel: string
  primaryCtaTo: string
}

export function CTAFooter({ primaryCtaLabel, primaryCtaTo }: CTAFooterProps) {
  const year = new Date().getFullYear()

  return (
    <>
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-10 text-center shadow-sm sm:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/15),transparent_55%)]"
            />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to put boots on the ground?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
                Spin up a free org with sample data in under a minute, or plug in your Supabase
                project and invite your team today.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="xl" className="w-full sm:w-auto">
                  <Link to={primaryCtaTo}>
                    {primaryCtaLabel}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                  <a href={APP_CONFIG.supportUrl} target="_blank" rel="noreferrer">
                    <GithubIcon className="h-4 w-4" />
                    View on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <AppName className="text-foreground" />
            <span>© {year}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a
              href={APP_CONFIG.supportUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground"
            >
              GitHub
            </a>
            <Link to={APP_CONFIG.docsUrl} className="hover:text-foreground">
              Docs
            </Link>
            <Link to={APP_CONFIG.adminLoginRoute} className="hover:text-foreground">
              Coordinator sign in
            </Link>
            <Link to={APP_CONFIG.setupRoute} className="hover:text-foreground">
              Setup
            </Link>
          </div>
        </div>
      </footer>
    </>
  )
}
