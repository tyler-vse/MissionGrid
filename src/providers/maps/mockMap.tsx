import type {
  MapAreaDescriptor,
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

interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function AreaCircle({
  area,
  bounds,
  selected,
  onClick,
}: {
  area: MapAreaOverlay
  bounds: Bounds
  selected?: boolean
  onClick?: () => void
}) {
  const { minX, maxX, minY, maxY } = bounds
  if (!area.radiusMeters) return null
  const kmPerDegLng =
    111 * Math.cos(((area.center.lat * Math.PI) / 180) || 0)
  const radiusDegLat = area.radiusMeters / 1000 / 111
  const radiusDegLng = area.radiusMeters / 1000 / Math.max(20, kmPerDegLng)
  const widthPct = (radiusDegLng * 2) / (maxX - minX) * 100
  const heightPct = (radiusDegLat * 2) / (maxY - minY) * 100
  const leftPct = ((area.center.lng - minX) / (maxX - minX)) * 100
  const bottomPct = ((area.center.lat - minY) / (maxY - minY)) * 100

  return (
    <button
      type="button"
      aria-label="Zone"
      onClick={onClick}
      className={cn(
        'absolute rounded-full border-2',
        selected
          ? 'border-primary bg-primary/15'
          : 'border-primary/60 bg-primary/5',
      )}
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
  const {
    locations,
    center,
    selectedId,
    onSelectLocation,
    area,
    areas,
    selectedAreaId,
    onSelectArea,
    editMode,
    heightClassName,
  } = props
  const mappable = locations.filter(
    (l): l is typeof l & { lat: number; lng: number } =>
      l.lat != null && l.lng != null,
  )
  const xs = mappable.map((l) => l.lng)
  const ys = mappable.map((l) => l.lat)
  // Also include area centers so zones are visible even if there are no
  // mappable locations yet.
  if (areas) {
    for (const a of areas) {
      xs.push(a.center.lng)
      ys.push(a.center.lat)
    }
  } else if (area) {
    xs.push(area.center.lng)
    ys.push(area.center.lat)
  }
  const minX = Math.min(...xs, center.lng) - 0.01
  const maxX = Math.max(...xs, center.lng) + 0.01
  const minY = Math.min(...ys, center.lat) - 0.01
  const maxY = Math.max(...ys, center.lat) + 0.01

  const toPct = (lng: number, lat: number) => ({
    left: `${((lng - minX) / (maxX - minX)) * 100}%`,
    bottom: `${((lat - minY) / (maxY - minY)) * 100}%`,
  })

  const hasPolygonZone =
    areas?.some(
      (a) => (a.polygon?.coordinates?.[0]?.length ?? 0) > 2,
    ) ?? false
  const drawingOrEditing =
    editMode &&
    (editMode.kind === 'drawingPolygon' ||
      editMode.kind === 'drawingCircle' ||
      editMode.kind === 'editing')

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-xl border bg-gradient-to-br from-muted/60 via-muted/20 to-primary/5',
        heightClassName ?? 'aspect-[4/3]',
      )}
    >
      {area && !areas && (
        <AreaCircle area={area} bounds={{ minX, maxX, minY, maxY }} />
      )}
      {(areas ?? []).map((a: MapAreaDescriptor) => (
        <AreaCircle
          key={a.id}
          area={a}
          bounds={{ minX, maxX, minY, maxY }}
          selected={a.id === selectedAreaId}
          onClick={() => onSelectArea?.(a.id)}
        />
      ))}
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
      {(hasPolygonZone || drawingOrEditing) && (
        <p className="pointer-events-none absolute top-2 left-2 right-2 rounded-md bg-background/90 px-2 py-1 text-center text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
          Connect Google Maps to draw or edit zone shapes
        </p>
      )}
      <p className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-md bg-background/80 px-2 py-1 text-center text-[11px] font-medium text-muted-foreground backdrop-blur">
        Schematic map · connect Google Maps for live tiles
      </p>
    </div>
  )
}

export const mockMapProvider: MapProvider = {
  renderMap: (props) => <MockMapInner {...props} />,
}
