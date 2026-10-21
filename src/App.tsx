import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth } from './components/RequireAuth'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { InstitutionsPage } from './pages/InstitutionsPage'
import { Institution360Page } from './pages/Institution360Page'
import { ComplaintsPage } from './pages/ComplaintsPage'
import { NewComplaintPage } from './pages/NewComplaintPage'
import { CaseDetailPage } from './pages/CaseDetailPage'
import { OverlapPage } from './pages/OverlapPage'
import { VerificationPage } from './pages/VerificationPage'
import { AssignedPage } from './pages/AssignedPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsPage } from './pages/ReportsPage'
import { UsersPage } from './pages/UsersPage'
import { AuditPage } from './pages/AuditPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/institutions" element={<InstitutionsPage />} />
            <Route path="/institutions/:id" element={<Institution360Page />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/complaints/new" element={<NewComplaintPage />} />
            <Route path="/complaints/:id" element={<CaseDetailPage />} />
            <Route
              path="/overlap"
              element={
                <RequireAuth roles={['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD']}>
                  <OverlapPage />
                </RequireAuth>
              }
            />
            <Route
              path="/verification"
              element={
                <RequireAuth roles={['SUPER_ADMIN', 'BUREAU_HEAD', 'CASE_OFFICER', 'REGIONAL_OFFICER']}>
                  <VerificationPage />
                </RequireAuth>
              }
            />
            <Route
              path="/assigned"
              element={
                <RequireAuth roles={['SUPER_ADMIN', 'BUREAU_HEAD', 'CASE_OFFICER', 'REGIONAL_OFFICER']}>
                  <AssignedPage />
                </RequireAuth>
              }
            />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route
              path="/reports"
              element={
                <RequireAuth roles={['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD']}>
                  <ReportsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/users"
              element={
                <RequireAuth roles={['SUPER_ADMIN']}>
                  <UsersPage />
                </RequireAuth>
              }
            />
            <Route
              path="/audit"
              element={
                <RequireAuth roles={['SUPER_ADMIN']}>
                  <AuditPage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth roles={['SUPER_ADMIN']}>
                  <SettingsPage />
                </RequireAuth>
              }
            />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
