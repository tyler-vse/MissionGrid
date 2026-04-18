/** GeoJSON Polygon coordinates [lng, lat][] — optional until map tooling lands */
export type GeoPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface ServiceArea {
  id: string
  organizationId: string
  name: string
  centerLat: number
  centerLng: number
  radiusMeters?: number
  polygon?: GeoPolygon
}
