import { useEffect } from 'react'
import { useVolunteers } from '@/data/useVolunteers'
import { useMockBackendStore } from '@/store/mockBackendStore'

export function useActiveVolunteer() {
  const { data: volunteers = [] } = useVolunteers()
  const activeVolunteerId = useMockBackendStore((s) => s.activeVolunteerId)
  const setActiveVolunteerId = useMockBackendStore((s) => s.setActiveVolunteerId)

  useEffect(() => {
    if (!volunteers.length) return
    const valid = volunteers.some((v) => v.id === activeVolunteerId)
    if (!activeVolunteerId || !valid) {
      setActiveVolunteerId(volunteers[0]!.id)
    }
  }, [volunteers, activeVolunteerId, setActiveVolunteerId])

  const volunteer =
    volunteers.find((v) => v.id === activeVolunteerId) ?? volunteers[0] ?? null

  return {
    volunteer,
    volunteers,
    activeVolunteerId: volunteer?.id ?? null,
    setActiveVolunteerId,
  }
}
