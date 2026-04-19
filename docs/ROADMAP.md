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

## Phase 3 (next)

- Places-based discovery, duplicate detection, admin review queue (`SuggestedPlace`).
- Business hours, smarter routing (2-opt / OR-Tools WASM).
- Embeds (WordPress / iframe), white-label theme export.
