import { Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { isSupabaseConfigured } from '../config/supabase'
import { isSuperadminEmail } from '../services/superadminAuth'
import { profilesService } from '../services/supabaseService'

const ROLE_HIERARCHY = {
  guest: 0,
  user: 1,
  auditor_internal: 2,
  manager: 3,
  admin: 4,
  auditor_external: 5,
  superadmin: 6,
}

/**
 * Wraps a route element:
 *   - Redirects to /login when not authenticated (or session expired)
 *   - Optionally checks `requiredRole` (admin > manager > user)
 *   - Re-reads role from Supabase before privileged routes
 *   - Preserves the intended URL so login can redirect back
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const expiresAt = useAuthStore((s) => s.expiresAt)
  const logout = useAuthStore((s) => s.logout)
  const role = useAuthStore((s) => s.role)
  const userEmail = useAuthStore((s) => s.user?.email)
  const applyVerifiedRole = useAuthStore((s) => s.applyVerifiedRole)
  const location = useLocation()
  const [serverRoleReady, setServerRoleReady] = useState(!requiredRole || !isSupabaseConfigured)

  useEffect(() => {
    if (!requiredRole || !isSupabaseConfigured || !isAuthenticated) {
      setServerRoleReady(true)
      return undefined
    }
    let cancelled = false
    setServerRoleReady(false)
    profilesService
      .getMyProfile()
      .then((profile) => {
        if (cancelled) return
        applyVerifiedRole(profile?.role || 'user')
        setServerRoleReady(true)
      })
      .catch(() => {
        if (cancelled) return
        applyVerifiedRole('user')
        setServerRoleReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [requiredRole, isAuthenticated, applyVerifiedRole])

  // Backend/Firebase clock check. Skip in Supabase mode — auto-refresh updates
  // expiresAt via TOKEN_REFRESHED; a stale client clock must not kick a live session.
  if (!isSupabaseConfigured && isAuthenticated && expiresAt && Date.now() > expiresAt) {
    logout()
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (requiredRole && !serverRoleReady) {
    return null
  }

  if (requiredRole) {
    if (requiredRole === 'superadmin' && !isSuperadminEmail(userEmail)) {
      return <Navigate to="/main-menu" replace />
    }
    if (
      (role === 'auditor_internal' || role === 'auditor_external') &&
      (requiredRole === 'manager' || requiredRole === 'admin' || requiredRole === 'superadmin')
    ) {
      return <Navigate to="/main-menu" replace />
    }
    const currentLevel = ROLE_HIERARCHY[role] ?? 0
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 999
    if (currentLevel < requiredLevel) {
      return <Navigate to="/main-menu" replace />
    }
  }

  return children
}
