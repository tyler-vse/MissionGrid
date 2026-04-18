import { useLocations } from '@/data/useLocations'

export function useLocation(locationId: string | undefined) {
  const { data: locations = [], ...rest } = useLocations()
  const location = locationId
    ? locations.find((l) => l.id === locationId)
    : undefined
  return { location, locations, ...rest }
}
