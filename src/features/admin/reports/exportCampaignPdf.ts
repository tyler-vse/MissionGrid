import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { APP_CONFIG } from '@/config/app.config'
import type { CampaignReport } from './buildCampaignReport'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

function formatDateOnly(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

function formatRange(startIso?: string, endIso?: string): string {
  if (!startIso && !endIso) return 'No dates set'
  const start = startIso ? formatDateOnly(startIso) : '—'
  const end = endIso ? formatDateOnly(endIso) : '—'
  return `${start} → ${end}`
}

function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1)
}

/**
 * Build a grant-friendly PDF summary and return the jsPDF instance so callers
 * can either save or hand off to a share API.
 */
export function exportCampaignPdf(report: CampaignReport): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const margin = 48
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Campaign Report', margin, y)
  y += 24

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(report.organizationName, margin, y)
  y += 16
  doc.setTextColor(120)
  doc.setFontSize(9)
  doc.text(
    `Generated ${formatDateTime(report.generatedAt)} via ${APP_CONFIG.name}`,
    margin,
    y,
  )
  doc.setTextColor(0)
  y += 24

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(report.campaign.name, margin, y)
  y += 18

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  if (report.campaign.grantReference) {
    doc.text(`Grant reference: ${report.campaign.grantReference}`, margin, y)
    y += 14
  }
  doc.text(
    `Dates: ${formatRange(report.campaign.startsAt, report.campaign.endsAt)}`,
    margin,
    y,
  )
  y += 14
  if (report.campaign.description) {
    const split = doc.splitTextToSize(
      report.campaign.description,
      doc.internal.pageSize.getWidth() - margin * 2,
    )
    doc.text(split, margin, y)
    y += split.length * 12
  }
  y += 8

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Totals', margin, y)
  y += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const totalsLines = [
    `Volunteer hours: ${report.totals.totalManHours.toFixed(1)} (${minutesToHours(
      report.totals.totalDurationMinutes,
    )} elapsed × party size)`,
    `Shifts: ${report.totals.totalShifts}`,
    `Unique shift leaders: ${report.totals.uniqueVolunteers}`,
    `Walk-up party members: ${report.totals.uniquePartyMembers}`,
    `Combined headcount (sum of party sizes): ${report.totals.headcount}`,
    `Stops completed: ${report.totals.totalStopsCompleted}`,
    `Stops skipped: ${report.totals.totalStopsSkipped}`,
  ]
  for (const line of totalsLines) {
    doc.text(`• ${line}`, margin + 6, y)
    y += 13
  }

  y += 8
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        'Date',
        'Leader',
        'Party',
        'Duration',
        'Hours',
        'Stops done',
        'Walk-ups',
      ],
    ],
    body: report.shifts.map((s) => [
      formatDateOnly(s.startedAt),
      s.leaderName,
      String(s.partySize),
      `${s.durationMinutes}m`,
      s.manHours.toFixed(1),
      String(s.stopsDone),
      s.memberNames.length > 0 ? s.memberNames.join(', ') : '—',
    ]),
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 80 },
      2: { cellWidth: 40, halign: 'center' },
      3: { cellWidth: 52, halign: 'right' },
      4: { cellWidth: 44, halign: 'right' },
      5: { cellWidth: 56, halign: 'right' },
    },
    didDrawPage: () => {
      const pageCount = doc.getNumberOfPages()
      const page = doc.getCurrentPageInfo().pageNumber
      doc.setFontSize(8)
      doc.setTextColor(140)
      doc.text(
        `${APP_CONFIG.name} — Campaign Report`,
        margin,
        doc.internal.pageSize.getHeight() - 20,
      )
      doc.text(
        `Page ${page} of ${pageCount}`,
        doc.internal.pageSize.getWidth() - margin,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' },
      )
      doc.setTextColor(0)
    },
  })

  const afterShifts =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y
  const pageHeight = doc.internal.pageSize.getHeight()

  let actionsY = afterShifts + 24
  if (actionsY > pageHeight - 120) {
    doc.addPage()
    actionsY = margin
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Stop-by-stop activity', margin, actionsY)

  autoTable(doc, {
    startY: actionsY + 8,
    margin: { left: margin, right: margin },
    head: [['When', 'Action', 'Place', 'Volunteer / walk-up']],
    body: report.actions.map((a) => [
      formatDateTime(a.createdAt),
      a.toStatus,
      a.locationName ?? '—',
      a.memberName
        ? `${a.memberName} (w/ ${a.volunteerName})`
        : a.volunteerName,
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [22, 101, 52], textColor: 255 },
  })

  return doc
}

export function downloadCampaignPdf(report: CampaignReport): void {
  const doc = exportCampaignPdf(report)
  const safeName = report.campaign.name.replace(/[^a-z0-9-_ ]+/gi, '').trim()
  const fname = `${safeName || 'campaign'}-report.pdf`
  doc.save(fname)
}
