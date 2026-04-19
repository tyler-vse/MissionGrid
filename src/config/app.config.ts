/**
 * Central branding and product defaults. Rename the product by editing this file only.
 * Avoid hardcoding the product name elsewhere — import `APP_CONFIG` or `appName` helpers.
 */
export const APP_CONFIG = {
  name: 'MissionGrid',
  slug: 'missiongrid',
  /** localStorage namespace for runtime org config */
  storageKey: 'missiongrid',
  tagline: 'Coordinate field coverage without duplication',
  description:
    'A volunteer-friendly field coordination app for outreach, canvassing, and local action.',
  setupRoute: '/setup',
  inviteRoute: '/join',
  adminLoginRoute: '/admin-login',
  adminConnectRoute: '/admin-connect',
  rebuildLinksRoute: '/rebuild-links',
  authCallbackRoute: '/auth/callback',
  loginRoute: '/login',
  /** Optional — set for fork branding / support link in docs UI */
  supportUrl: 'https://github.com',
  docsUrl: '/docs',
  theme: {
    /** Full CSS color values (injected as CSS variables at runtime) */
    primary: 'hsl(221 83% 45%)',
    accent: 'hsl(142 71% 33%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222 47% 11%)',
  },
  defaultTimeWindows: [10, 20, 30, 60] as const,
  defaultStatuses: [
    'available',
    'claimed',
    'completed',
    'skipped',
    'pending_review',
  ] as const,
} as const

export type TimeWindowMinutes = (typeof APP_CONFIG.defaultTimeWindows)[number]
