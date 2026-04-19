export type PlaceCategoryId =
  | 'all'
  | 'businesses'
  | 'apartments'
  | 'restaurants'

export interface PlaceCategoryPreset {
  id: PlaceCategoryId
  label: string
  keyword?: string
  googleType?: string
}

export const PLACE_CATEGORY_PRESETS: Record<PlaceCategoryId, PlaceCategoryPreset> = {
  all: { id: 'all', label: 'All' },
  businesses: {
    id: 'businesses',
    label: 'Businesses',
    googleType: 'establishment',
  },
  apartments: {
    id: 'apartments',
    label: 'Apartments',
    keyword: 'apartments',
    googleType: 'premise',
  },
  restaurants: {
    id: 'restaurants',
    label: 'Restaurants',
    googleType: 'restaurant',
  },
}

export const PLACE_CATEGORY_ORDER: PlaceCategoryId[] = [
  'all',
  'businesses',
  'apartments',
  'restaurants',
]

export const DEFAULT_PLACE_CATEGORY: PlaceCategoryId = 'all'

export function isPlaceCategoryId(value: unknown): value is PlaceCategoryId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(PLACE_CATEGORY_PRESETS, value)
  )
}
