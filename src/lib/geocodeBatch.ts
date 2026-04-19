import type { GeocodingProvider } from '@/providers/geocoding/GeocodingProvider'

const DEFAULT_DELAY_MS = 100

export interface GeocodeBatchItem {
  /** Index in the caller's array */
  index: number
  query: string
}

export type GeocodeBatchResult =
  | {
      index: number
      ok: true
      lat: number
      lng: number
    }
  | {
      index: number
      ok: false
      message: string
    }

/**
 * Sequential geocode with small delay to respect free-tier quotas.
 */
export async function geocodeBatch(
  geocoder: GeocodingProvider,
  items: GeocodeBatchItem[],
  options?: {
    delayMs?: number
    onProgress?: (done: number, total: number) => void
  },
): Promise<GeocodeBatchResult[]> {
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS
  const out: GeocodeBatchResult[] = []
  let done = 0
  for (const item of items) {
    try {
      const { lat, lng } = await geocoder.geocode(item.query)
      out.push({ index: item.index, ok: true, lat, lng })
    } catch (e) {
      out.push({
        index: item.index,
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      })
    }
    done += 1
    options?.onProgress?.(done, items.length)
    if (delayMs > 0 && done < items.length) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return out
}
