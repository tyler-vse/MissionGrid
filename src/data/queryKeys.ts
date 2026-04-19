export const queryKeys = {
  appConfiguration: (orgId: string) => ['appConfiguration', orgId] as const,
  serviceAreas: (orgId: string) => ['serviceAreas', orgId] as const,
  organization: (orgId: string) => ['organization', orgId] as const,
  volunteers: (orgId: string) => ['volunteers', orgId] as const,
  locations: (orgId: string) => ['locations', orgId] as const,
  adminLocations: (orgId: string) => ['adminLocations', orgId] as const,
  progress: (orgId: string) => ['progress', orgId] as const,
  recentEvents: (orgId: string) => ['recentEvents', orgId] as const,
  suggestedPlaces: (orgId: string) => ['suggestedPlaces', orgId] as const,
  campaigns: (orgId: string) => ['campaigns', orgId] as const,
  campaign: (id: string) => ['campaign', id] as const,
  shifts: (orgId: string, campaignId?: string | null) =>
    ['shifts', orgId, campaignId ?? null] as const,
  shift: (id: string) => ['shift', id] as const,
  shiftMembers: (shiftId: string) => ['shiftMembers', shiftId] as const,
  campaignReport: (campaignId: string) =>
    ['campaignReport', campaignId] as const,
  orgInvites: (orgId: string) => ['orgInvites', orgId] as const,
}
