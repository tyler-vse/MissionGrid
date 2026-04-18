import type { Location } from '@/domain/models/location'
import { MOCK_ORG_ID, MOCK_SERVICE_AREA_ID } from '@/mock/ids'

const now = new Date().toISOString()

/** ~26 downtown-ish stops for routing demos */
export function createSeedLocations(): Location[] {
  const center = { lat: 39.7392, lng: -104.9903 }
  const names = [
    'Community Center',
    'Transit Plaza',
    'Food Co-op',
    'Library',
    'Coffee Collective',
    'Neighborhood Clinic',
    'Youth Arts Space',
    'Farmers Market Lot',
    'Faith Community Hall',
    'Bike Kitchen',
    'Tenant Union Office',
    'Mutual Aid Pantry',
    'Skate Park',
    'River Trailhead',
    'Rec Center',
    'Senior Center',
    'Small Business Row',
    'Town Square',
    'Bus Depot',
    'University Gate',
    'Park Pavilion',
    'Clinic Annex',
    'Arts Walk',
    'Night Shelter',
    'Community Garden',
    'Tool Library',
  ]

  const locations: Location[] = names.map((name, i) => {
    const lat = center.lat + (i % 6) * 0.004 - 0.01
    const lng = center.lng + Math.floor(i / 6) * 0.004 - 0.008
    let status: Location['status'] = 'available'
    if (i % 9 === 0) status = 'completed'
    else if (i % 7 === 0) status = 'skipped'
    else if (i === 3) status = 'claimed'
    else if (i === 8) status = 'pending_review'

    const loc: Location = {
      id: `loc_seed_${i + 1}`,
      organizationId: MOCK_ORG_ID,
      name,
      address: `${1200 + i} Market St, Denver, CO`,
      lat,
      lng,
      category: i % 4 === 0 ? 'community' : 'business',
      status,
      source: 'preloaded',
      serviceAreaId: MOCK_SERVICE_AREA_ID,
    }

    if (status === 'claimed') {
      loc.claimedByVolunteerId = 'vol_seed_alex'
      loc.claimedAt = now
    }
    if (status === 'completed') {
      loc.completedAt = now
    }
    return loc
  })

  return locations
}
