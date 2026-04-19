export type CampaignStatus = 'active' | 'archived'

export interface Campaign {
  id: string
  organizationId: string
  name: string
  description?: string
  /** Free-form reference shown in grant reports (e.g. grant award number). */
  grantReference?: string
  startsAt?: string
  endsAt?: string
  status: CampaignStatus
  createdAt: string
  updatedAt: string
}
