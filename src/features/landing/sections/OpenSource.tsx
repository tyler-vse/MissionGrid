import { BookOpen, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { APP_CONFIG } from '@/config/app.config'
import { GithubIcon } from '../GithubIcon'

const PITCH_POINTS: Array<{ title: string; body: string }> = [
  {
    title: 'Self-host, own your data',
    body: 'Supabase runs in your account. Volunteers and stops live in your Postgres — never a central SaaS.',
  },
  {
    title: 'BYOK for every integration',
    body: 'Supabase, Google Maps, and Places keys are configured per-org from the setup wizard or Vite env.',
  },
  {
    title: 'Rebrand in one file',
    body: 'Product name, slug, tagline, routes, and theme tokens all live in APP_CONFIG. No hunt-and-replace.',
  },
]

const CHECKLIST: string[] = [
  'A Supabase project (free tier is plenty to start)',
  'A Google Maps JavaScript API key (optional, enables live map + Places)',
  'A CSV of stops — or draw a service area and discover via Google Places',
  'Ten minutes to run the setup wizard',
]

export function OpenSource() {
  return (
    <section id="open-source" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              Open source, BYOK
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Yours to run, rebrand, and remix.
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              {APP_CONFIG.name} is MIT-licensed and built to be forked. Every organization brings
              their own keys, so nothing is tied to a central provider.
            </p>

            <ul className="mt-8 space-y-5">
              {PITCH_POINTS.map((point) => (
                <li key={point.title} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-success/15 text-success"
                  >
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold tracking-tight">{point.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a href={APP_CONFIG.supportUrl} target="_blank" rel="noreferrer">
                  <GithubIcon className="h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={APP_CONFIG.docsUrl}>
                  <BookOpen aria-hidden />
                  Read the docs
                </Link>
              </Button>
            </div>
          </div>

          <Card className="lg:mt-16">
            <CardContent className="p-6 sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What you bring
              </p>
              <h3 className="mt-2 text-xl font-semibold tracking-tight">
                A short pre-flight checklist
              </h3>
              <ul className="mt-5 space-y-3">
                {CHECKLIST.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span
                      aria-hidden
                      className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-border text-muted-foreground"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                Just exploring? Pick <span className="font-medium text-foreground">Try sample
                data</span> in the setup wizard — no accounts or keys required.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
