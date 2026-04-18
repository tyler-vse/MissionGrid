import { useState } from 'react'
import { StatusBadge } from '@/components/StatusBadge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useLocations } from '@/data/useLocations'
import { useServiceAreas } from '@/data/useServiceAreas'
import { getRegistry } from '@/providers/registry'

export function MapView() {
  const { data: locations = [], isLoading } = useLocations()
  const serviceAreas = useServiceAreas()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const center = serviceAreas[0]
    ? { lat: serviceAreas[0].centerLat, lng: serviceAreas[0].centerLng }
    : { lat: 39.7392, lng: -104.9903 }

  const selected = locations.find((l) => l.id === selectedId)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Map</h1>
        <p className="text-sm text-muted-foreground">
          Schematic coverage map — swap the map provider in Phase 2.
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading map…</p>
      )}

      {!isLoading &&
        getRegistry().map.renderMap({
          locations,
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
