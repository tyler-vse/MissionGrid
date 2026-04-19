/* eslint-disable react-refresh/only-export-components -- factory export for registry */
import { useEffect, useRef } from 'react'
import type { ActivityStatus } from '@/domain/models/activityStatus'
import type { MapProvider, MapRenderProps } from '@/providers/maps/MapProvider'
import { loadGoogleMaps } from '@/providers/maps/loader'

const markerColors: Record<ActivityStatus, string> = {
  available: '#22c55e',
  claimed: '#3b82f6',
  completed: '#64748b',
  skipped: '#a855f7',
  pending_review: '#eab308',
}

function GoogleMapView({
  apiKey,
  locations,
  center,
  selectedId,
  onSelectLocation,
}: MapRenderProps & { apiKey: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])

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
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
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
    for (const m of markersRef.current) m.setMap(null)
    markersRef.current = []
    for (const loc of locations) {
      const marker = new google.maps.Marker({
        map,
        position: { lat: loc.lat, lng: loc.lng },
        title: loc.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: markerColors[loc.status] ?? '#888',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 1,
        },
      })
      marker.addListener('click', () => {
        onSelectLocation?.(loc.id)
      })
      markersRef.current.push(marker)
    }
  }, [locations, onSelectLocation])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const loc = locations.find((l) => l.id === selectedId)
    if (loc) map.panTo({ lat: loc.lat, lng: loc.lng })
  }, [selectedId, locations])

  return (
    <div
      ref={ref}
      className="h-[280px] w-full overflow-hidden rounded-xl border border-border"
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
