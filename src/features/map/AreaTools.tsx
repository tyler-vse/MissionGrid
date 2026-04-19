import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { GeoPolygon } from '@/domain/models/serviceArea'
import { useServiceAreas } from '@/data/useServiceAreas'
import { useRegistry } from '@/providers/useRegistry'
import { useAreaFilterStore } from '@/store/areaFilterStore'

export function AreaTools() {
  const registry = useRegistry()
  const serviceAreas = useServiceAreas()
  const defaultCenter = serviceAreas[0]
  const searchText = useAreaFilterStore((s) => s.searchText)
  const setSearchText = useAreaFilterStore((s) => s.setSearchText)
  const radiusMeters = useAreaFilterStore((s) => s.radiusMeters)
  const setRadiusFilter = useAreaFilterStore((s) => s.setRadiusFilter)
  const polygon = useAreaFilterStore((s) => s.polygon)
  const setPolygon = useAreaFilterStore((s) => s.setPolygon)
  const reset = useAreaFilterStore((s) => s.reset)

  const [placeQ, setPlaceQ] = useState('')
  const [suggestions, setSuggestions] = useState<
    { placeId: string; description: string }[]
  >([])
  const [polyDraft, setPolyDraft] = useState('')

  const center = useMemo(
    () =>
      defaultCenter
        ? { lat: defaultCenter.centerLat, lng: defaultCenter.centerLng }
        : { lat: 39.7392, lng: -104.9903 },
    [defaultCenter],
  )

  const onPlacesInput = (v: string) => {
    setPlaceQ(v)
    if (v.trim().length < 2) {
      setSuggestions([])
      return
    }
    void registry.places.autocomplete(v).then(setSuggestions).catch(() => {
      setSuggestions([])
    })
  }

  const applyPolygonJson = () => {
    try {
      const parsed = JSON.parse(polyDraft) as GeoPolygon
      if (parsed.type !== 'Polygon' || !Array.isArray(parsed.coordinates)) {
        throw new Error('Expected GeoJSON Polygon')
      }
      setPolygon(parsed)
    } catch {
      setPolygon(null)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Area tools</p>
        <Button type="button" variant="ghost" size="sm" onClick={reset}>
          Clear
        </Button>
      </div>

      <div>
        <Label htmlFor="area-search">Filter list / map</Label>
        <Input
          id="area-search"
          placeholder="Name, address, city…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="place-ac">Search area (Places)</Label>
        <Input
          id="place-ac"
          placeholder="Neighborhood, ZIP, landmark…"
          value={placeQ}
          onChange={(e) => onPlacesInput(e.target.value)}
        />
        {suggestions.length > 0 && (
          <ul className="mt-1 max-h-28 overflow-auto rounded border bg-background text-xs">
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  className="block w-full px-2 py-1 text-left hover:bg-muted"
                  onClick={() => {
                    setPlaceQ(s.description)
                    setSuggestions([])
                    void registry.places
                      .searchText(s.description)
                      .then((hits) => {
                        const h = hits[0]
                        if (h) {
                          setRadiusFilter(h.location, 1500)
                        }
                      })
                      .catch(() => {})
                  }}
                >
                  {s.description}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Picks the first match and sets a 1.5km radius around it.
        </p>
      </div>

      <div>
        <Label htmlFor="radius">Radius filter (meters from service area center)</Label>
        <div className="flex items-center gap-2">
          <input
            id="radius"
            type="range"
            min={0}
            max={20000}
            step={100}
            value={radiusMeters ?? 0}
            onChange={(e) => {
              const v = Number(e.target.value)
              setRadiusFilter(v > 0 ? center : null, v > 0 ? v : null)
            }}
            className="flex-1"
          />
          <span className="w-14 tabular-nums text-xs text-muted-foreground">
            {radiusMeters ?? 0}
          </span>
        </div>
      </div>

      <div>
        <Label htmlFor="poly">Service polygon (GeoJSON, advanced)</Label>
        <textarea
          id="poly"
          className="mt-1 min-h-[72px] w-full rounded-md border bg-background px-2 py-1 font-mono text-xs"
          placeholder='{"type":"Polygon","coordinates":[[[-104.99,39.74],...]]}'
          value={polyDraft}
          onChange={(e) => setPolyDraft(e.target.value)}
        />
        <div className="mt-1 flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={applyPolygonJson}>
            Apply polygon
          </Button>
          {polygon && (
            <Button type="button" size="sm" variant="outline" onClick={() => setPolygon(null)}>
              Remove polygon
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
