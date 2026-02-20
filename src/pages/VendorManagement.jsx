import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import useVendorStore from '../store/vendorStore'
import './VendorManagement.css'

const STATUS_META = {
  active:           { label: 'Active',    color: '#27ae60', bg: 'rgba(46,204,113,.1)' },
  blocked:          { label: 'Blocked',   color: '#e74c3c', bg: 'rgba(231,76,60,.1)' },
  pending_approval: { label: 'Pending',   color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
  archived:         { label: 'Archived',  color: '#95a5a6', bg: 'rgba(149,165,166,.1)' },
}

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const Stars = ({ value, max = 5 }) => {
  const full = Math.floor(value || 0)
  const half = (value || 0) - full >= 0.3
  return (
    <span className="vm-stars">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} style={{ color: i < full ? '#f5a623' : i === full && half ? '#f5a623' : '#ddd' }}>
          {i < full ? '★' : i === full && half ? '★' : '☆'}
        </span>
      ))}
      <span className="vm-stars-val">{(value || 0).toFixed(1)}</span>
    </span>
  )
}

/* ═══════════════════════════════════════════════════════
 *  VENDOR MANAGEMENT (list + add)
 * ═══════════════════════════════════════════════════════ */
export default function VendorManagement() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const vendors = useVendorStore((s) => s.vendors)
  const stats = useVendorStore((s) => s.getVendorStats)()
  const addVendor = useVendorStore((s) => s.addVendor)
  const approveVendor = useVendorStore((s) => s.approveVendor)
  const blockVendor = useVendorStore((s) => s.blockVendor)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterIndustry, setFilterIndustry] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [feedback, setFeedback] = useState(null)

  /* Add vendor form state */
  const [newVendor, setNewVendor] = useState({
    companyName: '', legalName: '', taxId: '', vatNumber: '', website: '',
    country: '', currency: 'USD', industry: '', categories: '',
    street: '', city: '', state: '', postalCode: '',
    phone: '', contactName: '', contactRole: '', contactEmail: '', contactPhone: '',
    bankName: '', iban: '', bic: '', accountHolder: '', paymentTerms: 'Net 30',
  })

  /* Filtered & sorted vendors */
  const filteredVendors = useMemo(() => {
    let list = [...vendors]
    if (filterStatus !== 'all') list = list.filter((v) => v.status === filterStatus)
    if (filterIndustry !== 'all') list = list.filter((v) => (v.general.industry || []).includes(filterIndustry))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((v) =>
        v.vendorNumber.toLowerCase().includes(q) ||
        v.general.companyName.toLowerCase().includes(q) ||
        (v.general.country || '').toLowerCase().includes(q) ||
        v.contacts.some((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      )
    }
    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }, [vendors, filterStatus, filterIndustry, search])

  const uniqueIndustries = useMemo(() => {
    const set = new Set()
    vendors.forEach((v) => (v.general.industry || []).forEach((i) => set.add(i)))
    return [...set].sort()
  }, [vendors])

  /* Handle add vendor */
  const handleAddVendor = () => {
    if (!newVendor.companyName.trim()) {
      setFeedback({ type: 'error', text: 'Company name is required' })
      setTimeout(() => setFeedback(null), 3000)
      return
    }
    const vendor = addVendor({
      general: {
        companyName: newVendor.companyName,
        legalName: newVendor.legalName || newVendor.companyName,
        taxId: newVendor.taxId,
        vatNumber: newVendor.vatNumber,
        website: newVendor.website,
        country: newVendor.country,
        currency: newVendor.currency,
        industry: newVendor.industry ? newVendor.industry.split(',').map((s) => s.trim()) : [],
        categories: newVendor.categories ? newVendor.categories.split(',').map((s) => s.trim()) : [],
        language: 'en',
      },
      addresses: {
        main: {
          street: newVendor.street, city: newVendor.city, state: newVendor.state,
          postalCode: newVendor.postalCode, country: newVendor.country, phone: newVendor.phone,
        },
      },
      contacts: newVendor.contactName ? [{
        id: `ct-${Date.now()}`, name: newVendor.contactName, role: newVendor.contactRole,
        email: newVendor.contactEmail, phone: newVendor.contactPhone, isPrimary: true,
      }] : [],
      banking: {
        bankName: newVendor.bankName, iban: newVendor.iban, bic: newVendor.bic,
        accountHolder: newVendor.accountHolder || newVendor.companyName,
        paymentTerms: newVendor.paymentTerms, paymentMethod: 'bank_transfer', currency: newVendor.currency,
      },
    })
    setShowAddModal(false)
    setNewVendor({ companyName: '', legalName: '', taxId: '', vatNumber: '', website: '', country: '', currency: 'USD', industry: '', categories: '', street: '', city: '', state: '', postalCode: '', phone: '', contactName: '', contactRole: '', contactEmail: '', contactPhone: '', bankName: '', iban: '', bic: '', accountHolder: '', paymentTerms: 'Net 30' })
    setFeedback({ type: 'success', text: `Vendor ${vendor.vendorNumber} created — pending approval` })
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <AppLayout>
      <div className="vm-page">
        {feedback && <div className={`vm-feedback ${feedback.type}`}>{feedback.text}</div>}

        {/* Header */}
        <div className="vm-header">
          <div>
            <button className="vm-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="vm-title">Vendor Master Data</h1>
            <p className="vm-subtitle">Vendor Registry — Manage all sellers accounts, connections, and evaluation</p>
          </div>
          <button className="vm-btn primary" onClick={() => setShowAddModal(true)}>
            + Create Vendor
          </button>
        </div>

        {/* KPI cards */}
        <div className="vm-kpis">
          <div className="vm-kpi"><div className="vm-kpi-val">{stats.total}</div><div className="vm-kpi-label">Total Vendors</div></div>
          <div className="vm-kpi"><div className="vm-kpi-val" style={{ color: '#27ae60' }}>{stats.active}</div><div className="vm-kpi-label">Active</div></div>
          <div className="vm-kpi"><div className="vm-kpi-val" style={{ color: '#e67e22' }}>{stats.pending}</div><div className="vm-kpi-label">Pending</div></div>
          <div className="vm-kpi"><div className="vm-kpi-val" style={{ color: '#e74c3c' }}>{stats.blocked}</div><div className="vm-kpi-label">Blocked</div></div>
          <div className="vm-kpi"><div className="vm-kpi-val">{stats.totalConnections}</div><div className="vm-kpi-label">Connections</div></div>
          <div className="vm-kpi"><div className="vm-kpi-val" style={{ color: '#000888' }}>${stats.totalSpend.toLocaleString()}</div><div className="vm-kpi-label">Total Spend</div></div>
          <div className="vm-kpi"><div className="vm-kpi-val" style={{ color: '#f5a623' }}>{stats.avgScore}</div><div className="vm-kpi-label">Avg Score</div></div>
        </div>

        {/* Filters */}
        <div className="vm-filters">
          <input className="vm-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search vendor number, company, country, contact..." />
          <select className="vm-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending_approval">Pending</option>
            <option value="blocked">Blocked</option>
            <option value="archived">Archived</option>
          </select>
          <select className="vm-select" value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)}>
            <option value="all">All Industries</option>
            {uniqueIndustries.map((i) => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
          </select>
          <span className="vm-filter-count">{filteredVendors.length} vendors</span>
        </div>

        {/* Vendor table */}
        <div className="vm-table-wrap">
          <table className="vm-table">
            <thead>
              <tr>
                <th>Vendor #</th>
                <th>Company</th>
                <th>Country</th>
                <th>Industry</th>
                <th>Status</th>
                <th>Score</th>
                <th>Connections</th>
                <th>Payment Terms</th>
                <th>Certs</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((v) => {
                const sm = STATUS_META[v.status] || STATUS_META.active
                const primary = v.contacts.find((c) => c.isPrimary) || v.contacts[0]
                return (
                  <tr key={v.id} className="vm-row" onClick={() => navigate(`/vendors/${v.id}`)}>
                    <td className="vm-cell-number">{v.vendorNumber}</td>
                    <td>
                      <div className="vm-cell-company">{v.general.companyName}</div>
                      {primary && <div className="vm-cell-contact">{primary.name} · {primary.email}</div>}
                    </td>
                    <td>{v.general.country}</td>
                    <td>
                      <div className="vm-cell-tags">
                        {(v.general.industry || []).map((i) => (
                          <span key={i} className="vm-mini-tag">{i}</span>
                        ))}
                      </div>
                    </td>
                    <td><span className="vm-status-badge" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span></td>
                    <td>{v.purchasing.overallScore > 0 ? <Stars value={v.purchasing.overallScore} /> : <span className="vm-no-data">—</span>}</td>
                    <td className="vm-cell-num">{v.connections.length}</td>
                    <td>{v.purchasing.paymentTerms}</td>
                    <td className="vm-cell-num">{v.certifications.length}</td>
                    <td className="vm-cell-date">{fmtDate(v.updatedAt)}</td>
                    <td>
                      <div className="vm-row-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="vm-btn-sm blue" onClick={() => navigate(`/vendors/${v.id}`)}>View</button>
                        {v.status === 'pending_approval' && (
                          <button className="vm-btn-sm green" onClick={() => {
                            approveVendor(v.id)
                            setFeedback({ type: 'success', text: `${v.vendorNumber} approved` })
                            setTimeout(() => setFeedback(null), 3000)
                          }}>Approve</button>
                        )}
                        {v.status === 'active' && (
                          <button className="vm-btn-sm red" onClick={() => {
                            blockVendor(v.id, 'Blocked by admin')
                            setFeedback({ type: 'success', text: `${v.vendorNumber} blocked` })
                            setTimeout(() => setFeedback(null), 3000)
                          }}>Block</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredVendors.length === 0 && <div className="vm-empty">No vendors match your filters.</div>}
        </div>

        {/* ── ADD VENDOR MODAL ──────────────────────────────── */}
        {showAddModal && (
          <div className="vm-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="vm-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="vm-modal-title">Create New Vendor</h2>
              <p className="vm-modal-desc">A unique vendor account number (VEND-XXXX) will be auto-assigned.</p>

              <div className="vm-modal-section">
                <h4>General Information</h4>
                <div className="vm-modal-grid">
                  <div className="vm-field"><label>Company Name *</label><input value={newVendor.companyName} onChange={(e) => setNewVendor({ ...newVendor, companyName: e.target.value })} placeholder="e.g. Supplier GmbH" /></div>
                  <div className="vm-field"><label>Legal Name</label><input value={newVendor.legalName} onChange={(e) => setNewVendor({ ...newVendor, legalName: e.target.value })} placeholder="Full legal entity name" /></div>
                  <div className="vm-field"><label>Tax ID</label><input value={newVendor.taxId} onChange={(e) => setNewVendor({ ...newVendor, taxId: e.target.value })} /></div>
                  <div className="vm-field"><label>VAT Number</label><input value={newVendor.vatNumber} onChange={(e) => setNewVendor({ ...newVendor, vatNumber: e.target.value })} /></div>
                  <div className="vm-field"><label>Website</label><input value={newVendor.website} onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })} placeholder="https://" /></div>
                  <div className="vm-field"><label>Country</label><input value={newVendor.country} onChange={(e) => setNewVendor({ ...newVendor, country: e.target.value })} /></div>
                  <div className="vm-field"><label>Currency</label><select value={newVendor.currency} onChange={(e) => setNewVendor({ ...newVendor, currency: e.target.value })}><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="CHF">CHF</option><option value="JPY">JPY</option><option value="CNY">CNY</option></select></div>
                  <div className="vm-field"><label>Industries (comma sep.)</label><input value={newVendor.industry} onChange={(e) => setNewVendor({ ...newVendor, industry: e.target.value })} placeholder="automotive, medical" /></div>
                </div>
              </div>

              <div className="vm-modal-section">
                <h4>Address</h4>
                <div className="vm-modal-grid">
                  <div className="vm-field full"><label>Street</label><input value={newVendor.street} onChange={(e) => setNewVendor({ ...newVendor, street: e.target.value })} /></div>
                  <div className="vm-field"><label>City</label><input value={newVendor.city} onChange={(e) => setNewVendor({ ...newVendor, city: e.target.value })} /></div>
                  <div className="vm-field"><label>State / Region</label><input value={newVendor.state} onChange={(e) => setNewVendor({ ...newVendor, state: e.target.value })} /></div>
                  <div className="vm-field"><label>Postal Code</label><input value={newVendor.postalCode} onChange={(e) => setNewVendor({ ...newVendor, postalCode: e.target.value })} /></div>
                  <div className="vm-field"><label>Phone</label><input value={newVendor.phone} onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })} /></div>
                </div>
              </div>

              <div className="vm-modal-section">
                <h4>Primary Contact</h4>
                <div className="vm-modal-grid">
                  <div className="vm-field"><label>Contact Name</label><input value={newVendor.contactName} onChange={(e) => setNewVendor({ ...newVendor, contactName: e.target.value })} /></div>
                  <div className="vm-field"><label>Role / Title</label><input value={newVendor.contactRole} onChange={(e) => setNewVendor({ ...newVendor, contactRole: e.target.value })} /></div>
                  <div className="vm-field"><label>Email</label><input value={newVendor.contactEmail} onChange={(e) => setNewVendor({ ...newVendor, contactEmail: e.target.value })} /></div>
                  <div className="vm-field"><label>Phone</label><input value={newVendor.contactPhone} onChange={(e) => setNewVendor({ ...newVendor, contactPhone: e.target.value })} /></div>
                </div>
              </div>

              <div className="vm-modal-section">
                <h4>Banking & Payment</h4>
                <div className="vm-modal-grid">
                  <div className="vm-field"><label>Bank Name</label><input value={newVendor.bankName} onChange={(e) => setNewVendor({ ...newVendor, bankName: e.target.value })} /></div>
                  <div className="vm-field"><label>IBAN</label><input value={newVendor.iban} onChange={(e) => setNewVendor({ ...newVendor, iban: e.target.value })} /></div>
                  <div className="vm-field"><label>BIC / SWIFT</label><input value={newVendor.bic} onChange={(e) => setNewVendor({ ...newVendor, bic: e.target.value })} /></div>
                  <div className="vm-field"><label>Payment Terms</label><select value={newVendor.paymentTerms} onChange={(e) => setNewVendor({ ...newVendor, paymentTerms: e.target.value })}><option>Net 15</option><option>Net 30</option><option>Net 45</option><option>Net 60</option><option>Net 90</option><option>Prepayment</option><option>COD</option></select></div>
                </div>
              </div>

              <div className="vm-modal-actions">
                <button className="vm-btn secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button className="vm-btn primary" onClick={handleAddVendor}>Create Vendor</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
