import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import { useProgramStore } from '../store/programStore'
import { useProjectStore } from '../store/projectStore'
import useProcurementStore from '../store/procurementStore'
import useVendorStore from '../store/vendorStore'
import useAuditStore from '../store/auditStore'
import ProcurementTracePanel, { ReferenceId } from '../components/pm/ProcurementRegisterTable'
import { buildProcurementTraceRows } from '../utils/pmTraceability'
import { filterByCompanyRole, canApprove as guardCanApprove } from '../utils/companyGuard'
import './ProcurementDashboard.css'
import '../styles/projectControl.css'
import '../styles/managementShell.css'
import AiInsightsCtaStrip from '../components/AiInsightsCtaStrip'
import CompanyWorkflowRail from '../components/company/CompanyWorkflowRail'
import { useTranslation } from '../i18n/useTranslation'

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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const userName = user?.name || user?.email || 'User'
  const role = useAuthStore((s) => s.role)

  const rawRequisitions = useProcurementStore((s) => s.requisitions)
  const rawPurchaseOrders = useProcurementStore((s) => s.purchaseOrders)
  const opportunities = useProcurementStore((s) => s.opportunities)
  const quotations = useProcurementStore((s) => s.quotations)
  const programs = useProgramStore((s) => s.programs)
  const storeProjects = useProjectStore((s) => s.projects)
  const getProgramById = useProgramStore((s) => s.getProgramById)
  const getProjectById = useProjectStore((s) => s.getProjectById)
  const vendors = useVendorStore((s) => s.vendors)

  const projects = useMemo(
    () => useProjectStore.getState().getSafeProjects(),
    [storeProjects],
  )

  const urlProjectId = searchParams.get('projectId') || null
  const urlProgramId = searchParams.get('programId') || null
  const urlTab = searchParams.get('tab') || 'overview'
  const urlSearch = searchParams.get('search') || ''

  const traceRows = useMemo(
    () => buildProcurementTraceRows({
      opportunities,
      quotations,
      purchaseOrders: rawPurchaseOrders,
      programs,
      projects,
      vendors,
      programId: urlProgramId,
      projectId: urlProjectId,
    }),
    [opportunities, quotations, rawPurchaseOrders, programs, projects, vendors, urlProgramId, urlProjectId],
  )

  const scopeProject = urlProjectId ? getProjectById(urlProjectId) : null
  const scopeProgram = urlProgramId
    ? getProgramById(urlProgramId)
    : (scopeProject?.programId ? getProgramById(scopeProject.programId) : null)

  const traceScope = useMemo(() => {
    if (urlProjectId && scopeProject) {
      return {
        type: 'project',
        label: `${scopeProject.projectNumber || scopeProject.name}${scopeProgram ? ` · ${scopeProgram.programNumber}` : ''}`,
        shortLabel: scopeProject.projectNumber || 'Project',
        projectId: scopeProject.id,
        programId: scopeProgram?.id || scopeProject.programId,
      }
    }
    if (urlProgramId && scopeProgram) {
      return {
        type: 'program',
        label: scopeProgram.programNumber,
        shortLabel: scopeProgram.programNumber,
        programId: scopeProgram.id,
      }
    }
    return { type: 'company', label: 'Company-wide' }
  }, [urlProjectId, urlProgramId, scopeProject, scopeProgram])

  // Role-based data filtering: users see only own PRs/POs, managers see department, admin sees all company
  const requisitions = useMemo(() => filterByCompanyRole(rawRequisitions, { creatorField: 'requester', departmentField: 'department' }), [rawRequisitions])
  const purchaseOrders = useMemo(() => filterByCompanyRole(rawPurchaseOrders, { creatorField: 'requester', departmentField: 'department' }), [rawPurchaseOrders])
  const submitPR = useProcurementStore((s) => s.submitPR)
  const approvePR = useProcurementStore((s) => s.approvePR)
  const rejectPR = useProcurementStore((s) => s.rejectPR)
  const approvePO = useProcurementStore((s) => s.approvePO)
  const rejectPO = useProcurementStore((s) => s.rejectPO)
  const createPOFromPR = useProcurementStore((s) => s.createPOFromPR)
  const createPR = useProcurementStore((s) => s.createPR)
  const createPO = useProcurementStore((s) => s.createPO)
  const addAuditLog = useAuditStore((s) => s.addLog)

  const [tab, setTab] = useState(urlTab)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState(urlSearch)
  const [feedback, setFeedback] = useState(null)
  const [approvalModal, setApprovalModal] = useState(null)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [showNewPR, setShowNewPR] = useState(false)
  const [newPR, setNewPR] = useState({ title: '', description: '', category: 'Raw Materials', priority: 'medium', currency: 'USD', vendorName: '', items: [{ description: '', qty: 1, unit: 'pcs', unitPrice: 0 }] })

  const flash = (msg) => { setFeedback({ text: msg, type: 'success' }); setTimeout(() => setFeedback(null), 3000) }

  useEffect(() => {
    setTab(urlTab)
  }, [urlTab])

  useEffect(() => {
    setSearch(urlSearch)
  }, [urlSearch])

  const setDashboardTab = (nextTab) => {
    setTab(nextTab)
    setStatusFilter('all')
    const params = new URLSearchParams(searchParams)
    if (nextTab === 'overview') params.delete('tab')
    else params.set('tab', nextTab)
    setSearchParams(params, { replace: true })
  }

  const clearTraceScope = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('projectId')
    params.delete('programId')
    setSearchParams(params, { replace: true })
  }

  const stats = useMemo(() => ({
    totalPRs: requisitions.length,
    pendingPRs: requisitions.filter((r) => r.status.startsWith('pending')).length,
    approvedPRs: requisitions.filter((r) => r.status === 'approved').length,
    rejectedPRs: requisitions.filter((r) => r.status === 'rejected').length,
    draftPRs: requisitions.filter((r) => r.status === 'draft').length,
    totalPOs: purchaseOrders.length,
    pendingPOs: purchaseOrders.filter((o) => o.status.startsWith('pending')).length,
    approvedPOs: purchaseOrders.filter((o) => o.status === 'approved' || o.status === 'completed').length,
    totalSpend: purchaseOrders
      .filter((o) => o.status === 'approved' || o.status === 'completed')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    avgProcessingDays: 3.2,
  }), [requisitions, purchaseOrders])

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
    { id: 'traceability', label: `Traceability (${traceRows.length})` },
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
        {(item.type === 'po' || item.programNumber || item.projectNumber || item.quotationNumber) && (
          <div className="proc-ref-strip">
            {item.programNumber ? (
              <span><span className="proc-ref-label">Program</span><ReferenceId>{item.programNumber}</ReferenceId></span>
            ) : null}
            {item.projectNumber ? (
              <span><span className="proc-ref-label">Project</span><ReferenceId>{item.projectNumber}</ReferenceId></span>
            ) : null}
            {item.opportunityNumber ? (
              <span><span className="proc-ref-label">OPP</span><ReferenceId>{item.opportunityNumber}</ReferenceId></span>
            ) : null}
            {item.quotationNumber ? (
              <span><span className="proc-ref-label">QUO</span><ReferenceId>{item.quotationNumber}</ReferenceId></span>
            ) : null}
            {item.supplierQuotationRef ? (
              <span><span className="proc-ref-label">Supplier quote #</span><ReferenceId>{item.supplierQuotationRef}</ReferenceId></span>
            ) : null}
          </div>
        )}
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
            <h1 className="proc-title">Procurement Management</h1>
            <p className="proc-subtitle">Multi-level approval workflows — Requisitions, Purchase Orders & Spend Tracking</p>
          </div>
          <div className="proc-header-actions">
            <button type="button" className="proc-btn blue" onClick={() => navigate('/procurement/new-opportunity')}>+ Project opportunity</button>
            <button className="proc-btn primary" onClick={() => setShowNewPR(true)}>+ New Requisition</button>
          </div>
        </div>

        <AiInsightsCtaStrip context="procurement" />

        <CompanyWorkflowRail chainId="sourcing-award" />

        {renderKPIs()}

        {showNewPR && (
          <div className="proc-card">
            <h4 style={{ margin: '0 0 12px', color: '#00d4ff' }}>New Purchase Requisition</h4>
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
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              className={`proc-tab ${tab === tb.id ? 'active' : ''}`}
              onClick={() => setDashboardTab(tb.id)}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab !== 'overview' && (
          <div className="proc-filters">
            <input className="proc-search" placeholder={t('procurementFilter.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="proc-status-filters">
              {['all', 'draft', 'pending_manager', 'pending_admin', 'pending_finance', 'approved', 'rejected', 'completed'].map((s) => (
                <button key={s} type="button" className={`proc-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s === 'all'
                    ? t('filtersCommon.all')
                    : t(`procurementFilter.status.${s}`, STATUS_META[s]?.label || s)}
                </button>
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

        {tab === 'traceability' && (
          <div className="proc-card">
            {(urlProjectId || urlProgramId) ? (
              <div className="pch-scope-banner">
                Filtered view
                {' — '}
                {traceScope.label}
                {' '}
                <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={clearTraceScope}>
                  Show all
                </button>
              </div>
            ) : null}
            <ProcurementTracePanel
              rows={traceRows}
              title="Procurement traceability register"
              description="Procurement database — link records to projects from Project Management via dropdown."
              exportFilename="procurement-traceability.csv"
              emptyMessage="No project-linked procurement yet. Create RFQ or link from project control."
            />
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
