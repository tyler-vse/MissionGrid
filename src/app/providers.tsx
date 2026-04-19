import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { APP_CONFIG } from '@/config/app.config'
import { ProviderRegistryProvider } from '@/providers/ProviderRegistryContext'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            networkMode: 'offlineFirst',
            retry: (failureCount, error) => {
              // Don't spin on 4xx errors — likely config problems
              const message = (error as Error | undefined)?.message ?? ''
              if (/401|403|404/.test(message)) return false
              return failureCount < 3
            },
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
            refetchOnReconnect: true,
          },
          mutations: {
            networkMode: 'offlineFirst',
            retry: 2,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
          },
        },
      }),
  )

  useEffect(() => {
    document.title = APP_CONFIG.name
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <ProviderRegistryProvider>
        {children}
        <Toaster richColors position="top-center" closeButton />
      </ProviderRegistryProvider>
    </QueryClientProvider>
  )
}
