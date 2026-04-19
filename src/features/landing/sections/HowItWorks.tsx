import { Activity, Link2, MapPin, Timer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Step = {
  icon: LucideIcon
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    icon: MapPin,
    title: 'Import your territory',
    body: 'Upload a CSV of stops, draw a radius, or search Google Places inside your service area.',
  },
  {
    icon: Link2,
    title: 'Share the invite link',
    body: 'Send one link over email, SMS, or a QR code. Volunteers sign up with just a name + email.',
  },
  {
    icon: Timer,
    title: 'Pick a time window',
    body: 'Volunteers tap 10, 20, 30, or 60 minutes and the app suggests an optimized route.',
  },
  {
    icon: Activity,
    title: 'Track live progress',
    body: 'Coordinators watch the activity feed, approve new places, and hit milestones together.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            From zero to first shift in under ten minutes.
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            A coordinator spins up an org, drops in stops, and shares a single link. Volunteers open
            it on their phone and start working the map.
          </p>
        </div>

        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, idx) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {idx + 1}
                    </span>
                    <step.icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
