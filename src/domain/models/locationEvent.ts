import type { ActivityStatus } from '@/domain/models/activityStatus'

export interface LocationEvent {
  id: string
  locationId: string
  volunteerId?: string
  /** Shift the action was logged against (set via record_location_action RPC). */
  shiftId?: string
  /** Party member within the shift who took the action, when known. */
  actedByMemberId?: string
  fromStatus: ActivityStatus | null
  toStatus: ActivityStatus
  note?: string
  createdAt: string
}
