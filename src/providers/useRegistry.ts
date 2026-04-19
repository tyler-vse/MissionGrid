import { useContext } from 'react'
import {
  RegistryContext,
  type ProviderRegistry,
} from '@/providers/ProviderRegistryContext'

export function useRegistry(): ProviderRegistry {
  const ctx = useContext(RegistryContext)
  if (!ctx) {
    throw new Error('useRegistry must be used within ProviderRegistryProvider')
  }
  return ctx
}
