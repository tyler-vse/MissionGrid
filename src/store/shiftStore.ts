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

  /**
   * Remote shift id assigned by the BackendProvider when `startShift` succeeded.
   * `null` means this shift exists locally only (offline / mock fallback).
   */
  shiftId: string | null
  /** Remote campaign id if the leader selected one on the volunteer home. */
  campaignId: string | null
  /** Headcount for man-hours math: leader + walk-ups. Min 1, max 50. */
  partySize: number
  /** Active party share token (from generate_party_token). Nulled on end. */
  partyToken: string | null
  partyTokenExpiresAt: string | null
  /**
   * When the device is itself a walk-up joiner, the shift_member id we were
   * assigned. Lets location actions attribute to the member within the party.
   */
  partyMemberId: string | null

  /** Locations the volunteer personally handled during this shift. */
  completedLocationIds: string[]
  skippedLocationIds: string[]
  claimedLocationIds: string[]
  /** Additional stops added mid-shift via "I have more time". */
  addedLocationIds: string[]

  setMinutes: (m: TimeWindowMinutes) => void
  setPartySize: (n: number) => void
  setCampaignId: (id: string | null) => void

  startShift: (input: {
    minutes: TimeWindowMinutes
    origin: ShiftOrigin | null
    shiftId?: string | null
    campaignId?: string | null
    partySize?: number
    partyMemberId?: string | null
  }) => void
  extendShift: (additionalMinutes: number) => void
  endShift: () => void
  resetShift: () => void

  setPartyToken: (token: string | null, expiresAt?: string | null) => void
  setPartyMember: (memberId: string | null) => void

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
    shiftId: null,
    campaignId: null,
    partySize: 1,
    partyToken: null,
    partyTokenExpiresAt: null,
    partyMemberId: null,
    completedLocationIds: [],
    skippedLocationIds: [],
    claimedLocationIds: [],
    addedLocationIds: [],
  }
}

function unique(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id]
}

function clampPartySize(n: number): number {
  if (!Number.isFinite(n)) return 1
  return Math.max(1, Math.min(50, Math.round(n)))
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      ...initialState(),

      setMinutes: (m) => set({ minutes: m }),
      setPartySize: (n) => set({ partySize: clampPartySize(n) }),
      setCampaignId: (id) => set({ campaignId: id }),

      startShift: ({
        minutes,
        origin,
        shiftId = null,
        campaignId = null,
        partySize = 1,
        partyMemberId = null,
      }) =>
        set({
          ...initialState(),
          status: 'active',
          minutes,
          startedAt: new Date().toISOString(),
          origin,
          shiftId,
          campaignId,
          partySize: clampPartySize(partySize),
          partyMemberId,
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
            ? {
                status: 'ended',
                endedAt: new Date().toISOString(),
                partyToken: null,
                partyTokenExpiresAt: null,
              }
            : s,
        ),

      resetShift: () => set(initialState()),

      setPartyToken: (token, expiresAt = null) =>
        set({ partyToken: token, partyTokenExpiresAt: expiresAt }),
      setPartyMember: (memberId) => set({ partyMemberId: memberId }),

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
      version: 2,
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== 'object') return persisted
        const prev = persisted as Partial<ShiftState>
        if (version < 2) {
          return {
            ...prev,
            shiftId: prev.shiftId ?? null,
            campaignId: prev.campaignId ?? null,
            partySize: clampPartySize(prev.partySize ?? 1),
            partyToken: prev.partyToken ?? null,
            partyTokenExpiresAt: prev.partyTokenExpiresAt ?? null,
            partyMemberId: prev.partyMemberId ?? null,
          }
        }
        return prev
      },
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
