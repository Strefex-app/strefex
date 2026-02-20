import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import useContractStore from '../store/contractStore'
import { filterByCompanyRole, hasMinRole } from '../utils/companyGuard'
import './ContractDashboard.css'

const TYPE_META = {
  supply: { label: 'Supply', icon: '📦', color: '#2980b9' },
  service: { label: 'Service', icon: '🔧', color: '#27ae60' },
  framework: { label: 'Framework', icon: '📋', color: '#8e44ad' },
  nda: { label: 'NDA', icon: '🔒', color: '#e67e22' },
  license: { label: 'License', icon: '🔑', color: '#1abc9c' },
  lease: { label: 'Lease', icon: '🏢', color: '#34495e' },
  consulting: { label: 'Consulting', icon: '💼', color: '#f39c12' },
  other: { label: 'Other', icon: '📄', color: '#95a5a6' },
}

const STATUS_META = {
  draft: { label: 'Draft', color: '#95a5a6', bg: 'rgba(149,165,166,.1)' },
  pending_approval: { label: 'Pending', color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
  active: { label: 'Active', color: '#27ae60', bg: 'rgba(46,204,113,.1)' },
  expiring_soon: { label: 'Expiring Soon', color: '#e67e22', bg: 'rgba(230,126,34,.12)' },
  expired: { label: 'Expired', color: '#e74c3c', bg: 'rgba(231,76,60,.1)' },
  terminated: { label: 'Terminated', color: '#c0392b', bg: 'rgba(192,57,43,.1)' },
  renewed: { label: 'Renewed', color: '#2980b9', bg: 'rgba(41,128,185,.1)' },
}

const SEVERITY_COLORS = { critical: '#c0392b', high: '#e74c3c', medium: '#e67e22', low: '#3498db' }

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtCurrency = (v, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(v || 0)

export default function ContractDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)

  const rawContracts = useContractStore((s) => s.contracts)
  // Role-based filtering: users see only contracts they own, managers+ see all company contracts
  const contracts = useMemo(() => filterByCompanyRole(rawContracts, { creatorField: 'owner' }), [rawContracts])
  const alerts = useContractStore((s) => s.getAlerts)
  const storeStats = useContractStore((s) => s.stats)
  const renewContract = useContractStore((s) => s.renewContract)
  const terminateContract = useContractStore((s) => s.terminateContract)
  const addContract = useContractStore((s) => s.addContract)

  const [tab, setTab] = useState('overview')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [selectedContract, setSelectedContract] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [newContract, setNewContract] = useState({ title: '', type: 'supply', vendorName: '', category: '', value: 0, currency: 'USD', startDate: '', endDate: '', terms: '', owner: '', department: '' })

  const flash = (msg) => { setFeedback({ text: msg, type: 'success' }); setTimeout(() => setFeedback(null), 3000) }

  const stats = useMemo(() => storeStats(), [contracts])
  const allAlerts = useMemo(() => alerts(), [contracts])

  const filtered = useMemo(() => {
    let r = contracts
    if (statusFilter !== 'all') r = r.filter((c) => c.status === statusFilter)
    if (typeFilter !== 'all') r = r.filter((c) => c.type === typeFilter)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((c) => c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.vendorName || '').toLowerCase().includes(q))
    }
    return r
  }, [contracts, statusFilter, typeFilter, search])

  const daysUntil = (d) => {
    const diff = Math.ceil((new Date(d) - new Date()) / 86400000)
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    if (diff === 0) return 'Today'
    return `${diff}d`
  }

  return (
    <AppLayout>
      <div className="ctr-page">
        {feedback && <div className="ctr-feedback">{feedback.text}</div>}

        <div className="ctr-header">
          <div>
            <button className="ctr-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="ctr-title">Contract Management</h1>
            <p className="ctr-subtitle">Track contracts, renewal alerts & lifecycle management</p>
          </div>
          {hasMinRole('manager') && <button className="ctr-btn primary" onClick={() => setShowNewForm(!showNewForm)}>{showNewForm ? 'Cancel' : '+ New Contract'}</button>}
        </div>

        {/* KPIs */}
        <div className="ctr-kpis">
          <div className="ctr-kpi"><span className="ctr-kpi-n">{stats.total}</span>Total</div>
          <div className="ctr-kpi"><span className="ctr-kpi-n" style={{ color: '#27ae60' }}>{stats.active}</span>Active</div>
          <div className="ctr-kpi"><span className="ctr-kpi-n" style={{ color: '#e67e22' }}>{stats.expiringSoon}</span>Expiring Soon</div>
          <div className="ctr-kpi"><span className="ctr-kpi-n" style={{ color: '#e74c3c' }}>{stats.expired}</span>Expired</div>
          <div className="ctr-kpi"><span className="ctr-kpi-n" style={{ color: '#2980b9' }}>{fmtCurrency(stats.totalValue)}</span>Active Value</div>
          <div className="ctr-kpi"><span className="ctr-kpi-n" style={{ color: '#c0392b' }}>{allAlerts.length}</span>Alerts</div>
        </div>

        {/* Alerts */}
        {allAlerts.length > 0 && tab === 'overview' && (
          <div className="ctr-card ctr-alerts-card">
            <h4>Renewal & Expiry Alerts</h4>
            <div className="ctr-alerts-list">
              {allAlerts.slice(0, 8).map((a, i) => (
                <div key={i} className="ctr-alert-item" style={{ borderLeftColor: SEVERITY_COLORS[a.severity] }}>
                  <span className="ctr-alert-sev" style={{ color: SEVERITY_COLORS[a.severity] }}>{a.severity.toUpperCase()}</span>
                  <span className="ctr-alert-msg">{a.message}</span>
                  <span className="ctr-alert-date">{fmtDate(a.date)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New Contract Form */}
        {showNewForm && (
          <div className="ctr-card">
            <h4 style={{ color: '#000888', margin: '0 0 12px' }}>Add New Contract</h4>
            <div className="ctr-form-grid">
              <div className="ctr-field"><label>Title *</label><input value={newContract.title} onChange={(e) => setNewContract({ ...newContract, title: e.target.value })} /></div>
              <div className="ctr-field"><label>Type</label>
                <select value={newContract.type} onChange={(e) => setNewContract({ ...newContract, type: e.target.value })}>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="ctr-field"><label>Vendor</label><input value={newContract.vendorName} onChange={(e) => setNewContract({ ...newContract, vendorName: e.target.value })} /></div>
              <div className="ctr-field"><label>Value</label><input type="number" value={newContract.value} onChange={(e) => setNewContract({ ...newContract, value: +e.target.value })} /></div>
              <div className="ctr-field"><label>Start Date</label><input type="date" value={newContract.startDate} onChange={(e) => setNewContract({ ...newContract, startDate: e.target.value })} /></div>
              <div className="ctr-field"><label>End Date</label><input type="date" value={newContract.endDate} onChange={(e) => setNewContract({ ...newContract, endDate: e.target.value })} /></div>
              <div className="ctr-field"><label>Owner</label><input value={newContract.owner} onChange={(e) => setNewContract({ ...newContract, owner: e.target.value })} /></div>
              <div className="ctr-field"><label>Department</label><input value={newContract.department} onChange={(e) => setNewContract({ ...newContract, department: e.target.value })} /></div>
              <div className="ctr-field full"><label>Terms</label><textarea value={newContract.terms} onChange={(e) => setNewContract({ ...newContract, terms: e.target.value })} rows={2} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="ctr-btn primary" onClick={() => { addContract({ ...newContract, status: 'active', renewalDate: '', autoRenew: false, renewalTermMonths: 12, priority: 'medium' }); setShowNewForm(false); flash('Contract created') }} disabled={!newContract.title}>Create Contract</button>
              <button className="ctr-btn ghost" onClick={() => setShowNewForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="ctr-tabs">
          {['overview', 'all', 'expiring', 'alerts'].map((t) => (
            <button key={t} className={`ctr-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t === 'overview' ? 'Overview' : t === 'all' ? `All (${contracts.length})` : t === 'expiring' ? `Expiring (${stats.expiringSoon})` : `Alerts (${allAlerts.length})`}</button>
          ))}
        </div>

        {tab !== 'alerts' && tab !== 'overview' && (
          <div className="ctr-filters">
            <input className="ctr-search" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="ctr-filter-group">
              {['all', 'active', 'expiring_soon', 'expired', 'terminated', 'renewed'].map((s) => (
                <button key={s} className={`ctr-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s === 'all' ? 'All' : STATUS_META[s]?.label || s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Contract List */}
        {(tab === 'overview' || tab === 'all' || tab === 'expiring') && (
          <div className="ctr-list">
            {(tab === 'expiring' ? contracts.filter((c) => c.status === 'expiring_soon' || c.status === 'expired') : filtered).map((c) => {
              const tm = TYPE_META[c.type] || TYPE_META.other
              const sm = STATUS_META[c.status] || STATUS_META.draft
              return (
                <div key={c.id} className="ctr-item" onClick={() => setSelectedContract(selectedContract?.id === c.id ? null : c)}>
                  <div className="ctr-item-header">
                    <span className="ctr-item-icon" style={{ color: tm.color }}>{tm.icon}</span>
                    <span className="ctr-item-id">{c.id}</span>
                    <span className="ctr-item-type" style={{ color: tm.color }}>{tm.label}</span>
                    <span className="ctr-item-status" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
                    <span className="ctr-item-value">{c.value > 0 ? fmtCurrency(c.value, c.currency) : '—'}</span>
                    <span className="ctr-item-expiry">{daysUntil(c.endDate)}</span>
                  </div>
                  <div className="ctr-item-title">{c.title}</div>
                  <div className="ctr-item-meta">
                    <span>{c.vendorName}</span>
                    <span>{c.owner}</span>
                    <span>{fmtDate(c.startDate)} — {fmtDate(c.endDate)}</span>
                    {c.autoRenew && <span className="ctr-auto-renew">Auto-Renew</span>}
                  </div>

                  {selectedContract?.id === c.id && (
                    <div className="ctr-detail-expand">
                      <div className="ctr-detail-section">
                        <strong>Terms:</strong> {c.terms || '—'}
                      </div>
                      {c.milestones?.length > 0 && (
                        <div className="ctr-detail-section">
                          <strong>Milestones:</strong>
                          {c.milestones.map((m) => (
                            <div key={m.id} className="ctr-milestone">
                              <span className={`ctr-ms-dot ${m.status}`} />
                              <span>{m.title}</span>
                              <span className="ctr-ms-date">{fmtDate(m.date)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {c.documents?.length > 0 && (
                        <div className="ctr-detail-section">
                          <strong>Documents:</strong>
                          {c.documents.map((d) => <span key={d.id} className="ctr-doc-chip">📄 {d.name}</span>)}
                        </div>
                      )}
                      {c.notes && <div className="ctr-detail-section"><strong>Notes:</strong> {c.notes}</div>}
                      <div className="ctr-detail-actions">
                        {(c.status === 'active' || c.status === 'expiring_soon') && hasMinRole('manager') && (
                          <button className="ctr-btn primary" onClick={(e) => { e.stopPropagation(); renewContract(c.id); flash(`${c.id} renewed`) }}>Renew</button>
                        )}
                        {c.status !== 'terminated' && c.status !== 'expired' && c.status !== 'renewed' && hasMinRole('admin') && (
                          <button className="ctr-btn danger" onClick={(e) => { e.stopPropagation(); terminateContract(c.id, `Terminated by ${user?.email || 'admin'}`); flash(`${c.id} terminated`) }}>Terminate</button>
                        )}
                        {!hasMinRole('manager') && <span style={{ color: '#999', fontSize: 12 }}>Contact your manager to modify contracts</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'alerts' && (
          <div className="ctr-list">
            {allAlerts.map((a, i) => (
              <div key={i} className="ctr-alert-row" style={{ borderLeftColor: SEVERITY_COLORS[a.severity] }}>
                <span className="ctr-alert-sev" style={{ color: SEVERITY_COLORS[a.severity] }}>{a.severity.toUpperCase()}</span>
                <span className="ctr-alert-type">{a.type.replace(/_/g, ' ')}</span>
                <span className="ctr-alert-msg">{a.message}</span>
                <span className="ctr-alert-date">{fmtDate(a.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
