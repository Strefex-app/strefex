import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import useRfqStore from '../store/rfqStore'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/AppLayout'
import './SellerDashboard.css'

/* ── Status badge helper ──────────────────────────────────── */
const STATUS_MAP = {
  pending:   { label: 'Pending',   color: '#e65100', bg: 'rgba(230,81,0,.08)' },
  responded: { label: 'Responded', color: '#2e7d32', bg: 'rgba(46,125,50,.08)' },
  awarded:   { label: 'Awarded',   color: '#000888', bg: 'rgba(0,8,136,.08)' },
  declined:  { label: 'Declined',  color: '#c62828', bg: 'rgba(198,40,40,.08)' },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.pending
  return (
    <span className="sd-badge" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

/* ── Days remaining helper ────────────────────────────────── */
function daysUntil(dateStr) {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  return diff
}

export default function SellerDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const allProjects = useProjectStore((s) => s.projects)
  const getProjectStats = useProjectStore((s) => s.getProjectStats)

  const allReceivedRfqs = useRfqStore((s) => s.receivedRfqs)
  const respondToRfq = useRfqStore((s) => s.respondToRfq)
  const declineRfq = useRfqStore((s) => s.declineRfq)

  const isSuperAdmin = role === 'superadmin'
  const userEmail = user?.email?.toLowerCase()

  /* ── Data isolation: filter by user, superadmin sees all ── */
  const projects = isSuperAdmin
    ? allProjects
    : allProjects.filter(p => !p.createdBy || p.createdBy.toLowerCase() === userEmail)

  const receivedRfqs = isSuperAdmin
    ? allReceivedRfqs
    : allReceivedRfqs // seller-specific by design; in production filter by seller account

  const receivedStats = {
    total: receivedRfqs.length,
    pending: receivedRfqs.filter(r => r.status === 'pending').length,
    responded: receivedRfqs.filter(r => r.status === 'responded').length,
    awarded: receivedRfqs.filter(r => r.status === 'awarded').length,
    declined: receivedRfqs.filter(r => r.status === 'declined').length,
  }

  const [activeTab, setActiveTab] = useState('all')
  const [expandedRfq, setExpandedRfq] = useState(null)
  const [responseForm, setResponseForm] = useState({ price: '', leadTime: '', warranty: '', notes: '' })

  const filteredRfqs = activeTab === 'all'
    ? receivedRfqs
    : receivedRfqs.filter(r => r.status === activeTab)

  /* ── Project stats ──────────────────────────────────────── */
  const totalProjects = projects.length
  const allTasks = projects.flatMap(p => {
    const flat = []
    const flatten = (tasks) => (tasks || []).forEach(t => { flat.push(t); if (t.children) flatten(t.children) })
    flatten(p.tasks)
    return flat
  })
  const completedTasks = allTasks.filter(t => t.status === 'complete').length
  const inProgressTasks = allTasks.filter(t => t.status === 'in-progress').length
  const overallProgress = allTasks.length > 0
    ? Math.round(allTasks.reduce((s, t) => s + (t.progressPercent || 0), 0) / allTasks.length)
    : 0

  /* ── Submit response ────────────────────────────────────── */
  const handleSubmitResponse = (rcvId) => {
    respondToRfq(rcvId, {
      price: parseFloat(responseForm.price) || 0,
      currency: 'USD',
      leadTime: parseInt(responseForm.leadTime) || 0,
      warranty: responseForm.warranty || '12 months',
      notes: responseForm.notes || '',
    })
    setExpandedRfq(null)
    setResponseForm({ price: '', leadTime: '', warranty: '', notes: '' })
  }

  return (
    <AppLayout>
      <div className="sd-page">
        <div className="sd-header">
          <div>
            <h1 className="sd-title">Seller Dashboard</h1>
            <p className="sd-subtitle">
              {isSuperAdmin
                ? 'Superadmin view — showing all seller data across the platform.'
                : `Welcome back${user?.fullName ? `, ${user.fullName}` : ''}. Here is your business overview.`}
            </p>
          </div>
          {isSuperAdmin && (
            <span style={{
              padding: '5px 14px', borderRadius: 20, background: 'rgba(198,40,40,.08)',
              color: '#c62828', fontSize: 12, fontWeight: 700, alignSelf: 'flex-start',
            }}>
              SUPERADMIN VIEW
            </span>
          )}
        </div>

        {/* ── KPI Cards ───────────────────────────────────── */}
        <div className="sd-kpis">
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="sd-kpi-body">
              <span className="sd-kpi-value">{totalProjects}</span>
              <span className="sd-kpi-label">Total Projects</span>
            </div>
          </div>
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="sd-kpi-body">
              <span className="sd-kpi-value">{overallProgress}%</span>
              <span className="sd-kpi-label">Avg. Completion</span>
            </div>
          </div>
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="sd-kpi-body">
              <span className="sd-kpi-value">{receivedStats.total}</span>
              <span className="sd-kpi-label">RFQs Received</span>
            </div>
          </div>
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22c5.5-3 8-7.5 8-12V5l-8-3-8 3v5c0 4.5 2.5 9 8 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="sd-kpi-body">
              <span className="sd-kpi-value">{receivedStats.pending}</span>
              <span className="sd-kpi-label">Active — Need Response</span>
            </div>
          </div>
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="sd-kpi-body">
              <span className="sd-kpi-value">{receivedStats.awarded}</span>
              <span className="sd-kpi-label">Awarded</span>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ───────────────────────────── */}
        <div className="sd-columns">
          {/* ── Left: Projects Overview ───────────────────── */}
          <div className="sd-card">
            <div className="sd-card-header">
              <h2 className="sd-card-title">Projects Overview</h2>
              <button type="button" className="sd-link-btn" onClick={() => navigate('/project-management')}>
                View All →
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="sd-empty">No projects yet.</div>
            ) : (
              <div className="sd-project-list">
                {projects.map((p) => {
                  const stats = getProjectStats(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="sd-project-row"
                      onClick={() => navigate(`/project-management/project/${p.id}`)}
                    >
                      <div className="sd-project-info">
                        <span className="sd-project-name">{p.name}</span>
                        <span className="sd-project-meta">
                          {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0} tasks complete
                        </span>
                      </div>
                      <div className="sd-progress-bar-wrap">
                        <div className="sd-progress-bar">
                          <div
                            className="sd-progress-fill"
                            style={{ width: `${stats?.avgProgress ?? 0}%` }}
                          />
                        </div>
                        <span className="sd-progress-pct">{stats?.avgProgress ?? 0}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right: RFQs Received ─────────────────────── */}
          <div className="sd-card sd-card-wide">
            <div className="sd-card-header">
              <h2 className="sd-card-title">RFQs Received from Buyers</h2>
              <div className="sd-rfq-tab-pills">
                {[
                  { id: 'all', label: 'All', count: receivedStats.total },
                  { id: 'pending', label: 'Pending', count: receivedStats.pending },
                  { id: 'responded', label: 'Responded', count: receivedStats.responded },
                  { id: 'awarded', label: 'Awarded', count: receivedStats.awarded },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`sd-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label} <span className="sd-tab-count">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredRfqs.length === 0 ? (
              <div className="sd-empty">No RFQs in this category.</div>
            ) : (
              <div className="sd-rfq-list">
                {filteredRfqs.map((rfq) => {
                  const days = daysUntil(rfq.dueDate)
                  const isExpanded = expandedRfq === rfq.id
                  return (
                    <div key={rfq.id} className="sd-rfq-item">
                      <button
                        type="button"
                        className="sd-rfq-row"
                        onClick={() => setExpandedRfq(isExpanded ? null : rfq.id)}
                      >
                        <div className="sd-rfq-left">
                          <span className="sd-rfq-title">{rfq.title}</span>
                          <span className="sd-rfq-buyer">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
                            {rfq.buyerCompany}
                          </span>
                        </div>
                        <div className="sd-rfq-right">
                          <StatusBadge status={rfq.status} />
                          {days !== null && (
                            <span className={`sd-rfq-due ${days <= 3 ? 'urgent' : days <= 7 ? 'soon' : ''}`}>
                              {days > 0 ? `${days}d left` : days === 0 ? 'Due today' : 'Overdue'}
                            </span>
                          )}
                          <svg
                            width="16" height="16" viewBox="0 0 24 24" fill="none"
                            style={{ transition: 'transform .2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
                          >
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="sd-rfq-detail">
                          <div className="sd-rfq-detail-grid">
                            <div><strong>Industry:</strong> {rfq.industryId}</div>
                            <div><strong>Category:</strong> {rfq.categoryId}</div>
                            <div><strong>Received:</strong> {rfq.receivedAt}</div>
                            <div><strong>Due:</strong> {rfq.dueDate}</div>
                            {rfq.requirements?.quantity && <div><strong>Qty:</strong> {rfq.requirements.quantity}</div>}
                            {rfq.requirements?.maxLeadTime && <div><strong>Max Lead:</strong> {rfq.requirements.maxLeadTime} days</div>}
                            {rfq.requirements?.maxPrice && <div><strong>Max Budget:</strong> ${rfq.requirements.maxPrice}k</div>}
                          </div>

                          {rfq.status === 'responded' && rfq.myResponse && (
                            <div className="sd-my-response">
                              <h4>Your Response</h4>
                              <div className="sd-rfq-detail-grid">
                                <div><strong>Price:</strong> ${rfq.myResponse.price?.toLocaleString()}</div>
                                <div><strong>Lead Time:</strong> {rfq.myResponse.leadTime} days</div>
                                <div><strong>Warranty:</strong> {rfq.myResponse.warranty}</div>
                                <div><strong>Responded:</strong> {rfq.myResponse.respondedAt}</div>
                              </div>
                              {rfq.myResponse.notes && <p className="sd-response-notes">{rfq.myResponse.notes}</p>}
                            </div>
                          )}

                          {rfq.status === 'awarded' && rfq.myResponse && (
                            <div className="sd-awarded-banner">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              Congratulations! You have been awarded this RFQ.
                            </div>
                          )}

                          {rfq.status === 'pending' && (
                            <div className="sd-response-form">
                              <h4>Submit Your Response</h4>
                              <div className="sd-form-grid">
                                <div className="sd-form-group">
                                  <label>Price (USD)</label>
                                  <input
                                    type="number"
                                    value={responseForm.price}
                                    onChange={(e) => setResponseForm(f => ({ ...f, price: e.target.value }))}
                                    placeholder="e.g. 95000"
                                  />
                                </div>
                                <div className="sd-form-group">
                                  <label>Lead Time (days)</label>
                                  <input
                                    type="number"
                                    value={responseForm.leadTime}
                                    onChange={(e) => setResponseForm(f => ({ ...f, leadTime: e.target.value }))}
                                    placeholder="e.g. 60"
                                  />
                                </div>
                                <div className="sd-form-group">
                                  <label>Warranty</label>
                                  <input
                                    type="text"
                                    value={responseForm.warranty}
                                    onChange={(e) => setResponseForm(f => ({ ...f, warranty: e.target.value }))}
                                    placeholder="e.g. 24 months"
                                  />
                                </div>
                                <div className="sd-form-group sd-form-full">
                                  <label>Notes</label>
                                  <textarea
                                    value={responseForm.notes}
                                    onChange={(e) => setResponseForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Additional information, capabilities, terms..."
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <div className="sd-form-actions">
                                <button
                                  type="button"
                                  className="sd-btn sd-btn-primary"
                                  onClick={() => handleSubmitResponse(rfq.id)}
                                  disabled={!responseForm.price || !responseForm.leadTime}
                                >
                                  Submit Response
                                </button>
                                <button
                                  type="button"
                                  className="sd-btn sd-btn-danger"
                                  onClick={() => declineRfq(rfq.id)}
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
