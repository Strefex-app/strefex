import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import useProcurementStore from '../store/procurementStore'
import useAuditStore from '../store/auditStore'
import { filterByCompanyRole, canApprove as guardCanApprove } from '../utils/companyGuard'
import './ProcurementDashboard.css'

const STATUS_META = {
  draft:            { label: 'Draft',           color: '#95a5a6', bg: 'rgba(149,165,166,.1)' },
  pending_manager:  { label: 'Pending Manager', color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
  pending_admin:    { label: 'Pending Admin',   color: '#e67e22', bg: 'rgba(230,126,34,.1)' },
  pending_finance:  { label: 'Pending Finance', color: '#8e44ad', bg: 'rgba(142,68,173,.1)' },
  approved:         { label: 'Approved',        color: '#27ae60', bg: 'rgba(46,204,113,.1)' },
  rejected:         { label: 'Rejected',        color: '#e74c3c', bg: 'rgba(231,76,60,.1)' },
  completed:        { label: 'Completed',       color: '#2980b9', bg: 'rgba(41,128,185,.1)' },
}

const PRIORITY_META = {
  low:      { label: 'Low',      color: '#27ae60' },
  medium:   { label: 'Medium',   color: '#e67e22' },
  high:     { label: 'High',     color: '#e74c3c' },
  critical: { label: 'Critical', color: '#c0392b' },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const fmtCurrency = (v, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(v || 0)

export default function ProcurementDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const userName = user?.name || user?.email || 'User'
  const role = useAuthStore((s) => s.role)

  const rawRequisitions = useProcurementStore((s) => s.requisitions)
  const rawPurchaseOrders = useProcurementStore((s) => s.purchaseOrders)

  // Role-based data filtering: users see only own PRs/POs, managers see department, admin sees all company
  const requisitions = useMemo(() => filterByCompanyRole(rawRequisitions, { creatorField: 'requester', departmentField: 'department' }), [rawRequisitions])
  const purchaseOrders = useMemo(() => filterByCompanyRole(rawPurchaseOrders, { creatorField: 'requester', departmentField: 'department' }), [rawPurchaseOrders])
  const storeStats = useProcurementStore((s) => s.stats)
  const submitPR = useProcurementStore((s) => s.submitPR)
  const approvePR = useProcurementStore((s) => s.approvePR)
  const rejectPR = useProcurementStore((s) => s.rejectPR)
  const approvePO = useProcurementStore((s) => s.approvePO)
  const rejectPO = useProcurementStore((s) => s.rejectPO)
  const createPOFromPR = useProcurementStore((s) => s.createPOFromPR)
  const createPR = useProcurementStore((s) => s.createPR)
  const createPO = useProcurementStore((s) => s.createPO)
  const addAuditLog = useAuditStore((s) => s.addLog)

  const [tab, setTab] = useState('overview')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [approvalModal, setApprovalModal] = useState(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [showNewPR, setShowNewPR] = useState(false)
  const [newPR, setNewPR] = useState({ title: '', description: '', category: 'Raw Materials', priority: 'medium', currency: 'USD', vendorName: '', items: [{ description: '', qty: 1, unit: 'pcs', unitPrice: 0 }] })

  const flash = (msg) => { setFeedback({ text: msg, type: 'success' }); setTimeout(() => setFeedback(null), 3000) }

  const stats = useMemo(() => storeStats(), [requisitions, purchaseOrders])

  const filtered = useMemo(() => {
    const source = tab === 'purchase-orders' ? purchaseOrders : requisitions
    let r = source
    if (statusFilter !== 'all') r = r.filter((i) => i.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((i) => i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q) || (i.vendorName || '').toLowerCase().includes(q))
    }
    return r
  }, [tab, requisitions, purchaseOrders, statusFilter, search])

  const handleApprovalAction = (action) => {
    if (!approvalModal) return
    const { item, level } = approvalModal
    if (item.type === 'pr') {
      if (action === 'approve') approvePR(item.id, level, userName, approvalNotes)
      else rejectPR(item.id, level, userName, approvalNotes)
    } else {
      if (action === 'approve') approvePO(item.id, level, userName, approvalNotes)
      else rejectPO(item.id, level, userName, approvalNotes)
    }
    addAuditLog({ user: userName, role, module: 'procurement', action: `${action}_${item.type}`, entity: item.id, description: `${action === 'approve' ? 'Approved' : 'Rejected'} ${item.type === 'pr' ? 'requisition' : 'purchase order'} ${item.id}`, details: { amount: item.totalAmount, level }, severity: action === 'reject' ? 'warning' : 'info' })
    flash(`${item.id} ${action === 'approve' ? 'approved' : 'rejected'}`)
    setApprovalModal(null)
    setApprovalNotes('')
  }

  const handleCreatePR = () => {
    const totalAmount = newPR.items.reduce((s, i) => s + (i.qty * i.unitPrice), 0)
    const items = newPR.items.map((i, idx) => ({ id: `li-${Date.now()}-${idx}`, ...i, total: i.qty * i.unitPrice }))
    const prId = createPR({ ...newPR, items, totalAmount, requester: userName, department: 'Procurement' })
    addAuditLog({ user: userName, role, module: 'procurement', action: 'create_pr', entity: prId || 'new', description: `Created purchase requisition: ${newPR.title}`, details: { totalAmount, category: newPR.category } })
    setShowNewPR(false)
    setNewPR({ title: '', description: '', category: 'Raw Materials', priority: 'medium', currency: 'USD', vendorName: '', items: [{ description: '', qty: 1, unit: 'pcs', unitPrice: 0 }] })
    flash('Purchase Requisition created')
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'requisitions', label: `Requisitions (${requisitions.length})` },
    { id: 'purchase-orders', label: `Purchase Orders (${purchaseOrders.length})` },
    { id: 'approvals', label: `Approvals (${stats.pendingPRs + stats.pendingPOs})` },
  ]

  const renderKPIs = () => (
    <div className="proc-kpis">
      <div className="proc-kpi"><span className="proc-kpi-n">{stats.totalPRs}</span><span className="proc-kpi-l">Requisitions</span></div>
      <div className="proc-kpi"><span className="proc-kpi-n" style={{ color: '#e67e22' }}>{stats.pendingPRs}</span><span className="proc-kpi-l">Pending PRs</span></div>
      <div className="proc-kpi"><span className="proc-kpi-n" style={{ color: '#27ae60' }}>{stats.approvedPRs}</span><span className="proc-kpi-l">Approved PRs</span></div>
      <div className="proc-kpi"><span className="proc-kpi-n">{stats.totalPOs}</span><span className="proc-kpi-l">Purchase Orders</span></div>
      <div className="proc-kpi"><span className="proc-kpi-n" style={{ color: '#e67e22' }}>{stats.pendingPOs}</span><span className="proc-kpi-l">Pending POs</span></div>
      <div className="proc-kpi"><span className="proc-kpi-n" style={{ color: '#2980b9' }}>{fmtCurrency(stats.totalSpend)}</span><span className="proc-kpi-l">Total Spend</span></div>
      <div className="proc-kpi"><span className="proc-kpi-n">{stats.avgProcessingDays}d</span><span className="proc-kpi-l">Avg Processing</span></div>
    </div>
  )

  const renderApprovalChain = (chain) => (
    <div className="proc-approval-chain">
      {chain.map((step, idx) => {
        const sm = STATUS_META[step.status] || STATUS_META.draft
        return (
          <div key={idx} className="proc-approval-step">
            <div className={`proc-step-dot ${step.status}`} />
            {idx < chain.length - 1 && <div className={`proc-step-line ${step.status}`} />}
            <div className="proc-step-info">
              <span className="proc-step-level">{step.level.charAt(0).toUpperCase() + step.level.slice(1)}</span>
              <span className="proc-step-who">{step.approver || 'Pending...'}</span>
              {step.date && <span className="proc-step-date">{fmtDate(step.date)}</span>}
              {step.notes && <span className="proc-step-notes">{step.notes}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderItemRow = (item) => {
    const sm = STATUS_META[item.status] || STATUS_META.draft
    const pm = PRIORITY_META[item.priority] || PRIORITY_META.medium
    const pendingStep = item.approvalChain?.find((a) => a.status === 'pending')
    const canApproveThis = pendingStep && guardCanApprove(pendingStep.level, item.requester)

    return (
      <div key={item.id} className="proc-item-row">
        <div className="proc-item-header">
          <span className="proc-item-id">{item.id}</span>
          <span className="proc-item-priority" style={{ color: pm.color }}>{pm.label}</span>
          <span className="proc-item-status" style={{ color: sm.color, background: sm.bg }}>{sm.label}</span>
          <span className="proc-item-date">{fmtDate(item.createdAt)}</span>
          <span className="proc-item-amount">{fmtCurrency(item.totalAmount, item.currency)}</span>
        </div>
        <div className="proc-item-title">{item.title}</div>
        <div className="proc-item-meta">
          <span>{item.requester}</span>
          <span>{item.department}</span>
          <span>{item.category}</span>
          {item.vendorName && <span>{item.vendorName}</span>}
        </div>
        {item.approvalChain?.length > 0 && renderApprovalChain(item.approvalChain)}
        <div className="proc-item-actions">
          {item.status === 'draft' && item.type === 'pr' && (
            <button className="proc-btn primary" onClick={() => { submitPR(item.id, userName); flash(`${item.id} submitted for approval`) }}>Submit for Approval</button>
          )}
          {canApproveThis && (
            <button className="proc-btn primary" onClick={() => setApprovalModal({ item, level: pendingStep.level })}>Review & Approve</button>
          )}
          {item.status === 'approved' && item.type === 'pr' && !item.linkedPOId && (
            <button className="proc-btn blue" onClick={() => { createPOFromPR(item.id); flash(`PO created from ${item.id}`) }}>Convert to PO</button>
          )}
          {item.linkedPOId && <span className="proc-linked">Linked: {item.linkedPOId}</span>}
          {item.linkedPRId && <span className="proc-linked">From: {item.linkedPRId}</span>}
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="proc-page">
        {feedback && <div className={`proc-feedback ${feedback.type}`}>{feedback.text}</div>}

        {approvalModal && (
          <div className="proc-modal-overlay" onClick={() => setApprovalModal(null)}>
            <div className="proc-modal" onClick={(e) => e.stopPropagation()}>
              <h4>Review — {approvalModal.item.id}</h4>
              <p className="proc-modal-desc">{approvalModal.item.title}</p>
              <p className="proc-modal-amount">{fmtCurrency(approvalModal.item.totalAmount, approvalModal.item.currency)}</p>
              {approvalModal.item.approvalChain?.length > 0 && renderApprovalChain(approvalModal.item.approvalChain)}
              <textarea className="proc-modal-textarea" placeholder="Approval notes (optional)..." value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={3} />
              <div className="proc-modal-actions">
                <button className="proc-btn primary" onClick={() => handleApprovalAction('approve')}>Approve</button>
                <button className="proc-btn danger" onClick={() => handleApprovalAction('reject')}>Reject</button>
                <button className="proc-btn ghost" onClick={() => setApprovalModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="proc-header">
          <div>
            <button className="proc-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="proc-title">Procurement Management</h1>
            <p className="proc-subtitle">Multi-level approval workflows — Requisitions, Purchase Orders & Spend Tracking</p>
          </div>
          <div className="proc-header-actions">
            <button className="proc-btn primary" onClick={() => setShowNewPR(true)}>+ New Requisition</button>
          </div>
        </div>

        {renderKPIs()}

        {showNewPR && (
          <div className="proc-card">
            <h4 style={{ margin: '0 0 12px', color: '#000888' }}>New Purchase Requisition</h4>
            <div className="proc-form-grid">
              <div className="proc-field"><label>Title *</label><input value={newPR.title} onChange={(e) => setNewPR({ ...newPR, title: e.target.value })} placeholder="Brief description..." /></div>
              <div className="proc-field"><label>Category</label>
                <select value={newPR.category} onChange={(e) => setNewPR({ ...newPR, category: e.target.value })}>
                  {['Raw Materials', 'Tooling', 'IT Equipment', 'Office Supplies', 'Services', 'Safety', 'Maintenance', 'Other'].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="proc-field"><label>Priority</label>
                <select value={newPR.priority} onChange={(e) => setNewPR({ ...newPR, priority: e.target.value })}>
                  {Object.keys(PRIORITY_META).map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                </select>
              </div>
              <div className="proc-field"><label>Vendor</label><input value={newPR.vendorName} onChange={(e) => setNewPR({ ...newPR, vendorName: e.target.value })} placeholder="Vendor name..." /></div>
              <div className="proc-field full"><label>Description</label><textarea value={newPR.description} onChange={(e) => setNewPR({ ...newPR, description: e.target.value })} placeholder="Detailed description..." rows={2} /></div>
            </div>
            <h5 style={{ margin: '12px 0 8px' }}>Line Items</h5>
            {newPR.items.map((item, idx) => (
              <div key={idx} className="proc-line-item">
                <input placeholder="Description" value={item.description} onChange={(e) => { const items = [...newPR.items]; items[idx] = { ...items[idx], description: e.target.value }; setNewPR({ ...newPR, items }) }} style={{ flex: 2 }} />
                <input type="number" placeholder="Qty" value={item.qty} onChange={(e) => { const items = [...newPR.items]; items[idx] = { ...items[idx], qty: +e.target.value }; setNewPR({ ...newPR, items }) }} style={{ width: 70 }} />
                <input placeholder="Unit" value={item.unit} onChange={(e) => { const items = [...newPR.items]; items[idx] = { ...items[idx], unit: e.target.value }; setNewPR({ ...newPR, items }) }} style={{ width: 60 }} />
                <input type="number" placeholder="Unit Price" value={item.unitPrice} onChange={(e) => { const items = [...newPR.items]; items[idx] = { ...items[idx], unitPrice: +e.target.value }; setNewPR({ ...newPR, items }) }} style={{ width: 90 }} />
                <span className="proc-line-total">{fmtCurrency(item.qty * item.unitPrice)}</span>
              </div>
            ))}
            <button className="proc-btn ghost" onClick={() => setNewPR({ ...newPR, items: [...newPR.items, { description: '', qty: 1, unit: 'pcs', unitPrice: 0 }] })}>+ Add Line</button>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="proc-btn primary" onClick={handleCreatePR} disabled={!newPR.title.trim()}>Create Requisition</button>
              <button className="proc-btn ghost" onClick={() => setShowNewPR(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="proc-tabs">
          {TABS.map((t) => <button key={t.id} className={`proc-tab ${tab === t.id ? 'active' : ''}`} onClick={() => { setTab(t.id); setStatusFilter('all') }}>{t.label}</button>)}
        </div>

        {tab !== 'overview' && (
          <div className="proc-filters">
            <input className="proc-search" placeholder="Search by ID, title, or vendor..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="proc-status-filters">
              {['all', 'draft', 'pending_manager', 'pending_admin', 'pending_finance', 'approved', 'rejected', 'completed'].map((s) => (
                <button key={s} className={`proc-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s === 'all' ? 'All' : (STATUS_META[s]?.label || s)}</button>
              ))}
            </div>
          </div>
        )}

        {tab === 'overview' && (
          <div className="proc-overview-grid">
            <div className="proc-card">
              <h4>Recent Requisitions</h4>
              {requisitions.slice(0, 5).map(renderItemRow)}
            </div>
            <div className="proc-card">
              <h4>Recent Purchase Orders</h4>
              {purchaseOrders.slice(0, 5).map(renderItemRow)}
            </div>
          </div>
        )}

        {(tab === 'requisitions' || tab === 'purchase-orders') && (
          <div className="proc-list">{filtered.length === 0 ? <div className="proc-empty">No items found.</div> : filtered.map(renderItemRow)}</div>
        )}

        {tab === 'approvals' && (
          <div className="proc-list">
            <h4 style={{ margin: '0 0 12px', color: '#e67e22' }}>Pending Approvals</h4>
            {[...requisitions, ...purchaseOrders]
              .filter((i) => i.status.startsWith('pending'))
              .map(renderItemRow)}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
