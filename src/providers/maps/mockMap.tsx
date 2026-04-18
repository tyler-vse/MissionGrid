import type { MapProvider, MapRenderProps } from '@/providers/maps/MapProvider'
import { cn } from '@/lib/utils'

function Pin({
  label,
  selected,
  onClick,
}: {
  label: string
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-sm transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground hover:bg-muted',
      )}
      title={label}
    >
      {label.slice(0, 1)}
    </button>
  )
}

function MockMapInner(props: MapRenderProps) {
  const { locations, center, selectedId, onSelectLocation } = props
  const xs = locations.map((l) => l.lng)
  const ys = locations.map((l) => l.lat)
  const minX = Math.min(...xs, center.lng) - 0.01
  const maxX = Math.max(...xs, center.lng) + 0.01
  const minY = Math.min(...ys, center.lat) - 0.01
  const maxY = Math.max(...ys, center.lat) + 0.01

  const toPct = (lng: number, lat: number) => ({
    left: `${((lng - minX) / (maxX - minX)) * 100}%`,
    bottom: `${((lat - minY) / (maxY - minY)) * 100}%`,
  })

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted/40">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-accent/15" />
      <div
        className="absolute h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-accent bg-accent shadow"
        style={{
          left: `${((center.lng - minX) / (maxX - minX)) * 100}%`,
          bottom: `${((center.lat - minY) / (maxY - minY)) * 100}%`,
        }}
        title="Center"
      />
      {locations.map((loc) => {
        const p = toPct(loc.lng, loc.lat)
        return (
          <div
            key={loc.id}
            className="absolute -translate-x-1/2 translate-y-1/2"
            style={{ left: p.left, bottom: p.bottom }}
          >
            <Pin
              label={loc.name}
              selected={loc.id === selectedId}
              onClick={() => onSelectLocation?.(loc.id)}
            />
          </div>
        )
      })}
      <p className="absolute bottom-2 left-2 right-2 rounded-md bg-background/80 px-2 py-1 text-center text-xs text-muted-foreground backdrop-blur">
        Schematic map (Google Maps provider in Phase 2)
      </p>
    </div>
  )
}

export const mockMapProvider: MapProvider = {
  renderMap: (props) => <MockMapInner {...props} />,
}
