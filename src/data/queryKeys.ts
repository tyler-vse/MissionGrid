export const queryKeys = {
  appConfiguration: (orgId: string) => ['appConfiguration', orgId] as const,
  serviceAreas: (orgId: string) => ['serviceAreas', orgId] as const,
  organization: (orgId: string) => ['organization', orgId] as const,
  volunteers: (orgId: string) => ['volunteers', orgId] as const,
  locations: (orgId: string) => ['locations', orgId] as const,
  progress: (orgId: string) => ['progress', orgId] as const,
  recentEvents: (orgId: string) => ['recentEvents', orgId] as const,
  suggestedPlaces: (orgId: string) => ['suggestedPlaces', orgId] as const,
}
