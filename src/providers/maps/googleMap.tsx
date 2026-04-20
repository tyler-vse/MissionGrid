/* eslint-disable react-refresh/only-export-components -- factory export for registry */
import { useEffect, useRef } from 'react'
import type { ActivityStatus } from '@/domain/models/activityStatus'
import { hasCoords } from '@/domain/models/location'
import type { GeoPolygon } from '@/domain/models/serviceArea'
import type {
  MapAreaShape,
  MapProvider,
  MapRenderProps,
} from '@/providers/maps/MapProvider'
import { loadGoogleMaps } from '@/providers/maps/loader'
import { cn } from '@/lib/utils'

const markerColors: Record<ActivityStatus, string> = {
  available: '#1d4ed8',
  claimed: '#0284c7',
  completed: '#16a34a',
  skipped: '#94a3b8',
  pending_review: '#d97706',
  no_go: '#dc2626',
}

function createCircleContent(color: string, selected: boolean): HTMLElement {
  const el = document.createElement('div')
  const size = selected ? 20 : 14
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:50%',
    `background:${color}`,
    'border:2px solid #fff',
    'box-shadow:0 1px 2px rgba(0,0,0,0.25)',
    'cursor:pointer',
  ].join(';')
  return el
}

type AreaHandle =
  | { kind: 'polygon'; polygon: google.maps.Polygon; listeners: google.maps.MapsEventListener[] }
  | { kind: 'circle'; circle: google.maps.Circle; listeners: google.maps.MapsEventListener[] }

function polygonToGeoJson(polygon: google.maps.Polygon): GeoPolygon {
  const path = polygon.getPath()
  const ring: number[][] = []
  for (let i = 0; i < path.getLength(); i++) {
    const pt = path.getAt(i)
    ring.push([pt.lng(), pt.lat()])
  }
  if (ring.length > 0) {
    const [firstLng, firstLat] = ring[0]!
    const [lastLng, lastLat] = ring[ring.length - 1]!
    if (firstLng !== lastLng || firstLat !== lastLat) {
      ring.push([firstLng!, firstLat!])
    }
  }
  return { type: 'Polygon', coordinates: [ring] }
}

function GoogleMapView({
  apiKey,
  locations,
  center,
  selectedId,
  onSelectLocation,
  area,
  areas,
  selectedAreaId,
  onSelectArea,
  editMode,
  onAreaChange,
  onAreaDrawn,
  heightClassName,
}: MapRenderProps & { apiKey: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const legacyCircleRef = useRef<google.maps.Circle | null>(null)
  const legacyPolygonRef = useRef<google.maps.Polygon | null>(null)
  const areasRef = useRef<Map<string, AreaHandle>>(new Map())
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(
    null,
  )
  const drawingListenersRef = useRef<google.maps.MapsEventListener[]>([])

  // Stash the latest callbacks so long-lived listeners always see the latest
  // handlers without tearing down/reattaching.
  const onSelectAreaRef = useRef(onSelectArea)
  const onAreaChangeRef = useRef(onAreaChange)
  const onAreaDrawnRef = useRef(onAreaDrawn)
  useEffect(() => {
    onSelectAreaRef.current = onSelectArea
    onAreaChangeRef.current = onAreaChange
    onAreaDrawnRef.current = onAreaDrawn
  }, [onSelectArea, onAreaChange, onAreaDrawn])

  useEffect(() => {
    if (!ref.current) return
    let cancelled = false
    void (async () => {
      try {
        await loadGoogleMaps(apiKey)
        if (cancelled || !ref.current) return
        const map = new google.maps.Map(ref.current, {
          center,
          zoom: 13,
          mapId: 'DEMO_MAP_ID',
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          clickableIcons: false,
        })
        mapRef.current = map
      } catch {
        /* empty */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiKey, center])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.panTo(center)
  }, [center])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const m of markersRef.current) m.map = null
    markersRef.current = []
    for (const loc of locations) {
      if (!hasCoords(loc)) continue
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: loc.lat, lng: loc.lng },
        title: loc.name,
        content: createCircleContent(
          markerColors[loc.status] ?? '#888',
          loc.id === selectedId,
        ),
        gmpClickable: true,
      })
      marker.addListener('click', () => {
        onSelectLocation?.(loc.id)
      })
      markersRef.current.push(marker)
    }
  }, [locations, onSelectLocation, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const loc = locations.find((l) => l.id === selectedId)
    if (loc && hasCoords(loc)) {
      map.panTo({ lat: loc.lat, lng: loc.lng })
    }
  }, [selectedId, locations])

  // Legacy single-area overlay (kept for non-admin views that still pass `area`).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (legacyCircleRef.current) {
      legacyCircleRef.current.setMap(null)
      legacyCircleRef.current = null
    }
    if (legacyPolygonRef.current) {
      legacyPolygonRef.current.setMap(null)
      legacyPolygonRef.current = null
    }
    if (!area || areas) return
    if (area.radiusMeters && area.radiusMeters > 0) {
      legacyCircleRef.current = new google.maps.Circle({
        map,
        center: area.center,
        radius: area.radiusMeters,
        strokeColor: '#1d4ed8',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: '#1d4ed8',
        fillOpacity: 0.06,
      })
    }
    const ring = area.polygon?.coordinates?.[0]
    if (ring && ring.length > 2) {
      legacyPolygonRef.current = new google.maps.Polygon({
        map,
        paths: ring.map(([lng, lat]) => ({ lat: lat!, lng: lng! })),
        strokeColor: '#16a34a',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#16a34a',
        fillOpacity: 0.08,
      })
    }
  }, [area, areas])

  // Multi-area overlays (admin editor).
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!areas) {
      for (const [, handle] of areasRef.current) {
        for (const l of handle.listeners) l.remove()
        if (handle.kind === 'polygon') handle.polygon.setMap(null)
        else handle.circle.setMap(null)
      }
      areasRef.current.clear()
      return
    }

    const nextIds = new Set(areas.map((a) => a.id))
    for (const [id, handle] of areasRef.current) {
      if (!nextIds.has(id)) {
        for (const l of handle.listeners) l.remove()
        if (handle.kind === 'polygon') handle.polygon.setMap(null)
        else handle.circle.setMap(null)
        areasRef.current.delete(id)
      }
    }

    for (const descriptor of areas) {
      const existing = areasRef.current.get(descriptor.id)
      const wantsCircle =
        descriptor.radiusMeters != null && descriptor.radiusMeters > 0
      const wantsPolygon =
        descriptor.polygon?.coordinates?.[0] != null &&
        descriptor.polygon.coordinates[0].length > 2
      const kind: AreaHandle['kind'] = wantsPolygon
        ? 'polygon'
        : wantsCircle
          ? 'circle'
          : 'circle'

      if (existing && existing.kind !== kind) {
        for (const l of existing.listeners) l.remove()
        if (existing.kind === 'polygon') existing.polygon.setMap(null)
        else existing.circle.setMap(null)
        areasRef.current.delete(descriptor.id)
      }

      const id = descriptor.id
      const isSelected = id === selectedAreaId
      const stroke = isSelected ? '#1d4ed8' : '#16a34a'
      const fill = isSelected ? '#1d4ed8' : '#16a34a'

      if (kind === 'polygon' && wantsPolygon) {
        const ring = descriptor.polygon!.coordinates![0]!
        const paths = ring.map(([lng, lat]) => ({ lat: lat!, lng: lng! }))
        const current = areasRef.current.get(id) as
          | Extract<AreaHandle, { kind: 'polygon' }>
          | undefined
        if (!current) {
          const polygon = new google.maps.Polygon({
            map,
            paths,
            strokeColor: stroke,
            strokeOpacity: isSelected ? 0.9 : 0.7,
            strokeWeight: isSelected ? 3 : 2,
            fillColor: fill,
            fillOpacity: isSelected ? 0.12 : 0.08,
            clickable: true,
          })
          const listeners: google.maps.MapsEventListener[] = []
          listeners.push(
            polygon.addListener('click', () => {
              onSelectAreaRef.current?.(id)
            }),
          )
          const pushChange = () => {
            onAreaChangeRef.current?.(id, {
              polygon: polygonToGeoJson(polygon),
            })
          }
          listeners.push(
            polygon.getPath().addListener('set_at', pushChange),
          )
          listeners.push(
            polygon.getPath().addListener('insert_at', pushChange),
          )
          listeners.push(
            polygon.getPath().addListener('remove_at', pushChange),
          )
          areasRef.current.set(id, { kind: 'polygon', polygon, listeners })
        } else {
          current.polygon.setPaths(paths)
          current.polygon.setOptions({
            strokeColor: stroke,
            strokeOpacity: isSelected ? 0.9 : 0.7,
            strokeWeight: isSelected ? 3 : 2,
            fillColor: fill,
            fillOpacity: isSelected ? 0.12 : 0.08,
          })
        }
      } else {
        // Circle (either explicit radius or fallback while nothing else to draw).
        const current = areasRef.current.get(id) as
          | Extract<AreaHandle, { kind: 'circle' }>
          | undefined
        const radius = descriptor.radiusMeters ?? 0
        if (!current) {
          const circle = new google.maps.Circle({
            map,
            center: descriptor.center,
            radius,
            strokeColor: stroke,
            strokeOpacity: isSelected ? 0.9 : 0.6,
            strokeWeight: isSelected ? 3 : 2,
            fillColor: fill,
            fillOpacity: isSelected ? 0.1 : 0.06,
            clickable: true,
          })
          const listeners: google.maps.MapsEventListener[] = []
          listeners.push(
            circle.addListener('click', () => {
              onSelectAreaRef.current?.(id)
            }),
          )
          const pushChange = () => {
            const c = circle.getCenter()
            onAreaChangeRef.current?.(id, {
              center: c ? { lat: c.lat(), lng: c.lng() } : undefined,
              radiusMeters: circle.getRadius(),
            })
          }
          listeners.push(circle.addListener('radius_changed', pushChange))
          listeners.push(circle.addListener('center_changed', pushChange))
          areasRef.current.set(id, { kind: 'circle', circle, listeners })
        } else {
          current.circle.setCenter(descriptor.center)
          current.circle.setRadius(radius)
          current.circle.setOptions({
            strokeColor: stroke,
            strokeOpacity: isSelected ? 0.9 : 0.6,
            strokeWeight: isSelected ? 3 : 2,
            fillColor: fill,
            fillOpacity: isSelected ? 0.1 : 0.06,
          })
        }
      }
    }

    // Apply editable/draggable flags based on edit mode.
    const editingId =
      editMode && editMode.kind === 'editing' ? editMode.areaId : null
    for (const [id, handle] of areasRef.current) {
      const editable = id === editingId
      if (handle.kind === 'polygon') {
        handle.polygon.setEditable(editable)
        handle.polygon.setDraggable(editable)
      } else {
        handle.circle.setEditable(editable)
        handle.circle.setDraggable(editable)
      }
    }
  }, [areas, selectedAreaId, editMode])

  // Drawing manager for creating new zones.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    for (const l of drawingListenersRef.current) l.remove()
    drawingListenersRef.current = []
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setMap(null)
      drawingManagerRef.current = null
    }
    if (!editMode) return
    if (
      editMode.kind !== 'drawingPolygon' &&
      editMode.kind !== 'drawingCircle'
    ) {
      return
    }
    if (!google.maps.drawing?.DrawingManager) return

    const isPolygon = editMode.kind === 'drawingPolygon'
    const manager = new google.maps.drawing.DrawingManager({
      drawingMode: isPolygon
        ? google.maps.drawing.OverlayType.POLYGON
        : google.maps.drawing.OverlayType.CIRCLE,
      drawingControl: false,
      polygonOptions: {
        strokeColor: '#1d4ed8',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#1d4ed8',
        fillOpacity: 0.1,
        clickable: true,
        editable: false,
      },
      circleOptions: {
        strokeColor: '#1d4ed8',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: '#1d4ed8',
        fillOpacity: 0.08,
        clickable: true,
        editable: false,
      },
    })
    manager.setMap(map)
    drawingManagerRef.current = manager

    if (isPolygon) {
      drawingListenersRef.current.push(
        google.maps.event.addListener(
          manager,
          'polygoncomplete',
          (polygon: google.maps.Polygon) => {
            const geo = polygonToGeoJson(polygon)
            polygon.setMap(null)
            const shape: MapAreaShape = { polygon: geo }
            onAreaDrawnRef.current?.(shape)
          },
        ),
      )
    } else {
      drawingListenersRef.current.push(
        google.maps.event.addListener(
          manager,
          'circlecomplete',
          (circle: google.maps.Circle) => {
            const c = circle.getCenter()
            const shape: MapAreaShape = {
              center: c ? { lat: c.lat(), lng: c.lng() } : undefined,
              radiusMeters: circle.getRadius(),
            }
            circle.setMap(null)
            onAreaDrawnRef.current?.(shape)
          },
        ),
      )
    }

    return () => {
      for (const l of drawingListenersRef.current) l.remove()
      drawingListenersRef.current = []
      manager.setMap(null)
      if (drawingManagerRef.current === manager) {
        drawingManagerRef.current = null
      }
    }
  }, [editMode])

  return (
    <div
      ref={ref}
      className={cn(
        'w-full overflow-hidden rounded-xl border border-border',
        heightClassName ?? 'h-[320px]',
      )}
      role="presentation"
    />
  )
}

export function createGoogleMapProvider(apiKey: string): MapProvider {
  return {
    renderMap(props: MapRenderProps) {
      return <GoogleMapView apiKey={apiKey} {...props} />
    },
  }
}
