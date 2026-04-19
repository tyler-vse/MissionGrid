import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { APP_CONFIG, type TimeWindowMinutes } from '@/config/app.config'

export type ShiftStatus = 'idle' | 'active' | 'ended'

export interface ShiftOrigin {
  lat: number
  lng: number
  label?: string
}

export interface ShiftState {
  status: ShiftStatus
  minutes: TimeWindowMinutes
  startedAt: string | null
  endedAt: string | null
  origin: ShiftOrigin | null
  /** Locations the volunteer personally handled during this shift. */
  completedLocationIds: string[]
  skippedLocationIds: string[]
  claimedLocationIds: string[]
  /** Additional stops added mid-shift via "I have more time". */
  addedLocationIds: string[]

  startShift: (input: {
    minutes: TimeWindowMinutes
    origin: ShiftOrigin | null
  }) => void
  extendShift: (additionalMinutes: number) => void
  endShift: () => void
  resetShift: () => void

  recordClaim: (locationId: string) => void
  recordComplete: (locationId: string) => void
  recordSkip: (locationId: string) => void
  recordAdded: (locationId: string) => void
}

function initialState() {
  return {
    status: 'idle' as ShiftStatus,
    minutes: 30 as TimeWindowMinutes,
    startedAt: null,
    endedAt: null,
    origin: null,
    completedLocationIds: [],
    skippedLocationIds: [],
    claimedLocationIds: [],
    addedLocationIds: [],
  }
}

function unique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id]
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      ...initialState(),

      startShift: ({ minutes, origin }) =>
        set({
          ...initialState(),
          status: 'active',
          minutes,
          startedAt: new Date().toISOString(),
          origin,
        }),

      extendShift: (additionalMinutes) =>
        set((s) => ({
          minutes: Math.min(
            240,
            (s.minutes as number) + additionalMinutes,
          ) as TimeWindowMinutes,
        })),

      endShift: () =>
        set((s) =>
          s.status === 'active'
            ? { status: 'ended', endedAt: new Date().toISOString() }
            : s,
        ),

      resetShift: () => set(initialState()),

      recordClaim: (id) =>
        set((s) => ({ claimedLocationIds: unique(s.claimedLocationIds, id) })),
      recordComplete: (id) =>
        set((s) => ({
          completedLocationIds: unique(s.completedLocationIds, id),
        })),
      recordSkip: (id) =>
        set((s) => ({ skippedLocationIds: unique(s.skippedLocationIds, id) })),
      recordAdded: (id) =>
        set((s) => ({ addedLocationIds: unique(s.addedLocationIds, id) })),
    }),
    {
      name: `${APP_CONFIG.storageKey}:shift`,
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)

/** Compute minutes remaining given shift start + duration. */
export function getMinutesRemaining(state: ShiftState): number | null {
  if (state.status !== 'active' || !state.startedAt) return null
  const elapsedMs = Date.now() - new Date(state.startedAt).getTime()
  const remainingMs = state.minutes * 60 * 1000 - elapsedMs
  return Math.max(0, Math.round(remainingMs / 60000))
}

export function getMinutesElapsed(state: ShiftState): number | null {
  if (state.status !== 'active' || !state.startedAt) return null
  const elapsedMs = Date.now() - new Date(state.startedAt).getTime()
  return Math.max(0, Math.round(elapsedMs / 60000))
}
