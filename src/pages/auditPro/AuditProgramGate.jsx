import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAuditProProgramAccess } from '../../utils/auditProgramAccess'
import { auditProgramDeniedPath } from '../../utils/auditorWorkspaceAccess'

/**
 * Guards all `/management/auditors/*` routes (directory, dashboard, conduct, print).
 */
export default function AuditProgramGate() {
  const canUse = useAuditProProgramAccess()
  const role = useAuthStore((s) => s.role)
  if (!canUse) return <Navigate to={auditProgramDeniedPath(role)} replace />
  return <Outlet />
}
