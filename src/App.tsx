import { lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { RequireAuth } from './components/RequireAuth'
import { AppShell } from './components/layout/AppShell'

// ── Eager-loaded (small, always needed immediately) ───────────────────────────
import { LoginPage } from './pages/LoginPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { PublicPortalPage } from './pages/PublicPortalPage'

// ── Lazy-loaded routes (split into separate chunks) ───────────────────────────
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const InstitutionsPage   = lazy(() => import('./pages/InstitutionsPage').then(m => ({ default: m.InstitutionsPage })))
const Institution360Page = lazy(() => import('./pages/Institution360Page').then(m => ({ default: m.Institution360Page })))
const ComplaintsPage     = lazy(() => import('./pages/ComplaintsPage').then(m => ({ default: m.ComplaintsPage })))
const NewComplaintPage   = lazy(() => import('./pages/NewComplaintPage').then(m => ({ default: m.NewComplaintPage })))
const CaseDetailPage     = lazy(() => import('./pages/CaseDetailPage').then(m => ({ default: m.CaseDetailPage })))
const OverlapPage        = lazy(() => import('./pages/OverlapPage').then(m => ({ default: m.OverlapPage })))
const VerificationPage   = lazy(() => import('./pages/VerificationPage').then(m => ({ default: m.VerificationPage })))
const AssignedPage       = lazy(() => import('./pages/AssignedPage').then(m => ({ default: m.AssignedPage })))
const NotificationsPage  = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
const ReportsPage        = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const UsersPage          = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })))
const AuditPage          = lazy(() => import('./pages/AuditPage').then(m => ({ default: m.AuditPage })))
const SettingsPage       = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const IriPage            = lazy(() => import('./pages/IriPage').then(m => ({ default: m.IriPage })))

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
              path="/iri"
              element={
                <RequireAuth roles={['SUPER_ADMIN', 'SENIOR_MANAGEMENT', 'BUREAU_HEAD']}>
                  <IriPage />
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
          <Route path="/" element={<PublicPortalPage />} />
          <Route path="/public" element={<PublicPortalPage />} />
          <Route path="/track" element={<PublicPortalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
