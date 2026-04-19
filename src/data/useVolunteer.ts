import { useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { isSupabaseConfigured, mergeRuntimeWithEnv } from '@/config/runtimeConfig'
import { useVolunteers } from '@/data/useVolunteers'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'
import { useMockBackendStore } from '@/store/mockBackendStore'

export function useActiveVolunteer() {
  const { data: volunteers = [] } = useVolunteers()
  const activeVolunteerIdMock = useMockBackendStore((s) => s.activeVolunteerId)
  const setActiveVolunteerIdMock = useMockBackendStore(
    (s) => s.setActiveVolunteerId,
  )
  const runtimeVolunteerId = useRuntimeConfigStore((s) => s.volunteerId)
  const patchRuntime = useRuntimeConfigStore((s) => s.patch)
  const runtimeSlice = useRuntimeConfigStore(
    useShallow((s) => ({
      supabaseUrl: s.supabaseUrl,
      supabaseAnonKey: s.supabaseAnonKey,
      googleMapsApiKey: s.googleMapsApiKey,
      organizationId: s.organizationId,
      volunteerId: s.volunteerId,
      inviteToken: s.inviteToken,
    })),
  )
  const merged = mergeRuntimeWithEnv(runtimeSlice)
  const isSupabase = isSupabaseConfigured(merged)

  const activeVolunteerId = isSupabase
    ? runtimeVolunteerId || null
    : activeVolunteerIdMock

  useEffect(() => {
    if (!volunteers.length) return
    if (isSupabase) {
      const valid = volunteers.some((v) => v.id === runtimeVolunteerId)
      if (!runtimeVolunteerId || !valid) {
        patchRuntime({ volunteerId: volunteers[0]!.id })
      }
      return
    }
    const valid = volunteers.some((v) => v.id === activeVolunteerIdMock)
    if (!activeVolunteerIdMock || !valid) {
      setActiveVolunteerIdMock(volunteers[0]!.id)
    }
  }, [
    volunteers,
    isSupabase,
    runtimeVolunteerId,
    activeVolunteerIdMock,
    patchRuntime,
    setActiveVolunteerIdMock,
  ])

  const setActiveVolunteerId = (id: string | null) => {
    if (isSupabase && id) {
      patchRuntime({ volunteerId: id })
    } else {
      setActiveVolunteerIdMock(id)
    }
  }

  const volunteer =
    volunteers.find((v) => v.id === activeVolunteerId) ?? volunteers[0] ?? null

  return {
    volunteer,
    volunteers,
    activeVolunteerId: volunteer?.id ?? null,
    setActiveVolunteerId,
  }
}
