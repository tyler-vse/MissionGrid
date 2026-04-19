import {
  ClipboardCheck,
  Compass,
  Gauge,
  MapPinned,
  Search,
  WifiOff,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Feature = {
  icon: LucideIcon
  title: string
  body: string
}

const FEATURES: Feature[] = [
  {
    icon: Compass,
    title: 'Smart shift routing',
    body: 'A greedy router sequences nearby stops inside your service area so volunteers never double-cover a block.',
  },
  {
    icon: Search,
    title: 'Find more places mid-shift',
    body: 'Out of stops? Pull internal candidates first, then Google Places. New finds land in the admin review queue.',
  },
  {
    icon: ClipboardCheck,
    title: 'Live admin dashboard',
    body: 'Activity feed, per-volunteer stats, suggested-place review, and CSV imports in one coordinator view.',
  },
  {
    icon: Gauge,
    title: 'Progress thermometer',
    body: 'Org-wide coverage with per-area breakdown and 25 / 50 / 75 / 100% milestones to rally the team.',
  },
  {
    icon: WifiOff,
    title: 'Installable PWA',
    body: 'Works as an installed app, offline-first query cache, and a slim banner when connectivity wobbles.',
  },
  {
    icon: MapPinned,
    title: 'Flexible service areas',
    body: 'Combine a center + radius, GeoJSON polygons, and place search to scope exactly who does what.',
  },
]

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Features</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Everything a field team needs. Nothing they don’t.
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Built around the real workflow — a coordinator managing coverage and volunteers working
            the map in 20-minute windows.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardContent className="flex h-full flex-col gap-3 p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold tracking-tight">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
