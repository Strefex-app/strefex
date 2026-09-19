import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useIdentifiedDataDisclosureStore } from '../store/identifiedDataDisclosureStore'

function fmtWhen(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

/**
 * Seller / company admin: grant or revoke identified contact data for a requesting buyer.
 */
export default function IdentifiedDataInbox() {
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const myCompanyId = String(user?.companyId || user?.company_id || tenant?.id || '').trim()
  const records = useIdentifiedDataDisclosureStore((s) => s.records)
  const hydrateRemote = useIdentifiedDataDisclosureStore((s) => s.hydrateRemote)
  const decide = useIdentifiedDataDisclosureStore((s) => s.decide)

  useEffect(() => {
    void hydrateRemote()
  }, [hydrateRemote, myCompanyId])

  if (!myCompanyId) return null

  const incoming = records.filter((r) => r.targetCompanyId === myCompanyId)

  return (
    <div className="prof-card prof-disclosure-card">
      <h3 className="prof-card-title">Identified data requests</h3>
      <p className="prof-card-subtitle">
        Other companies see your legal name, country, city, and industry. Email, phone,
        contact person, and street address stay closed until you open them for a requesting buyer.
      </p>
      {incoming.length === 0 ? (
        <p className="prof-card-subtitle" style={{ marginTop: 8 }}>No buyer requests yet.</p>
      ) : (
        <ul className="prof-disclosure-list">
          {incoming.map((r) => (
            <li key={r.id} className="prof-disclosure-item">
              <div className="prof-disclosure-copy">
                <strong className="stx-text-wrap">
                  {r.requesterCompanyName || 'Buyer'}
                </strong>
                <span className="prof-card-subtitle stx-text-wrap">
                  {r.status === 'granted' ? 'Open for this buyer' : r.status === 'pending' ? 'Waiting for your decision' : r.status}
                  {r.requestedAt ? ` · ${fmtWhen(r.requestedAt)}` : ''}
                </span>
              </div>
              <div className="prof-disclosure-actions">
                {r.status !== 'granted' ? (
                  <button
                    type="button"
                    className="prof-btn-primary"
                    onClick={() => void decide(r.requesterCompanyId, r.targetCompanyId, 'granted')}
                  >
                    Open data
                  </button>
                ) : (
                  <button
                    type="button"
                    className="prof-btn-outline"
                    onClick={() => void decide(r.requesterCompanyId, r.targetCompanyId, 'revoked')}
                  >
                    Close data
                  </button>
                )}
                {r.status === 'pending' ? (
                  <button
                    type="button"
                    className="prof-btn-outline"
                    onClick={() => void decide(r.requesterCompanyId, r.targetCompanyId, 'denied')}
                  >
                    Decline
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
