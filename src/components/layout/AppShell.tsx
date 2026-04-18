import { Navigate, Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { MobileTabBar } from '@/components/layout/MobileTabBar'
import { useMockBackendStore } from '@/store/mockBackendStore'

export function AppShell() {
  const configured = useMockBackendStore(
    (s) => s.appConfiguration?.isConfigured ?? false,
  )
  if (!configured) {
    return <Navigate to="/setup" replace />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>
      <MobileTabBar />
    </div>
  )
}
