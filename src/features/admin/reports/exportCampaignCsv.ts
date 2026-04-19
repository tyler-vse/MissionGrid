import type { CampaignReport } from './buildCampaignReport'

function csvEscape(v: string | number | undefined | null): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toISOString()
}

export function exportCampaignCsv(report: CampaignReport): string {
  const header = [
    'campaign',
    'grant_reference',
    'shift_id',
    'shift_started_at',
    'shift_ended_at',
    'shift_duration_minutes',
    'party_size',
    'man_hours',
    'leader',
    'party_member',
    'event_time',
    'action',
    'location_name',
    'location_address',
    'note',
  ]
  const lines: string[] = [header.map(csvEscape).join(',')]
  const shiftById = new Map(report.shifts.map((s) => [s.shiftId, s]))
  for (const a of report.actions) {
    const shift = a.shiftId ? shiftById.get(a.shiftId) : undefined
    lines.push(
      [
        csvEscape(report.campaign.name),
        csvEscape(report.campaign.grantReference ?? ''),
        csvEscape(a.shiftId ?? ''),
        csvEscape(shift ? formatDate(shift.startedAt) : ''),
        csvEscape(shift?.endedAt ? formatDate(shift.endedAt) : ''),
        csvEscape(shift?.durationMinutes ?? ''),
        csvEscape(shift?.partySize ?? ''),
        csvEscape(shift ? shift.manHours.toFixed(2) : ''),
        csvEscape(shift?.leaderName ?? a.volunteerName),
        csvEscape(a.memberName ?? ''),
        csvEscape(formatDate(a.createdAt)),
        csvEscape(a.toStatus),
        csvEscape(a.locationName ?? ''),
        csvEscape(a.locationAddress ?? ''),
        csvEscape(a.note ?? ''),
      ].join(','),
    )
  }
  return lines.join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
