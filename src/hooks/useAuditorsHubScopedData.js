import { useMemo } from 'react'
import {
  filterAuditProAuditsForVisibility,
  filterAuditProAuditorsForVisibility,
  filterAuditProSuppliersForVisibility,
} from '../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from './useAuditProDemoKitVisible'
import useAuditProStore from '../store/auditProStore'
import { useAuthStore } from '../store/authStore'
import {
  scopeAuditsForViewer,
  scopeAuditorsForViewer,
  scopeSuppliersForViewer,
} from '../utils/auditorIndustryScope'

export function useAuditorsHubScopedData() {
  const auditsAll = useAuditProStore((s) => s.audits)
  const auditorsAll = useAuditProStore((s) => s.auditors)
  const suppliersAll = useAuditProStore((s) => s.suppliers)
  const demoKitShown = useAuditProDemoKitVisible()
  const role = useAuthStore((s) => s.role)
  const email = useAuthStore((s) => String(s.user?.email || '').toLowerCase())
  const allowedIndustries = useAuthStore((s) => s.user?.auditorVisibleIndustries || [])

  const selfAuditorIds = useMemo(
    () => new Set(
      (auditorsAll || [])
        .filter((a) => String(a.email || '').toLowerCase() === email)
        .map((a) => a.id),
    ),
    [auditorsAll, email],
  )

  const auditors = useMemo(() => {
    const visible = filterAuditProAuditorsForVisibility(auditorsAll, demoKitShown)
    return scopeAuditorsForViewer(visible, { role, email })
  }, [auditorsAll, demoKitShown, role, email])

  const suppliers = useMemo(() => {
    const visible = filterAuditProSuppliersForVisibility(suppliersAll, demoKitShown)
    return scopeSuppliersForViewer(visible, {
      role,
      email,
      allowedIndustries,
      auditorIds: selfAuditorIds,
      audits: auditsAll,
    })
  }, [suppliersAll, demoKitShown, role, email, allowedIndustries, selfAuditorIds, auditsAll])

  const audits = useMemo(() => {
    const visible = filterAuditProAuditsForVisibility(auditsAll, auditorsAll, suppliersAll, demoKitShown)
    return scopeAuditsForViewer(visible, suppliers, {
      role,
      email,
      allowedIndustries,
      auditorIds: selfAuditorIds,
    })
  }, [auditsAll, auditorsAll, suppliersAll, suppliers, demoKitShown, role, email, allowedIndustries, selfAuditorIds])

  return { audits, auditors, suppliers, role, email, allowedIndustries }
}
