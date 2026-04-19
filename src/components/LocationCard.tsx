import { MapPin, Navigation2 } from 'lucide-react'
import type * as React from 'react'
import { OpenStatusBadge } from '@/components/OpenStatusBadge'
import { StatusBadge } from '@/components/StatusBadge'
import type { Location } from '@/domain/models/location'
import {
  distanceFrom,
  formatDistanceMeters,
  type LatLng,
} from '@/lib/distance'
import { cn } from '@/lib/utils'

export interface LocationCardProps {
  location: Location
  /** Optional origin for distance display (e.g. shift start or service-area center). */
  origin?: LatLng | null
  /** Step number to show in ordered lists, e.g. route views. */
  stepNumber?: number
  /** Actions row rendered at the bottom of the card (buttons). */
  actions?: React.ReactNode
  /** Fires when the card body is tapped. */
  onSelect?: (location: Location) => void
  selected?: boolean
  className?: string
}

export function LocationCard({
  location,
  origin,
  stepNumber,
  actions,
  onSelect,
  selected,
  className,
}: LocationCardProps) {
  const distance = distanceFrom(origin, { lat: location.lat, lng: location.lng })

  const body = (
    <div className="flex items-start gap-3">
      {stepNumber !== undefined ? (
        <div
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
        >
          {stepNumber}
        </div>
      ) : (
        <div
          aria-hidden
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <MapPin className="h-4 w-4" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-base font-semibold leading-tight text-foreground">
            {location.name}
          </p>
          <StatusBadge status={location.status} className="shrink-0" />
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {location.address}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {distance !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
              <Navigation2 className="h-3 w-3" aria-hidden />
              {formatDistanceMeters(distance)}
            </span>
          )}
          <OpenStatusBadge hours={location.openHours} />
          {location.category && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 font-medium capitalize text-muted-foreground">
              {location.category}
            </span>
          )}
        </div>
      </div>
    </div>
  )

  const cardClasses = cn(
    'rounded-2xl border bg-card p-4 shadow-sm transition-colors',
    selected && 'border-primary ring-2 ring-primary/30',
    onSelect && 'cursor-pointer hover:border-primary/50',
    className,
  )

  return (
    <div className={cardClasses}>
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(location)}
          className="block w-full text-left"
        >
          {body}
        </button>
      ) : (
        body
      )}
      {actions && (
        <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">{actions}</div>
      )}
    </div>
  )
}
