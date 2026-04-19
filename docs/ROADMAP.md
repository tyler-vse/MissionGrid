# MissionGrid roadmap

Branding and product strings live in [`src/config/app.config.ts`](../src/config/app.config.ts).

## Phase 1 (shipped)

- React + Vite PWA, Tailwind, four-layer architecture.
- Central `APP_CONFIG`, domain models, mock backend (Zustand) + TanStack Query.

## Phase 2 (shipped)

- **Supabase**: schema in [`docs/supabase/schema.sql`](./supabase/schema.sql), `createSupabaseBackend`, realtime `locations` subscription, `join_volunteer` RPC for invite links.
- **Runtime config**: per-browser `localStorage` + invite hash; provider registry switches mock vs Supabase / Google.
- **Google**: Maps JS map, Geocoding, Places (autocomplete + text search) behind providers; connection tests in setup.
- **CSV**: preview, duplicates, optional geocode batch, Admin `CsvImport`.
- **Routing**: `RoutingProvider` with greedy heuristic; route suggestions respect area filters.
- **Area tools**: text filter, radius, GeoJSON polygon, Places search.
- **Setup wizard**: mock path, Supabase path with admin signup + invite URL.
- **Join page**: volunteer signup from invite link.

## Phase 2.5 — Field polish (shipped)

- **Light design system**: strong-contrast tokens, Chip / Skeleton / EmptyState / Stat / InlineAlert / LocationCard / OpenStatusBadge, shared `Thermometer`.
- **Start My Shift**: volunteer home → shift flow with time chips, sticky timer, Navigate / Claim / Complete / Skip, "I have more time" chips, persisted `shiftStore`.
- **Find more places**: internal candidates first, Google Places search when configured, dedupe by name + 60m radius, admin review queue.
- **Map + List**: segmented toggle at `/locations`, filters in a bottom sheet, service-area circle + polygon on the Google map.
- **Admin**: sub-routes (overview / imports / review / volunteers), live activity feed, import stepper with grouped Errors / Duplicates / Warnings / Ready, per-volunteer stats.
- **PWA**: install prompt, ConnectionBanner, `offlineFirst` query client, tap-target audit, updated icons + manifest.
- **Docs**: onboarding walkthrough, screenshot placeholders, embed stub.

## Phase 3 (next)

- Supabase-backed suggested-places queue (mirror `SuggestedPlace` model into `docs/supabase/schema.sql`).
- Business hours import (CSV column + Places hours fetch), smarter routing (2-opt / OR-Tools WASM).
- Full offline write queue with IndexedDB-backed mutation replay.
- Dedicated UMD embed build + WordPress plugin wrapper, iframe theming.
- White-label theme export (primary/accent from APP_CONFIG → CSS vars at build time).
