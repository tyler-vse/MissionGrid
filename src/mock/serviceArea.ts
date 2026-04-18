import type { ServiceArea } from '@/domain/models/serviceArea'
import { MOCK_ORG_ID, MOCK_SERVICE_AREA_ID } from '@/mock/ids'

export const MOCK_SERVICE_AREA: ServiceArea = {
  id: MOCK_SERVICE_AREA_ID,
  organizationId: MOCK_ORG_ID,
  name: 'Downtown coverage',
  centerLat: 39.7392,
  centerLng: -104.9903,
  radiusMeters: 2500,
}
