import type { Campaign } from '@/domain/models/campaign'
import type { Location } from '@/domain/models/location'
import type { LocationEvent } from '@/domain/models/locationEvent'
import type { Organization } from '@/domain/models/organization'
import type { Shift, ShiftMember } from '@/domain/models/shift'
import type { Volunteer } from '@/domain/models/volunteer'
import {
  computeManHours,
  rollupShifts,
  shiftDurationMinutes,
} from '@/domain/services/manHours'

export interface CampaignReportShiftRow {
  shiftId: string
  startedAt: string
  endedAt?: string
  durationMinutes: number
  partySize: number
  manHours: number
  leaderName: string
  leaderVolunteerId: string
  memberNames: string[]
  stopsDone: number
  stopsClaimed: number
  stopsSkipped: number
  status: Shift['status']
}

export interface CampaignReportActionRow {
  eventId: string
  shiftId?: string
  createdAt: string
  toStatus: LocationEvent['toStatus']
  fromStatus: LocationEvent['fromStatus']
  locationId: string
  locationName?: string
  locationAddress?: string
  volunteerName: string
  memberName?: string
  note?: string
}

export interface CampaignReportTotals {
  totalShifts: number
  totalDurationMinutes: number
  totalManHours: number
  totalStopsCompleted: number
  totalStopsClaimed: number
  totalStopsSkipped: number
  uniqueVolunteers: number
  uniquePartyMembers: number
  headcount: number
}

export interface CampaignReport {
  campaign: Campaign
  organizationName: string
  generatedAt: string
  totals: CampaignReportTotals
  shifts: CampaignReportShiftRow[]
  actions: CampaignReportActionRow[]
}

export interface BuildCampaignReportInput {
  campaign: Campaign
  organization: Organization | null
  shifts: Shift[]
  volunteers: Volunteer[]
  locations: Location[]
  members: ShiftMember[]
  events: LocationEvent[]
}

export function buildCampaignReport(
  input: BuildCampaignReportInput,
): CampaignReport {
  const volunteerById = new Map(input.volunteers.map((v) => [v.id, v]))
  const locationById = new Map(input.locations.map((l) => [l.id, l]))
  const memberById = new Map(input.members.map((m) => [m.id, m]))
  const membersByShift = new Map<string, ShiftMember[]>()
  for (const m of input.members) {
    const list = membersByShift.get(m.shiftId) ?? []
    list.push(m)
    membersByShift.set(m.shiftId, list)
  }

  const eventsByShift = new Map<string, LocationEvent[]>()
  for (const e of input.events) {
    if (!e.shiftId) continue
    const list = eventsByShift.get(e.shiftId) ?? []
    list.push(e)
    eventsByShift.set(e.shiftId, list)
  }

  const shiftRows: CampaignReportShiftRow[] = input.shifts.map((s) => {
    const duration = shiftDurationMinutes(s)
    const evs = eventsByShift.get(s.id) ?? []
    const stopsDone = evs.filter((e) => e.toStatus === 'completed').length
    const stopsClaimed = evs.filter((e) => e.toStatus === 'claimed').length
    const stopsSkipped = evs.filter((e) => e.toStatus === 'skipped').length
    const leader = volunteerById.get(s.leaderVolunteerId)
    const members = membersByShift.get(s.id) ?? []
    return {
      shiftId: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationMinutes: duration,
      partySize: s.partySize,
      manHours: computeManHours({
        durationMinutes: duration,
        partySize: s.partySize,
      }),
      leaderName: leader?.displayName ?? '—',
      leaderVolunteerId: s.leaderVolunteerId,
      memberNames: members.map((m) => m.displayName),
      stopsDone,
      stopsClaimed,
      stopsSkipped,
      status: s.status,
    }
  })

  const actions: CampaignReportActionRow[] = input.events
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    .map((e) => {
      const loc = locationById.get(e.locationId)
      const vol = e.volunteerId ? volunteerById.get(e.volunteerId) : undefined
      const member = e.actedByMemberId
        ? memberById.get(e.actedByMemberId)
        : undefined
      return {
        eventId: e.id,
        shiftId: e.shiftId,
        createdAt: e.createdAt,
        toStatus: e.toStatus,
        fromStatus: e.fromStatus,
        locationId: e.locationId,
        locationName: loc?.name,
        locationAddress: loc?.address,
        volunteerName: vol?.displayName ?? '—',
        memberName: member?.displayName,
        note: e.note,
      }
    })

  const rollup = rollupShifts(input.shifts)
  const totalStopsCompleted = shiftRows.reduce((sum, r) => sum + r.stopsDone, 0)
  const totalStopsClaimed = shiftRows.reduce(
    (sum, r) => sum + r.stopsClaimed,
    0,
  )
  const totalStopsSkipped = shiftRows.reduce(
    (sum, r) => sum + r.stopsSkipped,
    0,
  )

  return {
    campaign: input.campaign,
    organizationName: input.organization?.name ?? 'Organization',
    generatedAt: new Date().toISOString(),
    totals: {
      totalShifts: rollup.totalShifts,
      totalDurationMinutes: rollup.totalDurationMinutes,
      totalManHours: rollup.totalManHours,
      totalStopsCompleted,
      totalStopsClaimed,
      totalStopsSkipped,
      uniqueVolunteers: rollup.uniqueLeaderIds.length,
      uniquePartyMembers: input.members.length,
      headcount: rollup.headcount,
    },
    shifts: shiftRows,
    actions,
  }
}
