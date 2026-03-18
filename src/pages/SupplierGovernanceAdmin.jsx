import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import supplierOwnershipService from '../services/supplierOwnershipService'

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
      <div className="app-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button type="button" className="app-page-back-link" onClick={() => navigate(-1)}>← Back</button>

        <div className="app-page-card">
          <h2 className="app-page-title">Supplier Governance Admin</h2>
          <p className="app-page-subtitle">Review ownership claims and sensitive certification data before verification.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="app-page-chip">Pending claims: {claims.length}</span>
            <span className="app-page-chip">Pending certifications: {certifications.length}</span>
          </div>
          {feedback && <p style={{ color: '#067647', marginTop: 10 }}>{feedback}</p>}
          {error && <p style={{ color: '#b42318', marginTop: 10 }}>{error}</p>}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Claim Requests</h3>
          {loading ? (
            <p className="app-page-subtitle">Loading claim queue...</p>
          ) : claims.length === 0 ? (
            <p className="app-page-subtitle">No pending claim requests.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {claims.map((claim) => (
                <div key={claim.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div><strong>Supplier ID:</strong> {claim.supplier_id}</div>
                      <div><strong>User ID:</strong> {claim.user_id}</div>
                      <div><strong>Method:</strong> {claim.verification_method}</div>
                      <div><strong>Created:</strong> {new Date(claim.created_at).toLocaleString()}</div>
                      <div><strong>Queue load for supplier:</strong> {bySupplierClaimCount.get(claim.supplier_id) || 1}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button type="button" className="app-page-btn-primary" onClick={() => handleClaimAction(claim.id, true)}>
                        Approve
                      </button>
                      <button type="button" className="app-page-btn-outline" onClick={() => handleClaimAction(claim.id, false)}>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Certification Review</h3>
          {loading ? (
            <p className="app-page-subtitle">Loading certification queue...</p>
          ) : certifications.length === 0 ? (
            <p className="app-page-subtitle">No pending certifications.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {certifications.map((cert) => (
                <div key={cert.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div><strong>Certification:</strong> {cert.certification_name}</div>
                      <div><strong>Supplier ID:</strong> {cert.supplier_id}</div>
                      <div><strong>Issuing Body:</strong> {cert.issuing_body || '—'}</div>
                      <div><strong>Valid Until:</strong> {cert.valid_until || '—'}</div>
                      <div><strong>Submitted:</strong> {new Date(cert.created_at).toLocaleString()}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button type="button" className="app-page-btn-primary" onClick={() => handleCertificationAction(cert.id, true)}>
                        Verify
                      </button>
                      <button type="button" className="app-page-btn-outline" onClick={() => handleCertificationAction(cert.id, false)}>
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
