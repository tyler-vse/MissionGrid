import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useImportLocationsFromCsv } from '@/data/useImportLocationsFromCsv'
import {
  parseLocationCsvPreview,
  previewRowsToImportable,
  type CsvPreviewRow,
} from '@/lib/csv'
import { geocodeBatch } from '@/lib/geocodeBatch'
import { useRegistry } from '@/providers/useRegistry'

function rowStatus(r: CsvPreviewRow): 'error' | 'warning' | 'ok' {
  if (r.issues.some((i) => i.severity === 'error')) return 'error'
  if (r.isDuplicate || r.issues.length) return 'warning'
  if (!r.data || r.data.lat === undefined) return 'warning'
  return 'ok'
}

export function CsvImport({
  onDone,
  idPrefix = 'csv',
}: {
  onDone?: () => void
  /** Prefix for form ids when multiple instances exist */
  idPrefix?: string
}) {
  const registry = useRegistry()
  const importMutation = useImportLocationsFromCsv()
  const [tab, setTab] = useState<'paste' | 'file'>('paste')
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
    if (rows.length === 0) toast.message('No data rows found')
  }, [])

  const onFile = (file: File) => {
    void file.text().then((t) => {
      setText(t)
      runPreview(t)
    })
  }

  const geocodeMissing = async () => {
    const items = preview
      .map((r, index) => ({ r, index }))
      .filter(
        ({ r }) =>
          r.data &&
          (r.data.lat === undefined || r.data.lng === undefined) &&
          !r.issues.some((i) => i.severity === 'error'),
      )
      .map(({ r, index }) => ({
        index,
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
      toast.message('No rows need geocoding')
      return
    }

    setGeoProgress(`Geocoding 0 / ${items.length}…`)
    const results = await geocodeBatch(registry.geocoding, items, {
      delayMs: 120,
      onProgress: (done, total) =>
        setGeoProgress(`Geocoding ${done} / ${total}…`),
    })

    setPreview((prev) => {
      const next = [...prev]
      for (const res of results) {
        const row = next[res.index]
        if (!row?.data) continue
        if (res.ok) {
          next[res.index] = {
            ...row,
            data: {
              ...row.data,
              lat: res.lat,
              lng: res.lng,
            },
            issues: row.issues.filter(
              (i) => !i.message.includes('Missing coordinates'),
            ),
          }
        } else {
          next[res.index] = {
            ...row,
            issues: [
              ...row.issues.filter((i) => i.severity !== 'error'),
              { severity: 'error' as const, message: res.message },
            ],
          }
        }
      }
      return next
    })
    setGeoProgress(null)
    toast.success('Geocoding finished')
  }

  const importable = previewRowsToImportable(preview, { includeDuplicates })

  const doImport = () => {
    if (importable.length === 0) {
      toast.error('No valid rows to import')
      return
    }
    importMutation.mutate(importable, {
      onSuccess: (r) => {
        toast.success(`Imported ${r.imported} stops`)
        setText('')
        setPreview([])
        onDone?.()
      },
      onError: (e) => toast.error(String(e)),
    })
  }

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paste">Paste CSV</TabsTrigger>
          <TabsTrigger value="file">Upload file</TabsTrigger>
        </TabsList>
        <TabsContent value="paste" className="space-y-2 pt-2">
          <Label htmlFor={`${idPrefix}-csv`}>CSV text</Label>
          <Textarea
            id={`${idPrefix}-csv`}
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`name,address,lat,lng,city,state,postal_code,notes
Example Market,"100 Main St",39.74,-104.99,Denver,CO,80202,`}
          />
          <Button type="button" variant="secondary" onClick={() => runPreview(text)}>
            Parse & preview
          </Button>
        </TabsContent>
        <TabsContent value="file" className="space-y-2 pt-2">
          <Label htmlFor={`${idPrefix}-file`}>Choose .csv</Label>
          <Input
            id={`${idPrefix}-file`}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onFile(f)
            }}
          />
        </TabsContent>
      </Tabs>

      {preview.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void geocodeMissing()}
              disabled={Boolean(geoProgress)}
            >
              Geocode missing coordinates
            </Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={includeDuplicates}
                onChange={(e) => setIncludeDuplicates(e.target.checked)}
              />
              Include duplicate rows
            </label>
          </div>
          {geoProgress && (
            <p className="text-xs text-muted-foreground">{geoProgress}</p>
          )}
          <div className="max-h-48 overflow-auto rounded-md border text-xs">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Issues</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={r.rowNumber} className="border-t">
                    <td className="p-2">{r.rowNumber}</td>
                    <td className="p-2 capitalize">{rowStatus(r)}</td>
                    <td className="p-2">{r.data?.name ?? '—'}</td>
                    <td className="p-2 text-muted-foreground">
                      {r.isDuplicate ? 'dup ' : ''}
                      {r.issues.map((i) => i.message).join('; ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            onClick={doImport}
            disabled={importMutation.isPending || importable.length === 0}
          >
            Import {importable.length} valid row{importable.length === 1 ? '' : 's'}
          </Button>
        </div>
      )}
    </div>
  )
}
