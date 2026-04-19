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
          queries: { staleTime: 15_000 },
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
        <Toaster richColors position="top-center" />
      </ProviderRegistryProvider>
    </QueryClientProvider>
  )
}
