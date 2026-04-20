import {
  Check,
  CircleDashed,
  MapPin,
  Pencil,
  Shapes,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useCreateServiceArea,
  useDeleteServiceArea,
  useServiceAreas,
  useUpdateServiceArea,
} from '@/data/useServiceAreas'
import { hasCoords, type Location } from '@/domain/models/location'
import type { GeoPolygon, ServiceArea } from '@/domain/models/serviceArea'
import { cn } from '@/lib/utils'
import { formatUnknownError } from '@/lib/errors'
import type {
  MapAreaDescriptor,
  MapAreaShape,
  MapEditMode,
} from '@/providers/maps/MapProvider'
import { useRegistry } from '@/providers/useRegistry'

interface Props {
  locations: Location[]
  selectedLocationId: string | null
  onSelectLocation: (id: string | null) => void
}

function computeCenter(
  polygon: GeoPolygon | null | undefined,
): { lat: number; lng: number } | null {
  const ring = polygon?.coordinates?.[0]
  if (!ring || ring.length === 0) return null
  let sumLat = 0
  let sumLng = 0
  let count = 0
  for (let i = 0; i < ring.length; i++) {
    const pt = ring[i]
    if (!pt) continue
    const [lng, lat] = pt
    if (typeof lng !== 'number' || typeof lat !== 'number') continue
    // Skip the closing duplicate vertex if present.
    if (
      i === ring.length - 1 &&
      ring[0] &&
      ring[0][0] === lng &&
      ring[0][1] === lat
    ) {
      continue
    }
    sumLat += lat
    sumLng += lng
    count += 1
  }
  if (count === 0) return null
  return { lat: sumLat / count, lng: sumLng / count }
}

function areaToDescriptor(a: ServiceArea): MapAreaDescriptor {
  return {
    id: a.id,
    name: a.name,
    center: { lat: a.centerLat, lng: a.centerLng },
    radiusMeters: a.radiusMeters,
    polygon: a.polygon ?? null,
  }
}

export function PlacesMapEditor({
  locations,
  selectedLocationId,
  onSelectLocation,
}: Props) {
  const registry = useRegistry()
  const zones = useServiceAreas()
  const createZone = useCreateServiceArea()
  const updateZone = useUpdateServiceArea()
  const deleteZone = useDeleteServiceArea()

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState<MapEditMode>({ kind: 'idle' })
  const [pendingDraw, setPendingDraw] = useState<MapAreaShape | null>(null)
  const [pendingName, setPendingName] = useState('')
  const [renameTarget, setRenameTarget] = useState<ServiceArea | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ServiceArea | null>(null)

  const selectedZone = useMemo(
    () => zones.find((z) => z.id === selectedAreaId) ?? null,
    [zones, selectedAreaId],
  )

  const descriptors = useMemo(
    () => zones.map(areaToDescriptor),
    [zones],
  )

  // Pending draw overlay — show the freshly drawn shape while the admin names it.
  const overlayDescriptors = useMemo(() => {
    if (!pendingDraw) return descriptors
    const center =
      pendingDraw.center ??
      computeCenter(pendingDraw.polygon ?? undefined) ??
      (descriptors[0]?.center ?? null)
    if (!center) return descriptors
    return [
      ...descriptors,
      {
        id: '__draft__',
        name: 'Pending zone',
        center,
        radiusMeters: pendingDraw.radiusMeters ?? undefined,
        polygon: pendingDraw.polygon ?? null,
      } satisfies MapAreaDescriptor,
    ]
  }, [descriptors, pendingDraw])

  // `hasCoords` rejects both nulls and the Null Island sentinel (0, 0) so a
  // single bad row can't pan the map into the Gulf of Guinea.
  const mappable = useMemo(
    () => locations.filter((l) => hasCoords(l)),
    [locations],
  )
  const mapCenter = useMemo(() => {
    if (selectedZone) {
      return { lat: selectedZone.centerLat, lng: selectedZone.centerLng }
    }
    if (zones[0]) {
      return { lat: zones[0].centerLat, lng: zones[0].centerLng }
    }
    if (mappable.length > 0) {
      const avgLat =
        mappable.reduce((acc, l) => acc + l.lat, 0) / mappable.length
      const avgLng =
        mappable.reduce((acc, l) => acc + l.lng, 0) / mappable.length
      return { lat: avgLat, lng: avgLng }
    }
    return { lat: 39.5, lng: -98.35 }
    // Re-evaluate when zones or mappable coordinates change (length is a
    // cheap proxy so we don't recenter on unrelated status edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, selectedZone?.id, mappable.length])

  // Debounced save while editing an existing zone.
  const pendingPatchRef = useRef<MapAreaShape | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleAreaChange = useCallback(
    (id: string, patch: MapAreaShape) => {
      if (editMode.kind !== 'editing' || editMode.areaId !== id) return
      pendingPatchRef.current = {
        ...(pendingPatchRef.current ?? {}),
        ...patch,
      }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const next = pendingPatchRef.current
        pendingPatchRef.current = null
        if (!next) return
        const body: Parameters<typeof updateZone.mutate>[0]['patch'] = {}
        if (next.polygon !== undefined) body.polygon = next.polygon
        if (next.center) {
          body.centerLat = next.center.lat
          body.centerLng = next.center.lng
        }
        if (next.radiusMeters !== undefined) {
          body.radiusMeters = next.radiusMeters
        }
        updateZone.mutate(
          { id, patch: body },
          {
            onError: (e) => toast.error(formatUnknownError(e)),
          },
        )
      }, 600)
    },
    [editMode, updateZone],
  )

  const handleAreaDrawn = useCallback((shape: MapAreaShape) => {
    setPendingDraw(shape)
    setPendingName('')
    setEditMode({ kind: 'idle' })
  }, [])

  const confirmCreateZone = async () => {
    if (!pendingDraw) return
    const name = pendingName.trim()
    if (!name) {
      toast.error('Give the zone a name')
      return
    }
    const center =
      pendingDraw.center ??
      computeCenter(pendingDraw.polygon ?? undefined) ??
      null
    if (!center) {
      toast.error('Could not compute a center for the zone')
      return
    }
    try {
      await createZone.mutateAsync({
        name,
        centerLat: center.lat,
        centerLng: center.lng,
        radiusMeters: pendingDraw.radiusMeters ?? null,
        polygon: pendingDraw.polygon ?? null,
      })
      toast.success('Zone created')
      setPendingDraw(null)
      setPendingName('')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const cancelPendingDraw = () => {
    setPendingDraw(null)
    setPendingName('')
  }

  const beginEdit = () => {
    if (!selectedZone) return
    setEditMode({ kind: 'editing', areaId: selectedZone.id })
  }

  const endEdit = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const pending = pendingPatchRef.current
    pendingPatchRef.current = null
    if (pending && editMode.kind === 'editing') {
      const id = editMode.areaId
      const body: Parameters<typeof updateZone.mutate>[0]['patch'] = {}
      if (pending.polygon !== undefined) body.polygon = pending.polygon
      if (pending.center) {
        body.centerLat = pending.center.lat
        body.centerLng = pending.center.lng
      }
      if (pending.radiusMeters !== undefined) {
        body.radiusMeters = pending.radiusMeters
      }
      updateZone.mutate(
        { id, patch: body },
        {
          onError: (e) => toast.error(formatUnknownError(e)),
        },
      )
    }
    setEditMode({ kind: 'idle' })
  }, [editMode, updateZone])

  const confirmRename = async () => {
    if (!renameTarget) return
    const name = renameValue.trim()
    if (!name) {
      toast.error('Zone name is required')
      return
    }
    try {
      await updateZone.mutateAsync({
        id: renameTarget.id,
        patch: { name },
      })
      toast.success('Zone renamed')
      setRenameTarget(null)
      setRenameValue('')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteZone.mutateAsync(deleteTarget.id)
      toast.success('Zone deleted')
      if (selectedAreaId === deleteTarget.id) setSelectedAreaId(null)
      setDeleteTarget(null)
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const zoneShapeLabel = (zone: ServiceArea): string => {
    const hasPolygon = (zone.polygon?.coordinates?.[0]?.length ?? 0) > 2
    if (hasPolygon) return 'Polygon'
    if (zone.radiusMeters && zone.radiusMeters > 0) return 'Circle'
    return 'Point'
  }

  const isDrawing =
    editMode.kind === 'drawingPolygon' || editMode.kind === 'drawingCircle'
  const isEditing = editMode.kind === 'editing'

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          New zone
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={isDrawing || isEditing || Boolean(pendingDraw)}
          onClick={() => setEditMode({ kind: 'drawingPolygon' })}
          className="gap-1.5"
        >
          <Shapes className="h-4 w-4" />
          Polygon
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isDrawing || isEditing || Boolean(pendingDraw)}
          onClick={() => setEditMode({ kind: 'drawingCircle' })}
          className="gap-1.5"
        >
          <CircleDashed className="h-4 w-4" />
          Circle
        </Button>

        {isDrawing && (
          <>
            <Badge variant="outline" className="gap-1">
              {editMode.kind === 'drawingPolygon'
                ? 'Click points on the map, double-click to finish'
                : 'Click + drag to drop a circle'}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditMode({ kind: 'idle' })}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </>
        )}

        {selectedZone && !isDrawing && !pendingDraw && (
          <>
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs font-medium">
              <MapPin className="h-3.5 w-3.5" />
              {selectedZone.name}
              <Badge variant="muted" className="ml-1">
                {zoneShapeLabel(selectedZone)}
              </Badge>
            </span>
            {isEditing ? (
              <Button
                size="sm"
                variant="default"
                onClick={endEdit}
                className="gap-1.5"
              >
                <Check className="h-4 w-4" />
                Done
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={beginEdit}
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Edit shape
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRenameTarget(selectedZone)
                setRenameValue(selectedZone.name)
              }}
              className="gap-1.5"
            >
              Rename
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteTarget(selectedZone)}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        )}

        {!selectedZone && !isDrawing && !pendingDraw && zones.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Click a zone overlay to edit it
          </span>
        )}
      </div>

      <div className="relative">
        {/* eslint-disable-next-line react-hooks/refs -- the closures below only read refs inside event handlers, never during render */}
        {registry.map.renderMap({
          locations: mappable,
          center: mapCenter,
          selectedId: selectedLocationId,
          onSelectLocation: (id) => onSelectLocation(id),
          areas: overlayDescriptors,
          selectedAreaId,
          onSelectArea: (id) => {
            if (isDrawing || pendingDraw) return
            setSelectedAreaId(id)
            if (editMode.kind === 'editing' && editMode.areaId !== id) {
              endEdit()
            }
          },
          editMode,
          onAreaChange: handleAreaChange,
          onAreaDrawn: handleAreaDrawn,
          heightClassName: 'h-[50vh]',
        })}
      </div>

      {zones.length === 0 && !pendingDraw && (
        <p className="text-xs text-muted-foreground">
          No zones yet. Use{' '}
          <span className="font-semibold">New zone</span> to draw a polygon or
          drop a circle on the map.
        </p>
      )}

      <Dialog
        open={Boolean(pendingDraw)}
        onOpenChange={(open) => {
          if (!open) cancelPendingDraw()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name this zone</DialogTitle>
            <DialogDescription>
              Pick something volunteers and admins will recognize, like
              &ldquo;North Side&rdquo; or &ldquo;Zone 3&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="zone-name">Name</Label>
            <Input
              id="zone-name"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              placeholder="e.g. North side"
              autoFocus
            />
            {pendingDraw && (
              <p className="mt-2 text-xs text-muted-foreground">
                Shape:{' '}
                {(pendingDraw.polygon?.coordinates?.[0]?.length ?? 0) > 2
                  ? 'Polygon'
                  : pendingDraw.radiusMeters
                    ? `Circle · ${Math.round(pendingDraw.radiusMeters)}m radius`
                    : 'Point'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={cancelPendingDraw}>
              Cancel
            </Button>
            <Button
              onClick={() => void confirmCreateZone()}
              disabled={createZone.isPending}
            >
              {createZone.isPending ? 'Saving…' : 'Create zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRenameTarget(null)
            setRenameValue('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename zone</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="rename-zone-name">Name</Label>
            <Input
              id="rename-zone-name"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setRenameTarget(null)
                setRenameValue('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void confirmRename()}
              disabled={updateZone.isPending}
            >
              {updateZone.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              Any campaigns linked to this zone will lose the link, and places
              inside it will keep their coordinates but no longer be grouped
              under a zone. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleteZone.isPending}
              className={cn('gap-1.5')}
            >
              <Trash2 className="h-4 w-4" />
              {deleteZone.isPending ? 'Deleting…' : 'Delete zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
