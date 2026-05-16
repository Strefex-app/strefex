import { Navigate, Outlet } from 'react-router-dom'
import { useAuditProProgramAccess } from '../../utils/auditProgramAccess'

/**
 * Guards all `/management/auditors/*` routes (dashboard, conduct, print, overview).
 */
export default function AuditProgramGate() {
  const canUse = useAuditProProgramAccess()
  if (!canUse) return <Navigate to="/management" replace />
  return <Outlet />
}
