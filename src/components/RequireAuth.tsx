import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types'

export function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { profile } = useAuth()
  const location = useLocation()
  if (!profile) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(profile.role)) return <Navigate to="/dashboard" replace />
  return children
}
