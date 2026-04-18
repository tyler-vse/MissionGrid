# MissionGrid roadmap

Branding and product strings live in [`src/config/app.config.ts`](../src/config/app.config.ts).

## Phase 1 (current)

- React + Vite PWA scaffold with Tailwind and shadcn-style UI primitives.
- Four-layer architecture: UI (`features/`, `components/`), data hooks (`data/`), providers (`providers/`), domain (`domain/`).
- Centralized `APP_CONFIG`, domain models, mock backend (Zustand) + TanStack Query.
- Placeholder flows: setup wizard, volunteer home, route suggestions, locations, map, progress, admin tabs.
- Interfaces + stubs for Supabase backend and Google Maps.

## Phase 2

- Supabase: auth (magic link or org-scoped), organizations, volunteers, locations, RLS, CSV import pipeline.
- Realtime: `subscribeLocations` backed by Supabase channels; keep the same `BackendProvider` contract.
- Google Maps JS + Geocoding (and optional Places for basic search) behind `MapProvider` / `GeocodingProvider`.
- Setup wizard: persist user-supplied Supabase URL + anon key + Maps API key into `AppConfiguration` (never commit secrets).
- PWA hardening: icons, offline shell, install prompts on supported browsers.
- Tests: Vitest for `domain/services` (routing + progress).

## Phase 3

- **Find more nearby**: Places API suggestions, duplicate detection, admin review queue (see `SuggestedPlace` model).
- **Open / closed**: business hours awareness for scheduling.
- **Smarter routing**: 2-opt / lightweight OR-Tools WASM, multi-objective (time window + priority).
- **Embeds**: WordPress block or iframe widget documented for webmasters.
- **White-label kit**: exportable theme pack + optional i18n.
