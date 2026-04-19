import type { Shift } from '@/domain/models/shift'

export interface ManHoursInput {
  durationMinutes: number
  partySize: number
}

/** Simple multiplier-based man-hours. Ignores sub-hour rounding. */
export function computeManHours(input: ManHoursInput): number {
  const minutes = Math.max(0, input.durationMinutes) * Math.max(1, input.partySize)
  return minutes / 60
}

/** Returns the elapsed minutes for a shift, clamped to non-negative. */
export function shiftDurationMinutes(shift: Shift): number {
  const start = new Date(shift.startedAt).getTime()
  const end = shift.endedAt ? new Date(shift.endedAt).getTime() : Date.now()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.max(0, Math.round((end - start) / 60000))
}

export interface ShiftsRollup {
  totalShifts: number
  totalDurationMinutes: number
  totalManHours: number
  uniqueLeaderIds: string[]
  headcount: number
}

export function rollupShifts(shifts: Shift[]): ShiftsRollup {
  const uniqueLeaderIds: string[] = []
  const leaderSet = new Set<string>()
  let totalDurationMinutes = 0
  let totalManHours = 0
  let headcount = 0

  for (const s of shifts) {
    if (!leaderSet.has(s.leaderVolunteerId)) {
      leaderSet.add(s.leaderVolunteerId)
      uniqueLeaderIds.push(s.leaderVolunteerId)
    }
    const minutes = shiftDurationMinutes(s)
    totalDurationMinutes += minutes
    totalManHours += computeManHours({
      durationMinutes: minutes,
      partySize: s.partySize,
    })
    headcount += s.partySize
  }

  return {
    totalShifts: shifts.length,
    totalDurationMinutes,
    totalManHours,
    uniqueLeaderIds,
    headcount,
  }
}
