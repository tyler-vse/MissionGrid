import type { MapProvider } from '@/providers/maps/MapProvider'

/**
 * Phase 2: mount `@react-google-maps/api` or official loader here.
 * Keep `MapRenderProps` stable so `MapView` does not change.
 */
export const googleMapProvider: MapProvider = {
  renderMap: () => (
    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      Google Maps provider not wired yet (Phase 2). Use the mock map provider in
      development.
    </div>
  ),
}
