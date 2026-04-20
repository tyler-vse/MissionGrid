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

export interface MapAreaDescriptor extends MapAreaOverlay {
  id: string
  name?: string
}

export type MapEditMode =
  | { kind: 'idle' }
  | { kind: 'drawingPolygon' }
  | { kind: 'drawingCircle' }
  | { kind: 'editing'; areaId: string }

export interface MapAreaShape {
  polygon?: GeoPolygon | null
  center?: { lat: number; lng: number }
  radiusMeters?: number | null
}

export interface MapRenderProps {
  locations: Location[]
  center: { lat: number; lng: number }
  selectedId?: string | null
  onSelectLocation?: (id: string) => void
  /** Optional single service-area overlay (legacy / simple volunteer views). */
  area?: MapAreaOverlay | null
  /** Optional multi-zone overlays for admin views. */
  areas?: MapAreaDescriptor[]
  /** Currently selected zone id (for admin view highlighting + editing). */
  selectedAreaId?: string | null
  onSelectArea?: (id: string | null) => void
  /** Admin edit/draw mode. */
  editMode?: MapEditMode
  /** Called with partial shape patches while an area is being edited. */
  onAreaChange?: (id: string, patch: MapAreaShape) => void
  /** Called once when a new area has been drawn (polygon or circle). */
  onAreaDrawn?: (shape: MapAreaShape) => void
  /** Optional height class override. */
  heightClassName?: string
}

export interface MapProvider {
  renderMap: (props: MapRenderProps) => ReactNode
}
