import type { Location, OpenHoursHint } from '@/domain/models/location'
import { MOCK_ORG_ID, MOCK_SERVICE_AREA_ID } from '@/mock/ids'

const now = new Date().toISOString()

type SeedRow = {
  name: string
  category: string
  hours?: OpenHoursHint
}

const seed: SeedRow[] = [
  { name: 'Community Center', category: 'community', hours: { opens: '09:00', closes: '20:00' } },
  { name: 'Transit Plaza', category: 'transit' },
  { name: 'Food Co-op', category: 'food', hours: { opens: '07:00', closes: '21:00' } },
  { name: 'Central Library', category: 'community', hours: { opens: '10:00', closes: '18:00' } },
  { name: 'Coffee Collective', category: 'food', hours: { opens: '06:30', closes: '17:00' } },
  { name: 'Neighborhood Clinic', category: 'health', hours: { opens: '08:00', closes: '18:00' } },
  { name: 'Youth Arts Space', category: 'youth', hours: { opens: '12:00', closes: '21:00' } },
  { name: 'Farmers Market Lot', category: 'food' },
  { name: 'Faith Community Hall', category: 'faith', hours: { opens: '08:00', closes: '21:00' } },
  { name: 'Bike Kitchen', category: 'community' },
  { name: 'Tenant Union Office', category: 'community', hours: { opens: '10:00', closes: '18:00' } },
  { name: 'Mutual Aid Pantry', category: 'food', hours: { opens: '09:00', closes: '15:00' } },
  { name: 'Skate Park', category: 'youth' },
  { name: 'River Trailhead', category: 'community' },
  { name: 'Rec Center', category: 'community', hours: { opens: '06:00', closes: '22:00' } },
  { name: 'Senior Center', category: 'community', hours: { opens: '08:00', closes: '17:00' } },
  { name: 'Small Business Row', category: 'business' },
  { name: 'Town Square', category: 'community' },
  { name: 'Bus Depot', category: 'transit', hours: { opens: '05:00', closes: '23:30' } },
  { name: 'University Gate', category: 'youth' },
  { name: 'Park Pavilion', category: 'community' },
  { name: 'Clinic Annex', category: 'health', hours: { opens: '09:00', closes: '17:00' } },
  { name: 'Arts Walk', category: 'community' },
  { name: 'Night Shelter', category: 'community', hours: { opens: '19:00', closes: '07:00' } },
  { name: 'Community Garden', category: 'community' },
  { name: 'Tool Library', category: 'community', hours: { opens: '11:00', closes: '19:00' } },
  { name: 'Public Health Office', category: 'health', hours: { opens: '09:00', closes: '17:00' } },
  { name: 'Laundromat Hub', category: 'business', hours: { opens: '06:00', closes: '23:00' } },
  { name: 'Corner Pharmacy', category: 'health', hours: { opens: '08:00', closes: '22:00' } },
  { name: 'Food Bank Dock', category: 'food', hours: { opens: '07:00', closes: '15:00' } },
  { name: 'Family Resource Center', category: 'community', hours: { opens: '09:00', closes: '18:00' } },
  { name: 'Mosque Community Hall', category: 'faith', hours: { opens: '05:00', closes: '22:00' } },
  { name: 'Synagogue Center', category: 'faith', hours: { opens: '08:00', closes: '20:00' } },
  { name: 'After School Club', category: 'youth', hours: { opens: '14:00', closes: '19:00' } },
  { name: 'Community College Lot', category: 'youth' },
  { name: 'Bilingual Library Branch', category: 'community', hours: { opens: '10:00', closes: '19:00' } },
  { name: 'Free Health Fair Site', category: 'health' },
  { name: 'Microbusiness Incubator', category: 'business', hours: { opens: '09:00', closes: '17:00' } },
  { name: 'Refugee Services Hub', category: 'community', hours: { opens: '09:00', closes: '17:00' } },
  { name: 'Tenant Rights Clinic', category: 'community', hours: { opens: '10:00', closes: '16:00' } },
  { name: 'Legal Aid Drop-in', category: 'community', hours: { opens: '10:00', closes: '16:00' } },
  { name: 'Recycling Depot', category: 'community', hours: { opens: '08:00', closes: '17:00' } },
  { name: 'Baseball Field Gate', category: 'youth' },
  { name: 'Dog Park Entrance', category: 'community' },
  { name: 'Neighborhood Gym', category: 'health', hours: { opens: '05:00', closes: '23:00' } },
  { name: 'Diner on 14th', category: 'food', hours: { opens: '06:00', closes: '21:00' } },
  { name: 'Night Market Corner', category: 'food', hours: { opens: '17:00', closes: '23:00' } },
  { name: 'Metro Station Entry', category: 'transit', hours: { opens: '04:30', closes: '01:00' } },
  { name: 'Food Truck Plaza', category: 'food', hours: { opens: '11:00', closes: '21:00' } },
  { name: 'Town Hall Steps', category: 'community' },
  { name: 'Homeless Day Center', category: 'community', hours: { opens: '07:00', closes: '19:00' } },
  { name: 'Book Swap Box', category: 'community' },
  { name: 'Civic Center Plaza', category: 'community' },
  { name: 'Free Clinic Saturday', category: 'health', hours: { opens: '09:00', closes: '13:00' } },
  { name: 'Community Church Yard', category: 'faith', hours: { opens: '07:00', closes: '21:00' } },
  { name: 'LGBTQ+ Resource Center', category: 'community', hours: { opens: '10:00', closes: '20:00' } },
  { name: 'Soccer Club House', category: 'youth' },
  { name: 'Drive-through Pantry', category: 'food', hours: { opens: '09:00', closes: '14:00' } },
  { name: 'Cultural Arts Co-op', category: 'community', hours: { opens: '11:00', closes: '20:00' } },
  { name: 'Sunset Park Gate', category: 'community' },
  { name: 'Rideshare Pickup', category: 'transit' },
]

/** ~60 nearby stops for a realistic field-coordination demo */
export function createSeedLocations(): Location[] {
  const center = { lat: 39.7392, lng: -104.9903 }
  const cols = 8

  return seed.map((row, i) => {
    const col = i % cols
    const rowIdx = Math.floor(i / cols)
    const lat = center.lat + rowIdx * 0.0035 - 0.015
    const lng = center.lng + col * 0.0035 - 0.014
    let status: Location['status'] = 'available'
    if (i % 11 === 0) status = 'completed'
    else if (i % 13 === 0) status = 'skipped'
    else if (i % 9 === 0) status = 'claimed'
    else if (i === 4) status = 'pending_review'

    const loc: Location = {
      id: `loc_seed_${i + 1}`,
      organizationId: MOCK_ORG_ID,
      name: row.name,
      address: `${1200 + i * 3} Market St, Denver, CO`,
      city: 'Denver',
      state: 'CO',
      postalCode: '80202',
      lat,
      lng,
      category: row.category,
      status,
      source: 'preloaded',
      serviceAreaId: MOCK_SERVICE_AREA_ID,
      openHours: row.hours,
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
}
