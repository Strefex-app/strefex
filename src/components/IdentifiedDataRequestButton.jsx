import { useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useIdentifiedDataDisclosureStore } from '../store/identifiedDataDisclosureStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { fetchSourcingNetworkAccounts, resetSourcingNetworkFetchCache } from '../services/sourcingNetworkService'
import { isPrivilegedPrivacyRole } from '../utils/accountPrivacy'

/**
 * Buyer asks a seller to open identified contact data (email, phone, person, street).
 */
export default function IdentifiedDataRequestButton({
  targetCompanyId,
  targetCompanyName = '',
  compact = false,
}) {
  const role = useAuthStore((s) => s.role)
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const requesterCompanyId = String(user?.companyId || user?.company_id || tenant?.id || '').trim()
  const records = useIdentifiedDataDisclosureStore((s) => s.records)
  const requestAccess = useIdentifiedDataDisclosureStore((s) => s.requestAccess)
  const hydrateRemote = useIdentifiedDataDisclosureStore((s) => s.hydrateRemote)
  const mergeNetworkAccounts = useAccountRegistry((s) => s.mergeNetworkAccounts)

  const rec = useMemo(() => {
    const key = `${requesterCompanyId}::${String(targetCompanyId || '').trim()}`
    return records.find((r) => `${r.requesterCompanyId}::${r.targetCompanyId}` === key) || null
  }, [records, requesterCompanyId, targetCompanyId])

  useEffect(() => {
    void hydrateRemote()
  }, [hydrateRemote, requesterCompanyId])

  useEffect(() => {
    if (rec?.status !== 'granted') return
    resetSourcingNetworkFetchCache()
    void fetchSourcingNetworkAccounts({ limit: 800, force: true })
      .then((rows) => mergeNetworkAccounts(rows))
      .catch(() => {})
  }, [rec?.status, mergeNetworkAccounts])

  if (!targetCompanyId || isPrivilegedPrivacyRole(role)) return null
  if (!requesterCompanyId || requesterCompanyId === String(targetCompanyId)) return null

  const status = rec?.status
  const label = status === 'granted'
    ? 'Identified data open'
    : status === 'pending'
      ? 'Waiting for seller'
      : status === 'denied'
        ? 'Request again'
        : status === 'revoked'
          ? 'Request again'
          : 'Request identified data'

  return (
    <button
      type="button"
      className={compact ? 'app-page-btn-outline app-page-btn-sm' : 'app-page-btn-outline'}
      disabled={status === 'pending' || status === 'granted'}
      title="Sellers keep contact details closed until they approve your request (GDPR / PIPL / 152-FZ / CCPA)."
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        void requestAccess({
          requesterCompanyId,
          requesterCompanyName: tenant?.name || user?.companyName || '',
          requesterEmail: user?.email || '',
          targetCompanyId: String(targetCompanyId),
          targetCompanyName,
          purpose: 'sourcing',
        })
      }}
    >
      {label}
    </button>
  )
}
