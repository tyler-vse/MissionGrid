import type { OpenHoursHint } from '@/domain/models/location'

export type OpenStatus = 'open' | 'closed' | 'unknown'

function parseHHMM(value: string | undefined): number | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null
  if (h < 0 || h > 24 || m < 0 || m > 59) return null
  return h * 60 + m
}

/**
 * Minutes since midnight for `now` in the given IANA timezone (or local if omitted).
 * Uses Intl — gracefully falls back to local time if tz is invalid.
 */
function minutesSinceMidnight(now: Date, timezone: string | undefined): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    })
    const parts = fmt.formatToParts(now)
    const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
    const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
    return hh * 60 + mm
  } catch {
    return now.getHours() * 60 + now.getMinutes()
  }
}

/**
 * Best-effort "is this place open right now?". Returns 'unknown' when hours are
 * missing or unparseable so the UI can avoid showing misleading info.
 *
 * Supports simple HH:MM opens/closes ranges, including ranges that cross midnight.
 */
export function getOpenStatus(
  hours: OpenHoursHint | undefined | null,
  now: Date = new Date(),
): OpenStatus {
  const opens = parseHHMM(hours?.opens)
  const closes = parseHHMM(hours?.closes)
  if (opens === null || closes === null) return 'unknown'
  const current = minutesSinceMidnight(now, hours?.timezone)
  if (opens === closes) return 'unknown'
  if (opens < closes) {
    return current >= opens && current < closes ? 'open' : 'closed'
  }
  // Overnight range (e.g. 22:00 -> 02:00)
  return current >= opens || current < closes ? 'open' : 'closed'
}

export function formatHoursRange(hours: OpenHoursHint | undefined): string | null {
  if (!hours?.opens || !hours?.closes) return null
  return `${hours.opens}–${hours.closes}`
}
