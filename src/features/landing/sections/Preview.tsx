import volunteerHome from '@/assets/screenshots/volunteer-home.png'
import shiftView from '@/assets/screenshots/shift-view.png'
import locationsList from '@/assets/screenshots/locations-list.png'
import progress from '@/assets/screenshots/progress.png'

type Shot = {
  src: string
  alt: string
  title: string
  body: string
}

const SHOTS: Shot[] = [
  {
    src: volunteerHome,
    alt: 'Volunteer home — pick a time window and start a shift',
    title: 'Volunteer home',
    body: 'Pick 10 / 20 / 30 / 60 minutes and tap Start. The team thermometer sits right on the home screen.',
  },
  {
    src: shiftView,
    alt: 'Shift view — route stops with Navigate / Claim / Complete',
    title: 'Active shift',
    body: 'A numbered, optimized route with Navigate, Claim, Complete, and Skip actions — plus "have more time" chips.',
  },
  {
    src: locationsList,
    alt: 'Places list with status filters and inline actions',
    title: 'Places',
    body: 'List or Map view, status chips, full-text search, and inline actions on every card.',
  },
  {
    src: progress,
    alt: 'Progress thermometer with per-service-area breakdown',
    title: 'Progress',
    body: 'Org-wide thermometer, per-status stat grid, and coverage by service area.',
  },
]

export function Preview() {
  return (
    <section id="preview" className="scroll-mt-20 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Product tour
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            See the whole loop — from home screen to final milestone.
          </h2>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Real screenshots from the built-in sample-data mode. No Supabase or Google keys needed
            to reproduce them locally.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SHOTS.map((shot) => (
            <figure key={shot.title} className="flex flex-col items-center">
              <div className="w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <img
                  src={shot.src}
                  alt={shot.alt}
                  loading="lazy"
                  className="block h-auto w-full"
                />
              </div>
              <figcaption className="mt-4 text-center">
                <p className="font-semibold tracking-tight">{shot.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{shot.body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
