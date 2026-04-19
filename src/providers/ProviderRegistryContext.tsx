/* eslint-disable react-refresh/only-export-components -- context + provider module */
import {
  createContext,
  useMemo,
  type ReactNode,
} from 'react'
import {
  createProviderRegistry,
  type ProviderRegistry,
} from '@/providers/registry'
import {
  mergeRuntimeWithEnv,
  type EffectiveRuntimeConfig,
} from '@/config/runtimeConfig'
import { useRuntimeConfigStore } from '@/store/runtimeConfigStore'

export type { ProviderRegistry }
export const RegistryContext = createContext<ProviderRegistry | null>(null)

function useMergedRuntimeConfig(): EffectiveRuntimeConfig {
  const supabaseUrl = useRuntimeConfigStore((s) => s.supabaseUrl)
  const supabaseAnonKey = useRuntimeConfigStore((s) => s.supabaseAnonKey)
  const googleMapsApiKey = useRuntimeConfigStore((s) => s.googleMapsApiKey)
  const organizationId = useRuntimeConfigStore((s) => s.organizationId)
  const volunteerId = useRuntimeConfigStore((s) => s.volunteerId)
  const inviteToken = useRuntimeConfigStore((s) => s.inviteToken)

  return useMemo(
    () =>
      mergeRuntimeWithEnv({
        supabaseUrl,
        supabaseAnonKey,
        googleMapsApiKey,
        organizationId,
        volunteerId,
        inviteToken,
      }),
    [
      supabaseUrl,
      supabaseAnonKey,
      googleMapsApiKey,
      organizationId,
      volunteerId,
      inviteToken,
    ],
  )
}

export function ProviderRegistryProvider({ children }: { children: ReactNode }) {
  const merged = useMergedRuntimeConfig()
  const registry = useMemo(
    () => createProviderRegistry(merged),
    [merged],
  )

  return (
    <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
  )
}
