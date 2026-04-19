import type { ReactNode } from 'react'
import type { Location } from '@/domain/models/location'
import type { GeoPolygon } from '@/domain/models/serviceArea'

export interface MapAreaOverlay {
  center: { lat: number; lng: number }
  /** Radius in meters. When set, the map draws a translucent circle. */
  radiusMeters?: number
  /** GeoJSON-ish polygon for service area boundary. */
  polygon?: GeoPolygon | null
}

export interface MapRenderProps {
  locations: Location[]
  center: { lat: number; lng: number }
  selectedId?: string | null
  onSelectLocation?: (id: string) => void
  /** Optional service-area overlay (radius circle / polygon). */
  area?: MapAreaOverlay | null
  /** Optional height class override. */
  heightClassName?: string
}

export interface MapProvider {
  renderMap: (props: MapRenderProps) => ReactNode
}
