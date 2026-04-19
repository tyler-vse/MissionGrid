import type {
  MapAreaOverlay,
  MapProvider,
  MapRenderProps,
} from '@/providers/maps/MapProvider'
import type { ActivityStatus } from '@/domain/models/activityStatus'
import { cn } from '@/lib/utils'

const statusColor: Record<ActivityStatus, string> = {
  available: 'bg-primary border-primary text-primary-foreground',
  claimed: 'bg-info border-info text-info-foreground',
  completed: 'bg-success border-success text-success-foreground',
  skipped: 'bg-muted border-border text-muted-foreground',
  pending_review: 'bg-warning border-warning text-warning-foreground',
  no_go: 'bg-destructive border-destructive text-destructive-foreground',
}

function Pin({
  label,
  status,
  selected,
  onClick,
}: {
  label: string
  status: ActivityStatus
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-md transition-transform',
        statusColor[status],
        selected && 'scale-125 ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
      title={label}
    >
      {label.slice(0, 1)}
    </button>
  )
}

function AreaOverlay({
  area,
  bounds,
}: {
  area: MapAreaOverlay
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
}) {
  const { minX, maxX, minY, maxY } = bounds
  if (!area.radiusMeters) return null
  // Approximate: 1 degree lat ≈ 111km; draw as a rough ellipse.
  const kmPerDegLng =
    111 * Math.cos(((area.center.lat * Math.PI) / 180) || 0)
  const radiusDegLat = area.radiusMeters / 1000 / 111
  const radiusDegLng = area.radiusMeters / 1000 / Math.max(20, kmPerDegLng)
  const widthPct = (radiusDegLng * 2) / (maxX - minX) * 100
  const heightPct = (radiusDegLat * 2) / (maxY - minY) * 100
  const leftPct = ((area.center.lng - minX) / (maxX - minX)) * 100
  const bottomPct = ((area.center.lat - minY) / (maxY - minY)) * 100

  return (
    <div
      aria-hidden
      className="absolute rounded-full border-2 border-primary/60 bg-primary/5"
      style={{
        width: `${widthPct}%`,
        height: `${heightPct}%`,
        left: `calc(${leftPct}% - ${widthPct / 2}%)`,
        bottom: `calc(${bottomPct}% - ${heightPct / 2}%)`,
      }}
    />
  )
}

function MockMapInner(props: MapRenderProps) {
  const { locations, center, selectedId, onSelectLocation, area, heightClassName } = props
  const mappable = locations.filter(
    (l): l is typeof l & { lat: number; lng: number } =>
      l.lat != null && l.lng != null,
  )
  const xs = mappable.map((l) => l.lng)
  const ys = mappable.map((l) => l.lat)
  const minX = Math.min(...xs, center.lng) - 0.01
  const maxX = Math.max(...xs, center.lng) + 0.01
  const minY = Math.min(...ys, center.lat) - 0.01
  const maxY = Math.max(...ys, center.lat) + 0.01

  const toPct = (lng: number, lat: number) => ({
    left: `${((lng - minX) / (maxX - minX)) * 100}%`,
    bottom: `${((lat - minY) / (maxY - minY)) * 100}%`,
  })

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl border bg-gradient-to-br from-muted/60 via-muted/20 to-primary/5',
        heightClassName ?? 'aspect-[4/3]',
      )}
    >
      {area && (
        <AreaOverlay area={area} bounds={{ minX, maxX, minY, maxY }} />
      )}
      <div
        className="absolute h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-foreground bg-background shadow"
        style={{
          left: `${((center.lng - minX) / (maxX - minX)) * 100}%`,
          bottom: `${((center.lat - minY) / (maxY - minY)) * 100}%`,
        }}
        title="Center"
      />
      {mappable.map((loc) => {
        const p = toPct(loc.lng, loc.lat)
        return (
          <div
            key={loc.id}
            className="absolute -translate-x-1/2 translate-y-1/2"
            style={{ left: p.left, bottom: p.bottom }}
          >
            <Pin
              label={loc.name}
              status={loc.status}
              selected={loc.id === selectedId}
              onClick={() => onSelectLocation?.(loc.id)}
            />
          </div>
        )
      })}
      <p className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-md bg-background/80 px-2 py-1 text-center text-[11px] font-medium text-muted-foreground backdrop-blur">
        Schematic map · connect Google Maps for live tiles
      </p>
    </div>
  )
}

export const mockMapProvider: MapProvider = {
  renderMap: (props) => <MockMapInner {...props} />,
}
