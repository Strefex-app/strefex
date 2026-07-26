import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import supplierOwnershipService from '../services/supplierOwnershipService'
import { useAuthStore } from '../store/authStore'
import { isSupabaseConfigured, platformRegisteredSuppliersService } from '../services/supabaseService'
import '../styles/app-page.css'

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
  const location = useLocation()
  const query = useQuery()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const requestedSupplierId = query.get('supplierId')
  const [membershipsLoading, setMembershipsLoading] = useState(true)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [memberships, setMemberships] = useState([])
  const [supplierId, setSupplierId] = useState(requestedSupplierId || '')
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [registryPreview, setRegistryPreview] = useState([])
  const [registryTotal, setRegistryTotal] = useState(0)
  const [profileDraft, setProfileDraft] = useState({ description: '', website: '', contactEmail: '', phone: '' })
  const [productDraft, setProductDraft] = useState(emptyProduct)
  const [certDraft, setCertDraft] = useState(emptyCertification)

  /* URL ?supplierId= wins over default membership */
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('supplierId')
    if (id) setSupplierId(id)
  }, [location.search])

  const loadMemberships = useCallback(async () => {
    setMembershipsLoading(true)
    try {
      const rows = await supplierOwnershipService.listMyMemberships()
      setMemberships(Array.isArray(rows) ? rows : [])
      const fromUrl = new URLSearchParams(location.search).get('supplierId')
      if (!fromUrl && Array.isArray(rows) && rows.length > 0) {
        setSupplierId((prev) => prev || rows[0].supplier_id)
      }
    } finally {
      setMembershipsLoading(false)
    }
  }, [location.search])

  const loadSnapshot = useCallback(async (id) => {
    if (!id) return
    setSnapshotLoading(true)
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
      setSnapshot(null)
      setError(err?.message || 'Failed to load supplier dashboard.')
    } finally {
      setSnapshotLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMemberships()
  }, [loadMemberships])

  useEffect(() => {
    if (!isSuperAdmin || !isSupabaseConfigured) {
      setRegistryPreview([])
      setRegistryTotal(0)
      return
    }
    void (async () => {
      try {
        const [rows, total] = await Promise.all([
          platformRegisteredSuppliersService.list(null, {
            orderBy: 'company_name',
            ascending: true,
            limit: 12,
          }),
          platformRegisteredSuppliersService.count(null).catch(() => 0),
        ])
        setRegistryPreview(Array.isArray(rows) ? rows : [])
        setRegistryTotal(typeof total === 'number' ? total : 0)
      } catch {
        setRegistryPreview([])
        setRegistryTotal(0)
      }
    })()
  }, [isSuperAdmin])

  useEffect(() => {
    if (!supplierId) return
    void loadSnapshot(supplierId)
  }, [supplierId, loadSnapshot])

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

  if (membershipsLoading) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <h2 className="app-page-title">Supplier Dashboard</h2>
            <p className="app-page-subtitle">Loading your workspace…</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!supplierId) {
    return (
      <AppLayout>
        <div className="app-page">
          <button type="button" className="app-page-back-link" onClick={() => navigate('/hub/partner')}>
          ← Manufacturers
          </button>
          {isSuperAdmin && (
            <div className="app-page-card app-page-callout" style={{ marginBottom: 16 }}>
              <h2 className="app-page-title">Supplier directory (platform registry)</h2>
              <p className="app-page-subtitle">
                This list is the same data as <strong>Supplier directory</strong> under Buyer Workspace — buyer-directory layout,
                mirrored Plastic/Stamping contacts, and your Excel imports. It is not the same as a <em>claimed</em> supplier
                profile below.
              </p>
              <p className="app-page-subtitle">
                <strong>{registryTotal}</strong> contact{registryTotal === 1 ? '' : 's'} in registry.
              </p>
              <Link to="/dashboard/buyer/registered-suppliers" className="app-page-btn-primary">
                Open full supplier directory
              </Link>
              {registryPreview.length > 0 && (
                <div className="buyer-dir-table-wrap" style={{ marginTop: 16 }}>
                  <table className="buyer-dir-table">
                    <thead>
                      <tr>
                        <th>Segment</th>
                        <th>Company</th>
                        <th>Country</th>
                        <th>Contact</th>
                        <th>Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registryPreview.map((r) => (
                        <tr key={r.id}>
                          <td>{r.segment || '—'}</td>
                          <td>{r.company_name}</td>
                          <td>{r.country}</td>
                          <td>{r.contact_name || '—'}</td>
                          <td>{r.email || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <div className="app-page-card">
            <h2 className="app-page-title">Supplier Dashboard</h2>
            <p className="app-page-subtitle">
              No claimed supplier profile found for your account. Claim a vendor/supplier to manage products and certifications here.
            </p>
            <button type="button" className="app-page-btn-primary" onClick={() => navigate('/vendors')}>
              Browse Suppliers
            </button>
            {isSuperAdmin && (
              <p className="app-page-subtitle" style={{ marginTop: 16 }}>
                Superadmin: use <Link to="/dashboard/supplier">Supplier Workspace</Link> for memberships, or open the directory above.
              </p>
            )}
          </div>
        </div>
      </AppLayout>
    )
  }

  if (snapshotLoading && !snapshot) {
    return (
      <AppLayout>
        <div className="app-page">
          <button type="button" className="app-page-back-link" onClick={() => navigate('/hub/partner')}>
          ← Manufacturers
          </button>
          <div className="app-page-card">
            <h2 className="app-page-title">Supplier Dashboard</h2>
            <p className="app-page-subtitle">Loading supplier profile…</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (supplierId && !snapshotLoading && !snapshot && error) {
    return (
      <AppLayout>
        <div className="app-page">
          <button type="button" className="app-page-back-link" onClick={() => navigate('/hub/partner')}>
          ← Manufacturers
          </button>
          <div className="app-page-card">
            <h2 className="app-page-title">Supplier Dashboard</h2>
            <p className="app-page-alert app-page-alert--error" role="alert">
              {error}
            </p>
            <div className="app-page-btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="app-page-btn-primary" onClick={() => void loadSnapshot(supplierId)}>
                Retry
              </button>
              <button type="button" className="app-page-btn-outline" onClick={() => navigate('/vendors')}>
                Browse suppliers
              </button>
            </div>
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
      <div className="app-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate('/hub/partner')}>
          ← Manufacturers
        </button>

        {isSuperAdmin && (
          <div className="app-page-card app-page-callout" style={{ marginBottom: 12 }}>
            <p className="app-page-subtitle" style={{ margin: 0 }}>
              <strong>Supplier directory:</strong>{' '}
              <Link to="/dashboard/buyer/registered-suppliers">Open platform registry</Link>
              {' '}({registryTotal} contacts) — same layout as buyer directory; Excel/XLSX imports go there.
            </p>
          </div>
        )}

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
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8 }}>Switch claimed supplier</label>
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
                      <div style={{ fontWeight: 600 }}>{p.product_name}</div>
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
                  <div style={{ fontWeight: 600 }}>{c.certification_name}</div>
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
