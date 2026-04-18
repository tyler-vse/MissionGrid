import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { LocationsList } from '@/features/locations/LocationsList'
import { MapView } from '@/features/map/MapView'
import { ProgressDashboard } from '@/features/progress/ProgressDashboard'
import { RouteSuggestions } from '@/features/routes/RouteSuggestions'
import { SetupWizard } from '@/features/setup/SetupWizard'
import { VolunteerDashboard } from '@/features/volunteer/VolunteerDashboard'
import { useMockBackendStore } from '@/store/mockBackendStore'

function RootRedirect() {
  const configured = useMockBackendStore(
    (s) => s.appConfiguration?.isConfigured ?? false,
  )
  return (
    <Navigate to={configured ? '/volunteer' : '/setup'} replace />
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route element={<AppShell />}>
          <Route path="/volunteer" element={<VolunteerDashboard />} />
          <Route path="/routes" element={<RouteSuggestions />} />
          <Route path="/locations" element={<LocationsList />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/progress" element={<ProgressDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
