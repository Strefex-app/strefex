import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import useRfqStore from '../store/rfqStore'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/AppLayout'
import './BuyerDashboard.css'

/* ── Status badge helper ──────────────────────────────────── */
const STATUS_MAP = {
  draft:     { label: 'Draft',     color: '#888',    bg: 'rgba(136,136,136,.08)' },
  sent:      { label: 'Sent',      color: '#000888', bg: 'rgba(0,8,136,.08)' },
  active:    { label: 'Active',    color: '#e65100', bg: 'rgba(230,81,0,.08)' },
  completed: { label: 'Completed', color: '#2e7d32', bg: 'rgba(46,125,50,.08)' },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.draft
  return (
    <span className="bd-badge" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

export default function BuyerDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const allProjects = useProjectStore((s) => s.projects)
  const getProjectStats = useProjectStore((s) => s.getProjectStats)

  const allRfqs = useRfqStore((s) => s.rfqs)

  const isSuperAdmin = role === 'superadmin'
  const userEmail = user?.email?.toLowerCase()

  /* ── Data isolation: filter by user, superadmin sees all ── */
  const projects = isSuperAdmin
    ? allProjects
    : allProjects.filter(p => !p.createdBy || p.createdBy.toLowerCase() === userEmail)

  const rfqs = isSuperAdmin
    ? allRfqs
    : allRfqs.filter(r => !r.buyerEmail || r.buyerEmail.toLowerCase() === userEmail)

  const rfqStats = {
    total: rfqs.length,
    sent: rfqs.filter(r => r.status === 'sent' || r.status === 'active').length,
    active: rfqs.filter(r => r.status === 'active').length,
    draft: rfqs.filter(r => r.status === 'draft').length,
    completed: rfqs.filter(r => r.status === 'completed').length,
    responses: rfqs.reduce((sum, r) => sum + (r.responses || 0), 0),
  }

  const [activeTab, setActiveTab] = useState('all')

  const filteredRfqs = activeTab === 'all'
    ? rfqs
    : rfqs.filter(r => r.status === activeTab)

  /* ── Project stats ──────────────────────────────────────── */
  const totalProjects = projects.length
  const allTasks = projects.flatMap(p => {
    const flat = []
    const flatten = (tasks) => (tasks || []).forEach(t => { flat.push(t); if (t.children) flatten(t.children) })
    flatten(p.tasks)
    return flat
  })
  const overallProgress = allTasks.length > 0
    ? Math.round(allTasks.reduce((s, t) => s + (t.progressPercent || 0), 0) / allTasks.length)
    : 0

  const totalResponses = rfqs.reduce((sum, r) => sum + (r.responses || 0), 0)

  return (
    <AppLayout>
      <div className="bd-page">
        <div className="bd-header">
          <div>
            <h1 className="bd-title">Buyer Dashboard</h1>
            <p className="bd-subtitle">
              {isSuperAdmin
                ? 'Superadmin view — showing all buyer data across the platform.'
                : `Welcome back${user?.fullName ? `, ${user.fullName}` : ''}. Track your sourcing activity.`}
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
        <div className="bd-kpis">
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{totalProjects}</span>
              <span className="bd-kpi-label">Total Projects</span>
            </div>
          </div>
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{overallProgress}%</span>
              <span className="bd-kpi-label">Avg. Completion</span>
            </div>
          </div>
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{rfqStats.sent}</span>
              <span className="bd-kpi-label">RFQs Sent</span>
            </div>
          </div>
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{totalResponses}</span>
              <span className="bd-kpi-label">Responses Received</span>
            </div>
          </div>
          <div className="bd-kpi-card">
            <div className="bd-kpi-icon teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22c5.5-3 8-7.5 8-12V5l-8-3-8 3v5c0 4.5 2.5 9 8 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="bd-kpi-body">
              <span className="bd-kpi-value">{rfqStats.active}</span>
              <span className="bd-kpi-label">Active RFQs</span>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ───────────────────────────── */}
        <div className="bd-columns">
          {/* ── Left: Projects Overview ───────────────────── */}
          <div className="bd-card">
            <div className="bd-card-header">
              <h2 className="bd-card-title">Projects &amp; Status</h2>
              <button type="button" className="bd-link-btn" onClick={() => navigate('/project-management')}>
                View All →
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="bd-empty">No projects yet.</div>
            ) : (
              <div className="bd-project-list">
                {projects.map((p) => {
                  const stats = getProjectStats(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="bd-project-row"
                      onClick={() => navigate(`/project-management/project/${p.id}`)}
                    >
                      <div className="bd-project-info">
                        <span className="bd-project-name">{p.name}</span>
                        <span className="bd-project-meta">
                          {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0} tasks &bull; Budget: ${(p.budget || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="bd-progress-bar-wrap">
                        <div className="bd-progress-bar">
                          <div className="bd-progress-fill" style={{ width: `${stats?.avgProgress ?? 0}%` }} />
                        </div>
                        <span className="bd-progress-pct">{stats?.avgProgress ?? 0}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right: RFQs Sent ─────────────────────────── */}
          <div className="bd-card bd-card-wide">
            <div className="bd-card-header">
              <h2 className="bd-card-title">My RFQs</h2>
              <div className="bd-rfq-tab-pills">
                {[
                  { id: 'all', label: 'All', count: rfqStats.total },
                  { id: 'sent', label: 'Sent', count: rfqStats.sent },
                  { id: 'active', label: 'Active', count: rfqStats.active },
                  { id: 'draft', label: 'Draft', count: rfqStats.draft },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`bd-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label} <span className="bd-tab-count">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredRfqs.length === 0 ? (
              <div className="bd-empty">No RFQs in this category.</div>
            ) : (
              <div className="bd-rfq-list">
                {filteredRfqs.map((rfq) => {
                  const responseCount = rfq.sellerResponses?.length || rfq.responses || 0
                  return (
                    <div key={rfq.id} className="bd-rfq-item">
                      <div className="bd-rfq-row">
                        <div className="bd-rfq-left">
                          <span className="bd-rfq-title">{rfq.title}</span>
                          <span className="bd-rfq-meta">
                            {rfq.industryId} &bull; Sent to {rfq.suppliers?.length || 0} suppliers &bull; Due: {rfq.dueDate}
                          </span>
                        </div>
                        <div className="bd-rfq-right">
                          <StatusBadge status={rfq.status} />
                          <span className="bd-rfq-responses">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                            {responseCount} response{responseCount !== 1 ? 's' : ''}
                          </span>
                          {responseCount > 0 && (
                            <button
                              type="button"
                              className="bd-compare-btn"
                              onClick={() => navigate(`/rfq-comparison/${rfq.id}`)}
                            >
                              Compare Sellers
                            </button>
                          )}
                        </div>
                      </div>
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
