import { Navigate, useLocation } from 'react-router-dom'
import { resolveLegacyManagementRedirect } from '../utils/managementRoutes'

/** Redirects legacy flat paths to canonical /management/{cluster}/{module}/… URLs. */
export default function LegacyManagementRedirect() {
  const { pathname, search } = useLocation()
  const target = resolveLegacyManagementRedirect(pathname)
  if (!target) return null
  return <Navigate to={`${target}${search}`} replace />
}
