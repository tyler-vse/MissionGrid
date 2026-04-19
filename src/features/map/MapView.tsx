import { useMemo, useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { filterLocationsByArea } from '@/domain/services/areaFilter'
import { useLocations } from '@/data/useLocations'
import { useServiceAreas } from '@/data/useServiceAreas'
import { AreaTools } from '@/features/map/AreaTools'
import { useRegistry } from '@/providers/useRegistry'
import { useAreaFilterStore } from '@/store/areaFilterStore'

export function MapView() {
  const registry = useRegistry()
  const { data: locations = [], isLoading } = useLocations()
  const serviceAreas = useServiceAreas()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const areaSearch = useAreaFilterStore((s) => s.searchText)
  const centerLat = useAreaFilterStore((s) => s.centerLat)
  const centerLng = useAreaFilterStore((s) => s.centerLng)
  const radiusMeters = useAreaFilterStore((s) => s.radiusMeters)
  const polygon = useAreaFilterStore((s) => s.polygon)

  const center = serviceAreas[0]
    ? { lat: serviceAreas[0].centerLat, lng: serviceAreas[0].centerLng }
    : { lat: 39.7392, lng: -104.9903 }

  const mapLocations = useMemo(() => {
    const c =
      centerLat != null && centerLng != null
        ? { lat: centerLat, lng: centerLng }
        : null
    return filterLocationsByArea(locations, {
      textQuery: areaSearch,
      center: c,
      radiusMeters,
      polygon,
    })
  }, [locations, areaSearch, centerLat, centerLng, radiusMeters, polygon])

  const selected = mapLocations.find((l) => l.id === selectedId)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Map</h1>
        <p className="text-sm text-muted-foreground">
          Pins reflect filtered stops — connect Google Maps in setup for satellite view.
        </p>
      </div>

      <AreaTools />

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading map…</p>
      )}

      {!isLoading &&
        registry.map.renderMap({
          locations: mapLocations,
          center,
          selectedId,
          onSelectLocation: setSelectedId,
        })}

      {selected && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{selected.name}</CardTitle>
              <StatusBadge status={selected.status} />
            </div>
            <CardDescription>{selected.address}</CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Tap another pin on the map to inspect a stop.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
