import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import supplierOwnershipService from '../services/supplierOwnershipService'

const emptyProduct = {
  productName: '',
  category: '',
  manufacturingProcess: '',
  material: '',
  description: '',
}

const emptyCertification = {
  certificationName: '',
  issuingBody: '',
  validUntil: '',
}

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function SupplierDashboard() {
  const navigate = useNavigate()
  const query = useQuery()
  const requestedSupplierId = query.get('supplierId')
  const [loading, setLoading] = useState(true)
  const [memberships, setMemberships] = useState([])
  const [supplierId, setSupplierId] = useState(requestedSupplierId || '')
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [profileDraft, setProfileDraft] = useState({ description: '', website: '', contactEmail: '', phone: '' })
  const [productDraft, setProductDraft] = useState(emptyProduct)
  const [certDraft, setCertDraft] = useState(emptyCertification)

  const loadMemberships = async () => {
    const rows = await supplierOwnershipService.listMyMemberships()
    setMemberships(Array.isArray(rows) ? rows : [])
    if (!supplierId && Array.isArray(rows) && rows.length > 0) {
      setSupplierId(rows[0].supplier_id)
    }
  }

  const loadSnapshot = async (id) => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const data = await supplierOwnershipService.getSupplierSnapshot(id)
      setSnapshot(data)
      setProfileDraft({
        description: data?.profile?.description || '',
        website: data?.profile?.website || '',
        contactEmail: data?.profile?.contact_email || '',
        phone: data?.profile?.phone || '',
      })
    } catch (err) {
      setError(err?.message || 'Failed to load supplier dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadMemberships()
  }, [])

  useEffect(() => {
    if (supplierId) {
      void loadSnapshot(supplierId)
    }
  }, [supplierId])

  const role = useMemo(() => {
    const found = memberships.find((m) => m.supplier_id === supplierId)
    return found?.role || ''
  }, [memberships, supplierId])

  const canWrite = role === 'admin' || role === 'editor'

  const handleSaveProfile = async () => {
    if (!supplierId) return
    setError('')
    setMessage('')
    try {
      await supplierOwnershipService.upsertProfile({
        supplierId,
        description: profileDraft.description,
        website: profileDraft.website,
        contactEmail: profileDraft.contactEmail,
        phone: profileDraft.phone,
      })
      setMessage('Supplier overview updated.')
      await loadSnapshot(supplierId)
    } catch (err) {
      setError(err?.message || 'Unable to save profile.')
    }
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!supplierId || !productDraft.productName.trim()) return
    setError('')
    setMessage('')
    try {
      await supplierOwnershipService.addProduct({
        supplierId,
        ...productDraft,
      })
      setProductDraft(emptyProduct)
      setMessage('Product added to portfolio.')
      await loadSnapshot(supplierId)
    } catch (err) {
      setError(err?.message || 'Unable to add product.')
    }
  }

  const handleDeleteProduct = async (id) => {
    setError('')
    setMessage('')
    try {
      await supplierOwnershipService.deleteProduct(id)
      setMessage('Product removed.')
      await loadSnapshot(supplierId)
    } catch (err) {
      setError(err?.message || 'Unable to remove product.')
    }
  }

  const handleSubmitCertification = async (e) => {
    e.preventDefault()
    if (!supplierId || !certDraft.certificationName.trim()) return
    setError('')
    setMessage('')
    try {
      await supplierOwnershipService.submitCertification({
        supplierId,
        ...certDraft,
      })
      setCertDraft(emptyCertification)
      setMessage('Certification submitted for review.')
      await loadSnapshot(supplierId)
    } catch (err) {
      setError(err?.message || 'Unable to submit certification.')
    }
  }

  if (loading && !snapshot) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <h2 className="app-page-title">Supplier Dashboard</h2>
            <p className="app-page-subtitle">Loading dashboard...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!supplierId) {
    return (
      <AppLayout>
        <div className="app-page" style={{ maxWidth: 960, margin: '0 auto' }}>
          <div className="app-page-card">
            <h2 className="app-page-title">Supplier Dashboard</h2>
            <p className="app-page-subtitle">No claimed supplier profile found for your account.</p>
            <button type="button" className="app-page-btn-primary" onClick={() => navigate('/vendors')}>
              Browse Suppliers
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  const vendorName = snapshot?.vendor?.general?.companyName || 'Supplier'
  const products = snapshot?.products || []
  const certs = snapshot?.certifications || []
  const completeness = Number(snapshot?.profile?.profile_completeness || 0)
  const score = Number(snapshot?.vendor?.purchasing?.overallScore || 0)
  const risk = String(snapshot?.vendor?.metadata?.risk_level || snapshot?.vendor?.purchasing?.riskLevel || 'Not provided')

  return (
    <AppLayout>
      <div className="app-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button type="button" className="app-page-back-link" onClick={() => navigate(-1)}>← Back</button>

        <div className="app-page-card">
          <h2 className="app-page-title">Supplier Dashboard — {vendorName}</h2>
          <p className="app-page-subtitle">Ownership-managed supplier profile with governed certifications and traceable changes.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className="app-page-chip">Role: {role || 'viewer'}</span>
            <span className="app-page-chip">Completeness: {completeness}%</span>
            <span className="app-page-chip">Products: {products.length}</span>
            <span className="app-page-chip">Certifications: {certs.length}</span>
          </div>
          {completeness < 60 && (
            <p style={{ color: '#b42318', marginTop: 8 }}>
              Profile completeness must be at least 60% to fully participate in RFQs.
            </p>
          )}
          {error && <p style={{ color: '#b42318', marginTop: 10 }}>{error}</p>}
          {message && <p style={{ color: '#067647', marginTop: 10 }}>{message}</p>}
        </div>

        {memberships.length > 1 && (
          <div className="app-page-card">
            <label style={{ display: 'block', fontWeight: 700, marginBottom: 8 }}>Switch claimed supplier</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} style={{ width: '100%' }}>
              {memberships.map((m) => (
                <option key={m.id || `${m.supplier_id}-${m.user_id}`} value={m.supplier_id}>
                  {m.supplier_id} · {m.role}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Overview</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <textarea
              value={profileDraft.description}
              onChange={(e) => setProfileDraft((s) => ({ ...s, description: e.target.value }))}
              placeholder="Company description"
              rows={4}
              disabled={!canWrite}
            />
            <input
              value={profileDraft.website}
              onChange={(e) => setProfileDraft((s) => ({ ...s, website: e.target.value }))}
              placeholder="Website"
              disabled={!canWrite}
            />
            <input
              value={profileDraft.contactEmail}
              onChange={(e) => setProfileDraft((s) => ({ ...s, contactEmail: e.target.value }))}
              placeholder="Contact Email"
              disabled={!canWrite}
            />
            <input
              value={profileDraft.phone}
              onChange={(e) => setProfileDraft((s) => ({ ...s, phone: e.target.value }))}
              placeholder="Phone"
              disabled={!canWrite}
            />
          </div>
          {canWrite && (
            <button type="button" className="app-page-btn-primary" onClick={handleSaveProfile} style={{ marginTop: 10 }}>
              Save Overview
            </button>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Products</h3>
          {products.length === 0 ? (
            <p className="app-page-subtitle">No products yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {products.map((p) => (
                <div key={p.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.product_name}</div>
                      <div style={{ fontSize: 13, color: '#475467' }}>
                        {p.category || 'No category'} · {p.material || 'No material'} · {p.manufacturing_process || 'No process'}
                      </div>
                      {p.description && <div style={{ marginTop: 6 }}>{p.description}</div>}
                    </div>
                    {canWrite && (
                      <button type="button" className="app-page-btn-outline" onClick={() => handleDeleteProduct(p.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {canWrite && (
            <form onSubmit={handleAddProduct} style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <input value={productDraft.productName} onChange={(e) => setProductDraft((s) => ({ ...s, productName: e.target.value }))} placeholder="Product name *" />
              <input value={productDraft.category} onChange={(e) => setProductDraft((s) => ({ ...s, category: e.target.value }))} placeholder="Category" />
              <input value={productDraft.manufacturingProcess} onChange={(e) => setProductDraft((s) => ({ ...s, manufacturingProcess: e.target.value }))} placeholder="Manufacturing process" />
              <input value={productDraft.material} onChange={(e) => setProductDraft((s) => ({ ...s, material: e.target.value }))} placeholder="Material" />
              <textarea value={productDraft.description} onChange={(e) => setProductDraft((s) => ({ ...s, description: e.target.value }))} placeholder="Description" rows={3} />
              <button type="submit" className="app-page-btn-primary">Add Product</button>
            </form>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Certifications (Approval Required)</h3>
          {certs.length === 0 ? (
            <p className="app-page-subtitle">No certifications submitted.</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {certs.map((c) => (
                <div key={c.id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontWeight: 700 }}>{c.certification_name}</div>
                  <div style={{ fontSize: 13, color: '#475467' }}>{c.issuing_body || 'No issuing body'} · valid until {c.valid_until || '—'}</div>
                  <div style={{ marginTop: 6 }}><strong>Status:</strong> {c.status}</div>
                </div>
              ))}
            </div>
          )}
          {canWrite && (
            <form onSubmit={handleSubmitCertification} style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <input value={certDraft.certificationName} onChange={(e) => setCertDraft((s) => ({ ...s, certificationName: e.target.value }))} placeholder="Certification name *" />
              <input value={certDraft.issuingBody} onChange={(e) => setCertDraft((s) => ({ ...s, issuingBody: e.target.value }))} placeholder="Issuing body" />
              <input type="date" value={certDraft.validUntil} onChange={(e) => setCertDraft((s) => ({ ...s, validUntil: e.target.value }))} />
              <button type="submit" className="app-page-btn-primary">Submit Certification</button>
            </form>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="app-page-title" style={{ fontSize: 20 }}>Audit & Risk (Read-only)</h3>
          <p className="app-page-subtitle">System-managed fields cannot be edited by supplier users.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
            <div><strong>Audit Score:</strong> {score > 0 ? score.toFixed(1) : 'Not available'}</div>
            <div><strong>Risk Level:</strong> {risk}</div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
