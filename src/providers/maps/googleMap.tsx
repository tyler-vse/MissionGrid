/* eslint-disable react-refresh/only-export-components -- factory export for registry */
import { useEffect, useRef } from 'react'
import type { ActivityStatus } from '@/domain/models/activityStatus'
import type { MapProvider, MapRenderProps } from '@/providers/maps/MapProvider'
import { loadGoogleMaps } from '@/providers/maps/loader'
import { cn } from '@/lib/utils'

const markerColors: Record<ActivityStatus, string> = {
  available: '#1d4ed8',
  claimed: '#0284c7',
  completed: '#16a34a',
  skipped: '#94a3b8',
  pending_review: '#d97706',
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

function GoogleMapView({
  apiKey,
  locations,
  center,
  selectedId,
  onSelectLocation,
  area,
  heightClassName,
}: MapRenderProps & { apiKey: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const circleRef = useRef<google.maps.Circle | null>(null)
  const polygonRef = useRef<google.maps.Polygon | null>(null)

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
    if (loc) map.panTo({ lat: loc.lat, lng: loc.lng })
  }, [selectedId, locations])

  // Area overlays
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (circleRef.current) {
      circleRef.current.setMap(null)
      circleRef.current = null
    }
    if (polygonRef.current) {
      polygonRef.current.setMap(null)
      polygonRef.current = null
    }
    if (!area) return
    if (area.radiusMeters && area.radiusMeters > 0) {
      circleRef.current = new google.maps.Circle({
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
      polygonRef.current = new google.maps.Polygon({
        map,
        paths: ring.map(([lng, lat]) => ({ lat: lat!, lng: lng! })),
        strokeColor: '#16a34a',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#16a34a',
        fillOpacity: 0.08,
      })
    }
  }, [area])

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
