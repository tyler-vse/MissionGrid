import type { Organization } from '@/domain/models/organization'
import { MOCK_ORG_ID } from '@/mock/ids'

export const MOCK_ORGANIZATION: Organization = {
  id: MOCK_ORG_ID,
  name: 'Sample Street Team',
  slug: 'sample-street-team',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}
