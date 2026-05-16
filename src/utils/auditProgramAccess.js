import { useSubscriptionStore } from '../services/featureFlags'
import { useAuthStore } from '../store/authStore'

/**
 * Management → Audit Pro (`/management/auditors`): Enterprise-tier program, plus platform auditors.
 * (Production questionnaires still use {@link stripeService.PLANS `auditManagement`} on Premium+.)
 */
export function useAuditProProgramAccess() {
  const hasProgram = useSubscriptionStore((s) => s.hasFeature('auditProProgram'))
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  return isSuperAdmin() || isAuditor() || hasProgram
}
