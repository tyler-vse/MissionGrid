import Papa from 'papaparse'
import { z } from 'zod'

const rowSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  lat: z.coerce.number().finite(),
  lng: z.coerce.number().finite(),
  category: z.string().optional(),
})

export type CsvLocationRow = z.infer<typeof rowSchema>

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
      name: raw.name ?? raw.title,
      address: raw.address ?? raw.street ?? '',
      lat: raw.lat ?? raw.latitude,
      lng: raw.lng ?? raw.longitude ?? raw.lon,
      category: raw.category,
    })
    if (!result.success) {
      errors.push(`Row ${i + 2}: ${result.error.issues.map((x) => x.message).join(', ')}`)
      continue
    }
    rows.push(result.data)
  }

  return { rows, errors }
}
