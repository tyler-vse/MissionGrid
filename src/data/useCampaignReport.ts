import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/data/queryKeys'
import { useOrgId } from '@/data/useOrgId'
import { useRegistry } from '@/providers/useRegistry'
import { buildCampaignReport } from '@/features/admin/reports/buildCampaignReport'
import type { CampaignReport } from '@/features/admin/reports/buildCampaignReport'

export function useCampaignReport(campaignId: string | null | undefined) {
  const registry = useRegistry()
  const orgId = useOrgId()

  return useQuery<CampaignReport | null>({
    queryKey: queryKeys.campaignReport(campaignId ?? ''),
    queryFn: async () => {
      if (!campaignId || !orgId) return null
      const backend = registry.backend
      if (!backend.getCampaign || !backend.listShifts) return null

      const [campaign, organization, shifts, volunteers, locations] =
        await Promise.all([
          backend.getCampaign(campaignId),
          backend.getOrganization(orgId),
          backend.listShifts({ organizationId: orgId, campaignId }),
          backend.listVolunteers(orgId),
          backend.listLocations(orgId),
        ])

      if (!campaign) return null

      const members = backend.listShiftMembers
        ? (
            await Promise.all(
              shifts.map((s) => backend.listShiftMembers!(s.id)),
            )
          ).flat()
        : []

      const eventsByLocation = await Promise.all(
        locations.map((l) => backend.listLocationHistory(l.id)),
      )
      const allEvents = eventsByLocation.flat()
      const relevantEvents = allEvents.filter((e) =>
        shifts.some((s) => s.id === e.shiftId),
      )

      return buildCampaignReport({
        campaign,
        organization,
        shifts,
        volunteers,
        locations,
        members,
        events: relevantEvents,
      })
    },
    enabled: Boolean(campaignId) && Boolean(orgId),
  })
}
