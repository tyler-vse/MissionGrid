import type { ReactNode } from 'react'
import type { Location } from '@/domain/models/location'

export interface MapRenderProps {
  locations: Location[]
  center: { lat: number; lng: number }
  selectedId?: string | null
  onSelectLocation?: (id: string) => void
}

export interface MapProvider {
  renderMap: (props: MapRenderProps) => ReactNode
}
