export const queryKeys = {
  appConfiguration: ['appConfiguration'] as const,
  organization: (orgId: string) => ['organization', orgId] as const,
  volunteers: (orgId: string) => ['volunteers', orgId] as const,
  locations: (orgId: string) => ['locations', orgId] as const,
  progress: (orgId: string) => ['progress', orgId] as const,
}
