import { HandHeart, HeartHandshake, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Persona = {
  icon: LucideIcon
  title: string
  summary: string
  useCase: string
}

const PERSONAS: Persona[] = [
  {
    icon: Users,
    title: 'Nonprofit coordinators',
    summary: 'Outreach teams, canvassers, and case-management follow-ups.',
    useCase: 'Door-knock 800 addresses in a district over two weekends without re-knocking.',
  },
  {
    icon: HandHeart,
    title: 'Street teams & mutual aid',
    summary: 'Wellness checks, pickups, and rapid neighborhood response.',
    useCase: 'Coordinate supply drop-offs across eight shelters with real-time claim status.',
  },
  {
    icon: HeartHandshake,
    title: 'Faith & community groups',
    summary: 'Door-knocking, local action, and community surveys.',
    useCase: 'Run a Saturday-morning prayer walk route that self-splits across ten volunteers.',
  },
]

export function WhoItsFor() {
  return (
    <section id="who-its-for" className="scroll-mt-20 bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Who it’s for
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Built for teams that work the street, not the spreadsheet.
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            If your work lives on a map and gets done in short bursts, you’re in the right place.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PERSONAS.map((persona) => (
            <Card key={persona.title} className="h-full">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success">
                  <persona.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-tight">{persona.title}</h3>
                  <p className="text-sm text-muted-foreground">{persona.summary}</p>
                </div>
                <div className="mt-auto rounded-md border border-dashed border-border bg-background/60 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Example
                  </p>
                  <p className="mt-1 text-sm">{persona.useCase}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
