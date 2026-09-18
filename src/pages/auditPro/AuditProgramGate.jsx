import { Navigate, Outlet } from 'react-router-dom'
import { useAuditProProgramAccess } from '../../utils/auditProgramAccess'

/**
 * Guards all `/management/auditors/*` routes (directory, dashboard, conduct, print).
 */
export default function AuditProgramGate() {
  const canUse = useAuditProProgramAccess()
  if (!canUse) return <Navigate to="/management" replace />
  return <Outlet />
}
