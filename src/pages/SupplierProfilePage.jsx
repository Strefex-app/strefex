import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import supplierOwnershipService from '../services/supplierOwnershipService'

const VERIFY_METHODS = [
  { id: 'email_domain', label: 'Auto-verify by business domain' },
  { id: 'manual', label: 'Manual review by platform admin' },
  { id: 'document', label: 'Document-based verification' },
]

export default function SupplierProfilePage() {
  const { supplierId } = useParams()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [loading, setLoading] = useState(true)
  const [claimSubmitting, setClaimSubmitting] = useState(false)
  const [claimMethod, setClaimMethod] = useState('email_domain')
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [snapshot, setSnapshot] = useState(null)

  const loadSnapshot = async () => {
    if (!supplierId) return
    setLoading(true)
    setError('')
    try {
      const data = await supplierOwnershipService.getSupplierSnapshot(supplierId)
      setSnapshot(data)
    } catch (err) {
      setError(err?.message || 'Failed to load supplier profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSnapshot()
  }, [supplierId])

  const canEdit = useMemo(
    () => snapshot?.myMemberRole === 'admin' || snapshot?.myMemberRole === 'editor',
    [snapshot]
  )

  const handleClaim = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setClaimSubmitting(true)
    setError('')
    setMessage('')
    try {
      await supplierOwnershipService.submitClaim({
        supplierId,
        verificationMethod: claimMethod,
      })
      setMessage('Claim submitted successfully. You will be notified after review.')
      setShowClaimForm(false)
      await loadSnapshot()
    } catch (err) {
      setError(err?.message || 'Unable to submit claim.')
    } finally {
      setClaimSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <h2 className="app-page-title">Supplier Profile</h2>
            <p className="app-page-subtitle">Loading profile...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const vendor = snapshot?.vendor || {}
  const profile = snapshot?.profile || {}
  const products = snapshot?.products || []
  const certs = snapshot?.certifications || []
  const completeness = Number(profile?.profile_completeness || 0)
  const overallScore = Number(vendor?.purchasing?.overallScore || 0)
  const riskLevel = String(vendor?.metadata?.risk_level || vendor?.purchasing?.riskLevel || 'Not provided')

  return (
    <AppLayout>
      <div className="app-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="app-page-card">
          <h2 className="app-page-title">{vendor?.general?.companyName || 'Supplier Profile'}</h2>
          <p className="app-page-subtitle">Trusted supplier data with ownership verification and audit traceability.</p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className="app-page-chip">Completeness: {completeness}%</span>
            <span className="app-page-chip">Claim status: {snapshot?.isClaimed ? 'Claimed' : 'Unclaimed'}</span>
            {snapshot?.myMemberRole && <span className="app-page-chip">Your role: {snapshot.myMemberRole}</span>}
          </div>

          {!snapshot?.isClaimed && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="app-page-btn-primary" onClick={() => setShowClaimForm((s) => !s)}>
                {showClaimForm ? 'Cancel claim request' : 'Claim Company Profile'}
              </button>
            </div>
          )}

          {canEdit && (
            <div style={{ marginTop: 12 }}>
              <button type="button" className="app-page-btn-primary" onClick={() => navigate(`/supplier-dashboard?supplierId=${supplierId}`)}>
                Open Supplier Dashboard
              </button>
            </div>
          )}

          {showClaimForm && (
            <form onSubmit={handleClaim} style={{ marginTop: 14, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Verification method</label>
              <select
                value={claimMethod}
                onChange={(e) => setClaimMethod(e.target.value)}
                style={{ width: '100%', marginBottom: 12 }}
              >
                {VERIFY_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <button type="submit" className="app-page-btn-primary" disabled={claimSubmitting}>
                {claimSubmitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </form>
          )}

          {error && <p style={{ color: '#b42318', marginTop: 10 }}>{error}</p>}
          {message && <p style={{ color: '#067647', marginTop: 10 }}>{message}</p>}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Overview</h3>
          <p className="app-page-subtitle">{profile.description || 'No supplier description provided yet.'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
            <div><strong>Website:</strong> {profile.website || '—'}</div>
            <div><strong>Contact Email:</strong> {profile.contact_email || '—'}</div>
            <div><strong>Phone:</strong> {profile.phone || '—'}</div>
            <div><strong>Country:</strong> {vendor?.general?.country || '—'}</div>
          </div>
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Products</h3>
          {products.length === 0 ? (
            <p className="app-page-subtitle">No products published yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {products.map((p) => (
                <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                  <div style={{ fontSize: 13, color: '#475467' }}>
                    {p.category || 'No category'} · {p.material || 'No material'} · {p.manufacturing_process || 'No process'}
                  </div>
                  {p.description && <div style={{ marginTop: 6 }}>{p.description}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Certifications</h3>
          {certs.length === 0 ? (
            <p className="app-page-subtitle">No certifications submitted yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {certs.map((c) => (
                <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontWeight: 600 }}>{c.certification_name}</div>
                  <div style={{ fontSize: 13, color: '#475467' }}>
                    {c.issuing_body || 'No issuing body'} · valid until {c.valid_until || '—'}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <strong>Status:</strong> {c.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Audit & Risk (System Data)</h3>
          <p className="app-page-subtitle">Read-only system-controlled data.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
            <div><strong>Audit Score:</strong> {overallScore > 0 ? overallScore.toFixed(1) : 'Not available'}</div>
            <div><strong>Risk Level:</strong> {riskLevel}</div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
