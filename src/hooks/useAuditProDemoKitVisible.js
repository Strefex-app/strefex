import { useAuthStore } from '../store/authStore'
import { useAuditProDemoKitStore } from '../store/auditProDemoKitStore'

/** True only for superadmin with Demo Kit toggled on — everyone else always sees the production view (demo hidden). */
export function useAuditProDemoKitVisible() {
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const demoKitVisible = useAuditProDemoKitStore((s) => s.demoKitVisible)
  return Boolean(isSuperAdmin && demoKitVisible)
}
