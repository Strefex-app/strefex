import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

/**
 * Wraps a route element:
 *   - Redirects to /login when not authenticated (or session expired)
 *   - Optionally checks `requiredRole` (admin > manager > user)
 *   - Shows "403 Forbidden" when role is insufficient
 *   - Preserves the intended URL so login can redirect back
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const expiresAt = useAuthStore((s) => s.expiresAt)
  const logout = useAuthStore((s) => s.logout)
  const role = useAuthStore((s) => s.role)
  const location = useLocation()

  const roleHierarchy = {
    guest: 0,
    user: 1,
    manager: 2,
    auditor_internal: 3,
    admin: 4,
    auditor_external: 5,
    superadmin: 6,
  }

  // Token expired — force logout and redirect
  if (isAuthenticated && expiresAt && Date.now() > expiresAt) {
    logout()
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (requiredRole) {
    const currentLevel = roleHierarchy[role] ?? 0
    const requiredLevel = roleHierarchy[requiredRole] ?? 999
    if (currentLevel < requiredLevel) {
      return <Navigate to="/main-menu" replace />
    }
  }

  return children
}
