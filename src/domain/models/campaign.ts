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
  /** Zones (service_areas) this campaign covers. Populated by the backend via the
   * `campaign_service_areas` junction; may be empty if no zones are linked yet. */
  serviceAreaIds: string[]
  createdAt: string
  updatedAt: string
}
