import type { Volunteer } from '@/domain/models/volunteer'
import { MOCK_ORG_ID, MOCK_VOLUNTEER_ALEX, MOCK_VOLUNTEER_JAMIE } from '@/mock/ids'

export const MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: MOCK_VOLUNTEER_ALEX,
    organizationId: MOCK_ORG_ID,
    displayName: 'Alex',
    createdAt: new Date().toISOString(),
  },
  {
    id: MOCK_VOLUNTEER_JAMIE,
    organizationId: MOCK_ORG_ID,
    displayName: 'Jamie',
    createdAt: new Date().toISOString(),
  },
]
