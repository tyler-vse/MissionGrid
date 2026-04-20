import Papa from 'papaparse'
import { z } from 'zod'

// Canonical row shape for CSV imports. Coordinates are optional because many
// lists we receive are address-only and can be imported without a geocode.
//
// IMPORTANT: `z.coerce.number()` on an empty string produces `0` (because
// `Number('') === 0`), which would silently turn blank lat/lng CSV cells into
// literal `(0, 0)` coordinates. Collapse empty/whitespace/null to `undefined`
// before coercion so those rows correctly fall into the "needs geocoding"
// bucket instead of getting pinned to Null Island.
const coord = z
  .preprocess((v) => {
    if (v === undefined || v === null) return undefined
    if (typeof v === 'string' && v.trim() === '') return undefined
    return v
  }, z.coerce.number().finite())
  .optional()

const rowSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  lat: coord,
  lng: coord,
  category: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  notes: z.string().optional(),
})

export type CsvLocationRow = z.infer<typeof rowSchema>

// Preview uses the same schema — no "both-or-neither" requirement. Callers can
// still warn on a single missing side if they want to flag it to the user.
const relaxedRowSchema = rowSchema

export type CsvPreviewData = z.infer<typeof relaxedRowSchema>

export type CsvRowIssueSeverity = 'warning' | 'error'

export interface CsvRowIssue {
  severity: CsvRowIssueSeverity
  message: string
}

export interface CsvPreviewRow {
  /** Spreadsheet row number (1-based, includes header as row 1) */
  rowNumber: number
  raw: Record<string, string>
  data: CsvPreviewData | null
  issues: CsvRowIssue[]
  isDuplicate: boolean
}

export function normalizeLocationKey(
  name: string,
  address: string,
  postalCode?: string,
): string {
  const n = `${name}|${address}|${postalCode ?? ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return n
}

export function titleCaseState(s: string | undefined): string | undefined {
  if (!s) return undefined
  const t = s.trim()
  if (t.length === 2) return t.toUpperCase()
  return t
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function parseLocationCsv(text: string): {
  rows: CsvLocationRow[]
  errors: string[]
} {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  if (parsed.errors.length) {
    return {
      rows: [],
      errors: parsed.errors.map((e) => e.message ?? 'Parse error'),
    }
  }

  const rows: CsvLocationRow[] = []
  const errors: string[] = []

  for (let i = 0; i < parsed.data.length; i++) {
    const raw = parsed.data[i]!
    const result = rowSchema.safeParse({
      name: raw.name ?? raw.title ?? raw.business_name,
      address: raw.address ?? raw.street ?? '',
      lat: raw.lat ?? raw.latitude,
      lng: raw.lng ?? raw.longitude ?? raw.lon,
      category: raw.category,
      city: raw.city?.trim() || undefined,
      state: titleCaseState(raw.state),
      postalCode: raw.postal_code ?? raw.zip ?? raw.postalcode,
      notes: raw.notes ?? raw.comment,
    })
    if (!result.success) {
      errors.push(`Row ${i + 2}: ${result.error.issues.map((x) => x.message).join(', ')}`)
      continue
    }
    rows.push(result.data)
  }

  return { rows, errors }
}

/** Preview + validation for admin import (optional coordinates, duplicate flags). */
export function parseLocationCsvPreview(text: string): {
  rows: CsvPreviewRow[]
  errors: string[]
} {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  if (parsed.errors.length) {
    return {
      rows: [],
      errors: parsed.errors.map((e) => e.message ?? 'Parse error'),
    }
  }

  const rows: CsvPreviewRow[] = []
  const keyFirstIndex = new Map<string, number>()

  for (let i = 0; i < parsed.data.length; i++) {
    const raw = parsed.data[i]!
    const rowNumber = i + 2
    const issues: CsvRowIssue[] = []

    const result = relaxedRowSchema.safeParse({
      name: raw.name ?? raw.title ?? raw.business_name,
      address: raw.address ?? raw.street ?? '',
      lat: raw.lat ?? raw.latitude,
      lng: raw.lng ?? raw.longitude ?? raw.lon,
      category: raw.category,
      city: raw.city?.trim() || undefined,
      state: titleCaseState(raw.state),
      postalCode: (raw.postal_code ?? raw.zip ?? raw.postalcode)?.trim() || undefined,
      notes: raw.notes ?? raw.comment,
    })

    if (!result.success) {
      issues.push({
        severity: 'error',
        message: result.error.issues.map((x) => x.message).join(', '),
      })
      rows.push({
        rowNumber,
        raw,
        data: null,
        issues,
        isDuplicate: false,
      })
      continue
    }

    const data = result.data
    const hasLat =
      data.lat !== undefined && data.lat !== null && !Number.isNaN(data.lat)
    const hasLng =
      data.lng !== undefined && data.lng !== null && !Number.isNaN(data.lng)
    const isNullIsland = hasLat && hasLng && data.lat === 0 && data.lng === 0
    if (hasLat !== hasLng) {
      issues.push({
        severity: 'warning',
        message:
          'Only one of latitude/longitude set — will import without coordinates.',
      })
    } else if (!hasLat && !hasLng) {
      issues.push({
        severity: 'warning',
        message:
          'No coordinates — will geocode from the address during import.',
      })
    } else if (isNullIsland) {
      issues.push({
        severity: 'warning',
        message:
          'Coordinates are 0,0 (Null Island) — will re-geocode from the address during import.',
      })
    }

    const key = normalizeLocationKey(data.name, data.address, data.postalCode)
    let isDuplicate = false
    const first = keyFirstIndex.get(key)
    if (first !== undefined && first !== i) {
      isDuplicate = true
      issues.push({
        severity: 'warning',
        message: 'Duplicate of an earlier row (same name / address / ZIP).',
      })
    } else {
      keyFirstIndex.set(key, i)
    }

    rows.push({
      rowNumber,
      raw,
      data,
      issues,
      isDuplicate,
    })
  }

  return { rows, errors: [] }
}

/** Rows ready for backend import. Coordinates are optional — rows without a
 * valid lat/lng pair are imported as address-only stops. */
export function previewRowsToImportable(
  rows: CsvPreviewRow[],
  options?: { includeDuplicates?: boolean },
): CsvLocationRow[] {
  const out: CsvLocationRow[] = []
  for (const r of rows) {
    if (!r.data) continue
    if (r.issues.some((x) => x.severity === 'error')) continue
    if (r.isDuplicate && !options?.includeDuplicates) continue
    const hasLat =
      r.data.lat !== undefined &&
      r.data.lat !== null &&
      !Number.isNaN(r.data.lat)
    const hasLng =
      r.data.lng !== undefined &&
      r.data.lng !== null &&
      !Number.isNaN(r.data.lng)
    const isNullIsland =
      hasLat && hasLng && r.data.lat === 0 && r.data.lng === 0
    const both = hasLat && hasLng && !isNullIsland
    out.push({
      ...r.data,
      lat: both ? r.data.lat : undefined,
      lng: both ? r.data.lng : undefined,
    })
  }
  return out
}
