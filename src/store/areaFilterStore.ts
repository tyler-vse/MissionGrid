import { create } from 'zustand'
import type { GeoPolygon } from '@/domain/models/serviceArea'

export interface AreaFilterState {
  searchText: string
  centerLat: number | null
  centerLng: number | null
  radiusMeters: number | null
  polygon: GeoPolygon | null
  setSearchText: (v: string) => void
  setRadiusFilter: (center: { lat: number; lng: number } | null, meters: number | null) => void
  setPolygon: (p: GeoPolygon | null) => void
  reset: () => void
}

export const useAreaFilterStore = create<AreaFilterState>((set) => ({
  searchText: '',
  centerLat: null,
  centerLng: null,
  radiusMeters: null,
  polygon: null,

  setSearchText: (searchText) => set({ searchText }),

  setRadiusFilter: (center, radiusMeters) =>
    set({
      centerLat: center?.lat ?? null,
      centerLng: center?.lng ?? null,
      radiusMeters,
    }),

  setPolygon: (polygon) => set({ polygon }),

  reset: () =>
    set({
      searchText: '',
      centerLat: null,
      centerLng: null,
      radiusMeters: null,
      polygon: null,
    }),
}))
