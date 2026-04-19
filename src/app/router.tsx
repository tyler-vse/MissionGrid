import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AdminConnectPage } from '@/features/admin/AdminConnectPage'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import { AdminLoginPage } from '@/features/admin/AdminLoginPage'
import { RequireAdmin } from '@/features/admin/RequireAdmin'
import { AuthCallbackPage } from '@/features/auth/AuthCallbackPage'
import { VolunteerLoginPage } from '@/features/auth/VolunteerLoginPage'
import { JoinPage } from '@/features/join/JoinPage'
import { LandingPage } from '@/features/landing/LandingPage'
import { LocationsList } from '@/features/locations/LocationsList'
import { ProgressDashboard } from '@/features/progress/ProgressDashboard'
import { SetupWizard } from '@/features/setup/SetupWizard'
import { ShiftView } from '@/features/shift/ShiftView'
import { VolunteerDashboard } from '@/features/volunteer/VolunteerDashboard'
import { APP_CONFIG } from '@/config/app.config'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path={APP_CONFIG.loginRoute} element={<VolunteerLoginPage />} />
        <Route path={APP_CONFIG.authCallbackRoute} element={<AuthCallbackPage />} />
        <Route path={APP_CONFIG.adminConnectRoute} element={<AdminConnectPage />} />
        <Route path={APP_CONFIG.adminLoginRoute} element={<AdminLoginPage />} />
        <Route
          path="/admin/*"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
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
