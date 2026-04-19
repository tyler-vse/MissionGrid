import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { JoinPage } from '@/features/join/JoinPage'
import { LocationsList } from '@/features/locations/LocationsList'
import { ProgressDashboard } from '@/features/progress/ProgressDashboard'
import { SetupWizard } from '@/features/setup/SetupWizard'
import { ShiftView } from '@/features/shift/ShiftView'
import { VolunteerDashboard } from '@/features/volunteer/VolunteerDashboard'
import { useIsAppConfigured } from '@/data/useIsAppConfigured'

function RootRedirect() {
  const configured = useIsAppConfigured()
  return <Navigate to={configured ? '/volunteer' : '/setup'} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route element={<AppShell />}>
          <Route path="/volunteer" element={<VolunteerDashboard />} />
          <Route path="/shift" element={<ShiftView />} />
          <Route path="/routes" element={<Navigate to="/shift" replace />} />
          <Route path="/locations" element={<LocationsList />} />
          <Route path="/progress" element={<ProgressDashboard />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
