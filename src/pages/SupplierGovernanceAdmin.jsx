import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import supplierOwnershipService from '../services/supplierOwnershipService'
import '../styles/app-page.css'
import './SuperAdminDashboard.css'
import './AdminHubPages.css'

export default function SupplierGovernanceAdmin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState([])
  const [certifications, setCertifications] = useState([])
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [pendingClaims, pendingCerts] = await Promise.all([
        supplierOwnershipService.listPendingClaims(),
        supplierOwnershipService.listPendingCertifications(),
      ])
      setClaims(Array.isArray(pendingClaims) ? pendingClaims : [])
      setCertifications(Array.isArray(pendingCerts) ? pendingCerts : [])
    } catch (err) {
      setError(err?.message || 'Failed to load supplier governance queue.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const bySupplierClaimCount = useMemo(() => {
    const map = new Map()
    claims.forEach((c) => {
      map.set(c.supplier_id, (map.get(c.supplier_id) || 0) + 1)
    })
    return map
  }, [claims])

  const handleClaimAction = async (claimId, approve) => {
    setError('')
    setFeedback('')
    try {
      await supplierOwnershipService.reviewClaim(claimId, { approve })
      setFeedback(approve ? 'Claim approved.' : 'Claim rejected.')
      await load()
    } catch (err) {
      setError(err?.message || 'Failed to review claim.')
    }
  }

  const handleCertificationAction = async (certificationId, verify) => {
    setError('')
    setFeedback('')
    try {
      await supplierOwnershipService.reviewCertification(certificationId, { verify })
      setFeedback(verify ? 'Certification verified.' : 'Certification rejected.')
      await load()
    } catch (err) {
      setError(err?.message || 'Failed to review certification.')
    }
  }

  return (
    <AppLayout>
      <div className="sad-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate('/hub/governance')}>
          ← Admin
        </button>

        <div className="sad-header">
          <div>
            <h1 className="sad-title">Supplier governance</h1>
            <p className="sad-subtitle">
              Review ownership claims and sensitive certification data before verification — supplier master governance.
            </p>
          </div>
          <span className="sad-badge-super">Super Admin</span>
        </div>

        <div className="sad-kpis">
          <div className="sad-kpi">
            <div className="sad-kpi-icon purple">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span className="sad-kpi-value">{claims.length}</span>
            <span className="sad-kpi-label">Pending claims</span>
          </div>
          <div className="sad-kpi">
            <div className="sad-kpi-icon teal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span className="sad-kpi-value">{certifications.length}</span>
            <span className="sad-kpi-label">Pending certifications</span>
          </div>
          <div className="sad-kpi">
            <div className="sad-kpi-icon blue">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <span className="sad-kpi-value">{claims.length + certifications.length}</span>
            <span className="sad-kpi-label">Queue total</span>
          </div>
        </div>

        {feedback ? (
          <div className="app-page-alert app-page-alert--success" role="status">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="app-page-alert app-page-alert--error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="sad-widget" style={{ marginBottom: 16 }}>
          <h2 className="sad-widget-title">Claim requests</h2>
          {loading ? (
            <div className="ahp-empty">Loading claim queue…</div>
          ) : claims.length === 0 ? (
            <div className="ahp-empty">No pending claim requests.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {claims.map((claim) => (
                <div key={claim.id} className="ahp-queue-card">
                  <div className="ahp-queue-card__row">
                    <div className="ahp-queue-meta">
                      <div>
                        <strong>Supplier ID</strong> {claim.supplier_id}
                      </div>
                      <div>
                        <strong>User ID</strong> {claim.user_id}
                      </div>
                      <div>
                        <strong>Method</strong> {claim.verification_method}
                      </div>
                      <div>
                        <strong>Created</strong> {new Date(claim.created_at).toLocaleString()}
                      </div>
                      <div>
                        <strong>Queue load (supplier)</strong> {bySupplierClaimCount.get(claim.supplier_id) || 1}
                      </div>
                    </div>
                    <div className="ahp-queue-actions">
                      <button type="button" className="ahp-btn-primary" onClick={() => handleClaimAction(claim.id, true)}>
                        Approve
                      </button>
                      <button type="button" className="ahp-btn-outline" onClick={() => handleClaimAction(claim.id, false)}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sad-widget">
          <h2 className="sad-widget-title">Certification review</h2>
          {loading ? (
            <div className="ahp-empty">Loading certification queue…</div>
          ) : certifications.length === 0 ? (
            <div className="ahp-empty">No pending certifications.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {certifications.map((cert) => (
                <div key={cert.id} className="ahp-queue-card">
                  <div className="ahp-queue-card__row">
                    <div className="ahp-queue-meta">
                      <div>
                        <strong>Certification</strong> {cert.certification_name}
                      </div>
                      <div>
                        <strong>Supplier ID</strong> {cert.supplier_id}
                      </div>
                      <div>
                        <strong>Issuing body</strong> {cert.issuing_body || '—'}
                      </div>
                      <div>
                        <strong>Valid until</strong> {cert.valid_until || '—'}
                      </div>
                      <div>
                        <strong>Submitted</strong> {new Date(cert.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="ahp-queue-actions">
                      <button type="button" className="ahp-btn-primary" onClick={() => handleCertificationAction(cert.id, true)}>
                        Verify
                      </button>
                      <button type="button" className="ahp-btn-outline" onClick={() => handleCertificationAction(cert.id, false)}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
