import type { ActivityStatus } from '@/domain/models/activityStatus'

export interface LocationEvent {
  id: string
  locationId: string
  volunteerId?: string
  fromStatus: ActivityStatus | null
  toStatus: ActivityStatus
  note?: string
  createdAt: string
}
