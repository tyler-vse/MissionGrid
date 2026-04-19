import { ChevronDown } from 'lucide-react'
import { APP_CONFIG } from '@/config/app.config'

type QA = { q: string; a: string }

const FAQS: QA[] = [
  {
    q: 'Do I need to run a server?',
    a: 'No. The frontend is a static deploy (perfect for Vercel) and Supabase is your only backend. There is nothing to SSH into.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes. The codebase is MIT-licensed. You only pay the underlying providers — Supabase and Google Maps — at their own rates, and the free tiers are generous.',
  },
  {
    q: 'Can volunteers use it without an account?',
    a: 'They sign in with just a first name and email via a magic-link invite URL. No passwords, no app-store downloads — just open the link on their phone.',
  },
  {
    q: 'Does it work offline?',
    a: 'It installs as a PWA and queries run offline-first, so the app stays responsive on flaky cellular. A full offline write queue is on the near-term roadmap.',
  },
  {
    q: 'Can I rebrand it?',
    a: `Yes. Product name, tagline, routes, and theme colors all live in a single APP_CONFIG file. Change one file and ${APP_CONFIG.name} becomes your product.`,
  },
]

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">FAQ</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Questions, answered.
          </h2>
        </div>

        <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
          {FAQS.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-medium tracking-tight marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span>{item.q}</span>
                <ChevronDown
                  aria-hidden
                  className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
