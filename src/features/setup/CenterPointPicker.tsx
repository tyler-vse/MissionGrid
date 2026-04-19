import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { loadGoogleMaps } from '@/providers/maps/loader'
import { createGooglePlaces } from '@/providers/places/googlePlaces'
import type { PlacePrediction } from '@/providers/places/PlacesProvider'

export interface CenterPointPickerProps {
  apiKey: string
  apiKeyOk: boolean
  lat: number
  lng: number
  radiusMeters: number
  onChange: (coords: { lat: number; lng: number }) => void
  onJumpToKeyStep?: () => void
}

const COORD_REGEX_COMMA = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
const COORD_REGEX_WHITESPACE = /^\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*$/

function parsePastedCoords(
  raw: string,
): { lat: number; lng: number } | null {
  const match = raw.match(COORD_REGEX_COMMA) ?? raw.match(COORD_REGEX_WHITESPACE)
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90) return null
  if (lng < -180 || lng > 180) return null
  return { lat, lng }
}

export function CenterPointPicker({
  apiKey,
  apiKeyOk,
  lat,
  lng,
  radiusMeters,
  onChange,
  onJumpToKeyStep,
}: CenterPointPickerProps) {
  const mapsEnabled = Boolean(apiKey) && apiKeyOk

  return (
    <div className="space-y-4 rounded-md border border-border bg-muted/30 p-3">
      <PasteCoords onChange={onChange} />

      {mapsEnabled ? (
        <>
          <PlacesSearch apiKey={apiKey} onChange={onChange} />
          <MapClickPicker
            apiKey={apiKey}
            lat={lat}
            lng={lng}
            radiusMeters={radiusMeters}
            onChange={onChange}
          />
        </>
      ) : (
        <div className="space-y-1 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
          <p>
            Finish <span className="font-medium text-foreground">Step 3 (Google Maps)</span> to unlock place search and click-on-map picking here.
          </p>
          {onJumpToKeyStep && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onJumpToKeyStep}
            >
              Go back to Step 3
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function PasteCoords({
  onChange,
}: {
  onChange: (coords: { lat: number; lng: number }) => void
}) {
  const [draft, setDraft] = useState('')
  const parsed = useMemo(() => parsePastedCoords(draft), [draft])
  const showFormatHint = draft.trim().length >= 3 && !parsed

  return (
    <div className="space-y-1">
      <Label htmlFor="pasteCoords">Paste coordinates</Label>
      <div className="flex gap-2">
        <Input
          id="pasteCoords"
          placeholder="32.811015, -96.811998"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            const coords = parsePastedCoords(pasted)
            if (coords) {
              e.preventDefault()
              setDraft(`${coords.lat}, ${coords.lng}`)
              onChange(coords)
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!parsed}
          onClick={() => {
            if (parsed) {
              onChange(parsed)
            }
          }}
        >
          Use
        </Button>
      </div>
      {parsed ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Parsed {parsed.lat.toFixed(6)}, {parsed.lng.toFixed(6)} — press <span className="font-medium">Use</span> or it&apos;s already applied below.
        </p>
      ) : showFormatHint ? (
        <p className="text-xs text-destructive">
          Expected format: <span className="font-mono">lat, lng</span> (e.g. <span className="font-mono">39.7392, -104.9903</span>).
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Right-click any spot on Google Maps and click the coordinates at the top of the menu — then paste here.
        </p>
      )}
    </div>
  )
}

function PlacesSearch({
  apiKey,
  onChange,
}: {
  apiKey: string
  onChange: (coords: { lat: number; lng: number }) => void
}) {
  const places = useMemo(() => createGooglePlaces(apiKey), [apiKey])
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    let cancelled = false
    const handle = setTimeout(() => {
      setLoading(true)
      places
        .autocomplete(q)
        .then((res) => {
          if (!cancelled) setPredictions(res)
        })
        .catch(() => {
          if (!cancelled) setPredictions([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [places, query])

  const pick = async (prediction: PlacePrediction) => {
    setQuery(prediction.description)
    setPredictions([])
    try {
      const hits = await places.searchText(prediction.description)
      const first = hits[0]
      if (first) {
        onChange(first.location)
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-1">
      <Label htmlFor="placesSearch">Search a place</Label>
      <Input
        id="placesSearch"
        placeholder="Neighborhood, ZIP, landmark, address…"
        value={query}
        onChange={(e) => {
          const next = e.target.value
          setQuery(next)
          if (next.trim().length < 2) {
            setPredictions([])
            setLoading(false)
          }
        }}
        autoComplete="off"
      />
      {loading && predictions.length === 0 && (
        <p className="text-xs text-muted-foreground">Searching…</p>
      )}
      {predictions.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded-md border border-border bg-background text-xs">
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                className="block w-full px-2 py-1.5 text-left hover:bg-muted"
                onClick={() => {
                  void pick(p)
                }}
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        Pick a result to drop the center there. You can fine-tune on the map below.
      </p>
    </div>
  )
}

function MapClickPicker({
  apiKey,
  lat,
  lng,
  radiusMeters,
  onChange,
}: {
  apiKey: string
  lat: number
  lng: number
  radiusMeters: number
  onChange: (coords: { lat: number; lng: number }) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(
    null,
  )
  const circleRef = useRef<google.maps.Circle | null>(null)
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const dragListenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const onChangeRef = useRef(onChange)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    setStatus('loading')
    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !containerRef.current) return
        const center = {
          lat: Number.isFinite(lat) ? lat : 39.7392,
          lng: Number.isFinite(lng) ? lng : -104.9903,
        }
        const map = new google.maps.Map(containerRef.current, {
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

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: center,
          gmpDraggable: true,
        })
        markerRef.current = marker

        clickListenerRef.current = map.addListener(
          'click',
          (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return
            onChangeRef.current({
              lat: Number(e.latLng.lat().toFixed(6)),
              lng: Number(e.latLng.lng().toFixed(6)),
            })
          },
        )
        dragListenerRef.current = marker.addListener('dragend', () => {
          const pos = marker.position
          if (!pos) return
          const lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat
          const lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng
          onChangeRef.current({
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
          })
        })

        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      clickListenerRef.current?.remove()
      dragListenerRef.current?.remove()
      if (markerRef.current) {
        markerRef.current.map = null
        markerRef.current = null
      }
      if (circleRef.current) {
        circleRef.current.setMap(null)
        circleRef.current = null
      }
      mapRef.current = null
    }
  }, [apiKey, lat, lng])

  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    const pos = { lat, lng }
    marker.position = pos
    map.panTo(pos)
  }, [lat, lng, status])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (circleRef.current) {
      circleRef.current.setMap(null)
      circleRef.current = null
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
    if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) return
    circleRef.current = new google.maps.Circle({
      map,
      center: { lat, lng },
      radius: radiusMeters,
      strokeColor: '#1d4ed8',
      strokeOpacity: 0.6,
      strokeWeight: 2,
      fillColor: '#1d4ed8',
      fillOpacity: 0.08,
      clickable: false,
    })
  }, [lat, lng, radiusMeters, status])

  if (status === 'error') {
    return (
      <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Map couldn&apos;t load.</p>
        <p>
          Google rejected the key or the request. Re-check <span className="font-medium text-foreground">Step 3</span> — especially that you enabled Maps JavaScript API and added this site to your key&apos;s HTTP referrers.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Label>Pick on the map</Label>
      <div
        ref={containerRef}
        className={cn(
          'h-[240px] w-full overflow-hidden rounded-md border border-border bg-muted',
          status === 'loading' && 'animate-pulse',
        )}
        role="presentation"
      />
      <p className="text-xs text-muted-foreground">
        Click anywhere on the map to drop the center, or drag the marker. The blue circle shows your current radius.
      </p>
    </div>
  )
}
