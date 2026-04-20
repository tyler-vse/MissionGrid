import {
  ArrowLeft,
  Archive,
  Download,
  FileText,
  Megaphone,
  RotateCcw,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineAlert } from '@/components/ui/inline-alert'
import { SectionHeader } from '@/components/ui/section-header'
import { Stat } from '@/components/ui/stat'
import { useCampaign } from '@/data/useCampaign'
import { useCampaignReport } from '@/data/useCampaignReport'
import { useServiceAreas } from '@/data/useServiceAreas'
import { useUpdateCampaign } from '@/data/useUpdateCampaign'
import {
  downloadCsv,
  exportCampaignCsv,
} from '@/features/admin/reports/exportCampaignCsv'
import { downloadCampaignPdf } from '@/features/admin/reports/exportCampaignPdf'
import { formatUnknownError } from '@/lib/errors'

function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export function AdminCampaignDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data: campaign, isLoading: loadingCampaign } = useCampaign(id)
  const { data: report, isLoading: loadingReport } = useCampaignReport(id)
  const updateCampaign = useUpdateCampaign()
  const serviceAreas = useServiceAreas()
  const zoneIdSet = useMemo(
    () => new Set(campaign?.serviceAreaIds ?? []),
    [campaign?.serviceAreaIds],
  )

  const toggleZone = async (zoneId: string) => {
    if (!campaign) return
    const next = new Set(campaign.serviceAreaIds)
    if (next.has(zoneId)) next.delete(zoneId)
    else next.add(zoneId)
    try {
      await updateCampaign.mutateAsync({
        id: campaign.id,
        patch: { serviceAreaIds: Array.from(next) },
      })
      toast.success('Zones updated')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  if (!id) {
    return <Navigate to="/admin/campaigns" replace />
  }

  if (loadingCampaign) {
    return <p className="text-sm text-muted-foreground">Loading campaign…</p>
  }

  if (!campaign) {
    return (
      <EmptyState
        icon={Megaphone}
        title="Campaign not found"
        description="It may have been deleted or is on a different device."
        action={
          <Button asChild variant="outline">
            <Link to="/admin/campaigns">Back to campaigns</Link>
          </Button>
        }
      />
    )
  }

  const onDownloadCsv = () => {
    if (!report) return
    const csv = exportCampaignCsv(report)
    const safe = campaign.name.replace(/[^a-z0-9-_ ]+/gi, '').trim()
    downloadCsv(`${safe || 'campaign'}-report.csv`, csv)
    toast.success('CSV downloaded')
  }

  const onDownloadPdf = () => {
    if (!report) return
    try {
      downloadCampaignPdf(report)
      toast.success('PDF downloaded')
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const toggleArchive = async () => {
    try {
      await updateCampaign.mutateAsync({
        id: campaign.id,
        patch: {
          status: campaign.status === 'active' ? 'archived' : 'active',
        },
      })
      toast.success(
        campaign.status === 'active' ? 'Campaign archived' : 'Campaign reopened',
      )
    } catch (e) {
      toast.error(formatUnknownError(e))
    }
  }

  const totals = report?.totals

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/campaigns')}
          aria-label="Back to campaigns"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <SectionHeader
          title={campaign.name}
          description={
            campaign.grantReference
              ? `Grant reference: ${campaign.grantReference}`
              : formatDate(campaign.startsAt) +
                ' → ' +
                formatDate(campaign.endsAt)
          }
          className="flex-1"
          action={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void toggleArchive()}
                disabled={updateCampaign.isPending}
                className="gap-1.5"
              >
                {campaign.status === 'active' ? (
                  <>
                    <Archive className="h-4 w-4" />
                    Archive
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Reopen
                  </>
                )}
              </Button>
            </div>
          }
        />
      </div>

      {campaign.description && (
        <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
          {campaign.description}
        </p>
      )}

      <section
        aria-labelledby="zones-heading"
        className="rounded-2xl border bg-card p-5 shadow-sm"
      >
        <div className="mb-3">
          <h2 id="zones-heading" className="text-base font-bold tracking-tight">
            Zones covered
          </h2>
          <p className="text-sm text-muted-foreground">
            This campaign reports on work in every selected zone.
          </p>
        </div>
        {serviceAreas.length === 0 ? (
          <InlineAlert tone="info">
            No zones are defined yet. Add one in setup before scoping campaigns.
          </InlineAlert>
        ) : (
          <ul className="space-y-1.5">
            {serviceAreas.map((area) => {
              const checked = zoneIdSet.has(area.id)
              return (
                <li key={area.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted/40">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      disabled={updateCampaign.isPending}
                      onChange={() => void toggleZone(area.id)}
                    />
                    <span className="truncate font-medium">{area.name}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="totals-heading"
        className="rounded-2xl border bg-card p-5 shadow-sm"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2
            id="totals-heading"
            className="text-base font-bold tracking-tight"
          >
            Grant totals
          </h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onDownloadCsv}
              disabled={!report || loadingReport}
              className="gap-1.5"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              size="sm"
              onClick={onDownloadPdf}
              disabled={!report || loadingReport}
              className="gap-1.5"
            >
              <FileText className="h-4 w-4" />
              PDF
            </Button>
          </div>
        </div>

        {loadingReport && (
          <p className="text-sm text-muted-foreground">Crunching numbers…</p>
        )}

        {!loadingReport && report && totals && totals.totalShifts === 0 && (
          <InlineAlert>
            No shifts have been tagged to this campaign yet. Ask volunteers to
            pick this campaign on the home screen when they start a shift.
          </InlineAlert>
        )}

        {!loadingReport && totals && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat
              label="Volunteer hours"
              value={totals.totalManHours.toFixed(1)}
              tone="primary"
            />
            <Stat
              label="Shifts"
              value={totals.totalShifts}
              tone="info"
            />
            <Stat
              label="Stops done"
              value={totals.totalStopsCompleted}
              tone="success"
            />
            <Stat
              label="Headcount"
              value={totals.headcount}
              tone="warning"
            />
          </div>
        )}
      </section>

      {report && report.shifts.length > 0 && (
        <section
          aria-labelledby="shifts-heading"
          className="rounded-2xl border bg-card p-5 shadow-sm"
        >
          <h2
            id="shifts-heading"
            className="mb-3 text-base font-bold tracking-tight"
          >
            Shifts
          </h2>
          <ul className="divide-y text-sm">
            {report.shifts.map((s) => (
              <li key={s.shiftId}>
                <Link
                  to={`/admin/shifts/${s.shiftId}`}
                  className="group flex items-start justify-between gap-3 py-3 transition-colors hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {s.leaderName}
                      {s.memberNames.length > 0 && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          + {s.memberNames.join(', ')}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(s.startedAt)} · {s.durationMinutes}m ·
                      party {s.partySize}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-sm font-bold">
                      {s.manHours.toFixed(1)} hrs
                    </p>
                    <p className="text-muted-foreground">
                      {s.stopsDone} done · {s.stopsSkipped} skipped
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
