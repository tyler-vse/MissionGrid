export type ShiftStatus = 'active' | 'ended' | 'abandoned'

export interface Shift {
  id: string
  organizationId: string
  campaignId?: string
  leaderVolunteerId: string
  partySize: number
  timeWindowMinutes: number
  originLat?: number
  originLng?: number
  startedAt: string
  endedAt?: string
  status: ShiftStatus
  /** Short-lived token used for the party share link; null when never issued. */
  partyToken?: string
  partyTokenExpiresAt?: string
  createdAt: string
}

export interface ShiftMember {
  id: string
  shiftId: string
  displayName: string
  firstName?: string
  joinedAt: string
  leftAt?: string
}

export interface PartyTokenInfo {
  shiftId: string
  token: string
  expiresAt?: string
}
