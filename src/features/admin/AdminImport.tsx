import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileUp,
  MapPin,
  Upload,
  XCircle,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineAlert } from '@/components/ui/inline-alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionHeader } from '@/components/ui/section-header'
import { Textarea } from '@/components/ui/textarea'
import { useImportLocationsFromCsv } from '@/data/useImportLocationsFromCsv'
import {
  parseLocationCsvPreview,
  previewRowsToImportable,
  type CsvPreviewRow,
} from '@/lib/csv'
import { geocodeBatch } from '@/lib/geocodeBatch'
import { useRegistry } from '@/providers/useRegistry'
import { cn } from '@/lib/utils'

type Step = 'upload' | 'review' | 'geocode' | 'import'

const steps: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'review', label: 'Review' },
  { id: 'geocode', label: 'Geocode' },
  { id: 'import', label: 'Import' },
]

function rowStatus(r: CsvPreviewRow): 'error' | 'duplicate' | 'warning' | 'ok' {
  if (r.issues.some((i) => i.severity === 'error')) return 'error'
  if (r.isDuplicate) return 'duplicate'
  if (r.data && (r.data.lat === undefined || r.data.lng === undefined)) {
    return 'warning'
  }
  if (r.issues.length) return 'warning'
  return 'ok'
}

export function AdminImport() {
  const registry = useRegistry()
  const importMutation = useImportLocationsFromCsv()

  const [step, setStep] = useState<Step>('upload')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<CsvPreviewRow[]>([])
  const [geoProgress, setGeoProgress] = useState<string | null>(null)
  const [includeDuplicates, setIncludeDuplicates] = useState(false)

  const runPreview = useCallback((raw: string) => {
    const { rows, errors } = parseLocationCsvPreview(raw)
    if (errors.length) {
      toast.error(errors[0] ?? 'Parse error')
      return
    }
    setPreview(rows)
    if (rows.length === 0) {
      toast.message('No data rows found')
      return
    }
    setStep('review')
  }, [])

  const onFile = (file: File) => {
    void file.text().then((t) => {
      setText(t)
      runPreview(t)
    })
  }

  const grouped = useMemo(() => {
    const buckets: Record<
      'error' | 'duplicate' | 'warning' | 'ok',
      CsvPreviewRow[]
    > = {
      error: [],
      duplicate: [],
      warning: [],
      ok: [],
    }
    for (const r of preview) buckets[rowStatus(r)].push(r)
    return buckets
  }, [preview])

  const needsGeocoding = grouped.warning.filter(
    (r) => r.data && (r.data.lat === undefined || r.data.lng === undefined),
  )

  const importable = previewRowsToImportable(preview, { includeDuplicates })

  /**
   * Geocode any preview rows that lack coordinates. Returns the fresh preview
   * array so the caller can use it immediately (avoids React state-flush
   * staleness when chained from `doImport`). Pass `silent: true` when running
   * as part of the Import button flow so we skip the redundant success toast.
   */
  const geocodeMissing = async (
    options?: { silent?: boolean },
  ): Promise<CsvPreviewRow[]> => {
    const items = needsGeocoding
      .map((r) => ({
        index: preview.indexOf(r),
        query: [
          r.data!.address,
          r.data!.city,
          r.data!.state,
          r.data!.postalCode,
        ]
          .filter(Boolean)
          .join(', '),
      }))
      .filter((x) => x.query.trim().length > 2)

    if (items.length === 0) {
      if (!options?.silent) toast.message('No rows need geocoding')
      return preview
    }

    setGeoProgress(`Geocoding 0 / ${items.length}…`)
    const results = await geocodeBatch(registry.geocoding, items, {
      delayMs: 120,
      onProgress: (done, total) =>
        setGeoProgress(`Geocoding ${done} / ${total}…`),
    })

    const next = [...preview]
    let failed = 0
    for (const res of results) {
      const row = next[res.index]
      if (!row?.data) continue
      if (res.ok) {
        next[res.index] = {
          ...row,
          data: { ...row.data, lat: res.lat, lng: res.lng },
          issues: row.issues.filter(
            (i) => !/coordinates|address-only|null island/i.test(i.message),
          ),
        }
      } else {
        failed += 1
        next[res.index] = {
          ...row,
          issues: [
            ...row.issues.filter((i) => i.severity !== 'error'),
            { severity: 'warning' as const, message: `Geocode failed: ${res.message}` },
          ],
        }
      }
    }
    setPreview(next)
    setGeoProgress(null)
    if (!options?.silent) {
      if (failed > 0) {
        toast.warning(
          `Geocoded ${results.length - failed} of ${results.length} rows; ${failed} still missing coords`,
        )
      } else {
        toast.success('Geocoding finished')
      }
    }
    return next
  }

  const removeDuplicate = (rowNumber: number) => {
    setPreview((prev) => prev.filter((r) => r.rowNumber !== rowNumber))
  }

  const removeError = (rowNumber: number) => {
    setPreview((prev) => prev.filter((r) => r.rowNumber !== rowNumber))
  }

  const doImport = async () => {
    // Auto-geocode anything still missing coords so users can't accidentally
    // ship an address-only batch (or worse, a stack of (0, 0) rows from a
    // blank-lat/lng CSV). The manual Geocode button above stays as a preview
    // action for users who want to review results first.
    let rowsSource = preview
    if (needsGeocoding.length > 0) {
      rowsSource = await geocodeMissing({ silent: true })
    }

    const rows = previewRowsToImportable(rowsSource, { includeDuplicates })
    if (rows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    const withoutCoords = rows.filter((r) => r.lat == null || r.lng == null).length

    importMutation.mutate(rows, {
      onSuccess: (r) => {
        const msg = `Imported ${r.imported} place${r.imported === 1 ? '' : 's'}`
        if (withoutCoords > 0) {
          toast.success(`${msg} (${withoutCoords} without coords — geocode later)`)
        } else {
          toast.success(msg)
        }
        setText('')
        setPreview([])
        setStep('upload')
      },
      onError: (e) => toast.error(String(e)),
    })
  }

  const startOver = () => {
    setPreview([])
    setText('')
    setStep('upload')
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Import places"
        description="Load a CSV, review, geocode, then import into your organization."
      />

      {/* Stepper */}
      <ol className="flex items-center gap-1 text-xs font-semibold">
        {steps.map((s, i) => {
          const active = step === s.id
          const reached =
            steps.findIndex((x) => x.id === step) >=
            steps.findIndex((x) => x.id === s.id)
          return (
            <li key={s.id} className="flex flex-1 items-center">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs',
                  reached
                    ? active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border bg-background text-muted-foreground',
                )}
                aria-current={active ? 'step' : undefined}
              >
                {i + 1}
              </div>
              <span
                className={cn(
                  'ml-2 truncate',
                  active ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 rounded',
                    reached ? 'bg-primary/40' : 'bg-border',
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>

      {step === 'upload' && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Headers: name, address (optional lat, lng, city, state, postal_code,
            category, notes). Coordinates are optional — missing rows still
            import and can be geocoded later or stay address-only.
          </p>
          <div>
            <Label htmlFor="csv-file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload file
            </Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="mt-2"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
              }}
            />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or paste</span>
            </div>
          </div>
          <div>
            <Label htmlFor="csv-text">CSV text</Label>
            <Textarea
              id="csv-text"
              rows={8}
              className="mt-2 font-mono text-xs"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`name,address,lat,lng,city,state,postal_code,notes
Example Market,"100 Main St",39.74,-104.99,Denver,CO,80202,`}
            />
            <div className="mt-2 flex justify-end">
              <Button onClick={() => runPreview(text)} disabled={!text.trim()}>
                <FileUp className="h-4 w-4" />
                Parse & preview
              </Button>
            </div>
          </div>
        </section>
      )}

      {step !== 'upload' && preview.length > 0 && (
        <>
          {/* Group summary */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <GroupStat
              icon={CheckCircle2}
              label="Ready"
              count={grouped.ok.length}
              tone="success"
            />
            <GroupStat
              icon={AlertTriangle}
              label="Warnings"
              count={grouped.warning.length}
              tone="warning"
            />
            <GroupStat
              icon={Copy}
              label="Duplicates"
              count={grouped.duplicate.length}
              tone="info"
            />
            <GroupStat
              icon={XCircle}
              label="Errors"
              count={grouped.error.length}
              tone="destructive"
            />
          </div>

          {grouped.error.length > 0 && (
            <GroupSection
              title="Errors"
              description="Fix or remove before importing."
              tone="destructive"
              rows={grouped.error}
              onRemove={removeError}
            />
          )}

          {grouped.duplicate.length > 0 && (
            <GroupSection
              title="Duplicates"
              description="Same name + address + ZIP as another row."
              tone="info"
              rows={grouped.duplicate}
              onRemove={removeDuplicate}
              trailing={
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={includeDuplicates}
                    onChange={(e) => setIncludeDuplicates(e.target.checked)}
                  />
                  Keep duplicates on import
                </label>
              }
            />
          )}

          {grouped.warning.length > 0 && (
            <GroupSection
              title="Warnings"
              description="Mostly missing coordinates. Geocode to resolve most of these."
              tone="warning"
              rows={grouped.warning}
              onRemove={(n) =>
                setPreview((prev) => prev.filter((r) => r.rowNumber !== n))
              }
              trailing={
                needsGeocoding.length > 0 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void geocodeMissing()}
                    disabled={Boolean(geoProgress)}
                  >
                    <MapPin className="h-4 w-4" />
                    {geoProgress ?? `Geocode ${needsGeocoding.length}`}
                  </Button>
                ) : null
              }
            />
          )}

          {grouped.ok.length > 0 && (
            <GroupSection
              title="Ready"
              description="Validated rows ready to import."
              tone="success"
              rows={grouped.ok.slice(0, 10)}
              hiddenCount={Math.max(0, grouped.ok.length - 10)}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-sm">
              <span className="font-semibold">{importable.length}</span>{' '}
              place{importable.length === 1 ? '' : 's'} will be imported.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={startOver}>
                Start over
              </Button>
              <Button
                onClick={() => void doImport()}
                disabled={
                  importMutation.isPending || importable.length === 0
                }
              >
                {importMutation.isPending
                  ? 'Importing…'
                  : `Import ${importable.length}`}
              </Button>
            </div>
          </div>
        </>
      )}

      {step !== 'upload' && preview.length === 0 && (
        <EmptyState
          icon={FileUp}
          title="No preview yet"
          description="Upload or paste CSV on the previous step."
          action={
            <Button variant="secondary" onClick={() => setStep('upload')}>
              Go back
            </Button>
          }
        />
      )}

      {geoProgress && (
        <InlineAlert tone="info" title="Geocoding in progress">
          {geoProgress}
        </InlineAlert>
      )}
    </div>
  )
}

function GroupStat({
  icon: Icon,
  label,
  count,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  tone: 'success' | 'warning' | 'destructive' | 'info'
}) {
  const tones = {
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    info: 'bg-info/10 text-info',
  }
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 shadow-sm',
        tones[tone],
      )}
    >
      <Icon className="h-5 w-5" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold tabular-nums">{count}</p>
      </div>
    </div>
  )
}

function GroupSection({
  title,
  description,
  tone,
  rows,
  onRemove,
  trailing,
  hiddenCount = 0,
}: {
  title: string
  description: string
  tone: 'success' | 'warning' | 'destructive' | 'info'
  rows: CsvPreviewRow[]
  onRemove?: (rowNumber: number) => void
  trailing?: React.ReactNode
  hiddenCount?: number
}) {
  const tones = {
    success: 'border-success/30',
    warning: 'border-warning/30',
    destructive: 'border-destructive/30',
    info: 'border-info/30',
  }
  return (
    <section
      className={cn('rounded-2xl border bg-card p-5 shadow-sm', tones[tone])}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {trailing}
      </div>
      <ul className="divide-y text-sm">
        {rows.map((r) => (
          <li
            key={r.rowNumber}
            className="flex items-start justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                <span className="mr-2 text-xs text-muted-foreground">
                  Row {r.rowNumber}
                </span>
                {r.data?.name ?? 'Unnamed'}
              </p>
              {r.data?.address && (
                <p className="truncate text-xs text-muted-foreground">
                  {r.data.address}
                </p>
              )}
              {r.issues.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.issues.map((i) => i.message).join('; ')}
                </p>
              )}
            </div>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(r.rowNumber)}
                aria-label={`Remove row ${r.rowNumber}`}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          + {hiddenCount} more not shown
        </p>
      )}
    </section>
  )
}
