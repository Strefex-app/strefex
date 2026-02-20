import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/AppLayout'
import './ServiceProviderDashboard.css'

/* ── Status badge helper ──────────────────────────────────── */
const STATUS_MAP = {
  new:         { label: 'New',         color: '#e65100', bg: 'rgba(230,81,0,.08)' },
  assigned:    { label: 'Assigned',    color: '#000888', bg: 'rgba(0,8,136,.08)' },
  in_progress: { label: 'In Progress', color: '#1565c0', bg: 'rgba(21,101,192,.08)' },
  completed:   { label: 'Completed',   color: '#2e7d32', bg: 'rgba(46,125,50,.08)' },
  cancelled:   { label: 'Cancelled',   color: '#888',    bg: 'rgba(136,136,136,.08)' },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.new
  return (
    <span className="spd-badge" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

export default function ServiceProviderDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const allProjects = useProjectStore((s) => s.projects)
  const getProjectStats = useProjectStore((s) => s.getProjectStats)

  const allRequests = useServiceRequestStore((s) => s.requests)

  const isSuperAdmin = role === 'superadmin'
  const userEmail = user?.email?.toLowerCase()

  /* ── Data isolation: filter by user, superadmin sees all ── */
  const projects = isSuperAdmin
    ? allProjects
    : allProjects.filter(p => !p.createdBy || p.createdBy.toLowerCase() === userEmail)

  // Service providers see requests assigned to them OR submitted by them
  const serviceRequests = isSuperAdmin
    ? allRequests
    : allRequests.filter(r =>
        (r.email && r.email.toLowerCase() === userEmail) ||
        (r.assignedTo && r.assignedTo.toLowerCase() === userEmail)
      )

  const requestStats = {
    total: serviceRequests.length,
    new: serviceRequests.filter(r => r.status === 'new').length,
    assigned: serviceRequests.filter(r => r.status === 'assigned').length,
    inProgress: serviceRequests.filter(r => r.status === 'in_progress').length,
    completed: serviceRequests.filter(r => r.status === 'completed').length,
  }

  const [activeTab, setActiveTab] = useState('all')
  const [expandedReq, setExpandedReq] = useState(null)

  const filteredRequests = activeTab === 'all'
    ? serviceRequests
    : serviceRequests.filter(r => r.status === activeTab)

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

  return (
    <AppLayout>
      <div className="spd-page">
        <div className="spd-header">
          <div>
            <h1 className="spd-title">Service Provider Dashboard</h1>
            <p className="spd-subtitle">
              {isSuperAdmin
                ? 'Superadmin view — showing all service provider data across the platform.'
                : `Welcome back${user?.fullName ? `, ${user.fullName}` : ''}. Manage your services and requests.`}
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
        <div className="spd-kpis">
          <div className="spd-kpi-card">
            <div className="spd-kpi-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="spd-kpi-body">
              <span className="spd-kpi-value">{totalProjects}</span>
              <span className="spd-kpi-label">Total Projects</span>
            </div>
          </div>
          <div className="spd-kpi-card">
            <div className="spd-kpi-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="spd-kpi-body">
              <span className="spd-kpi-value">{overallProgress}%</span>
              <span className="spd-kpi-label">Avg. Completion</span>
            </div>
          </div>
          <div className="spd-kpi-card">
            <div className="spd-kpi-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="spd-kpi-body">
              <span className="spd-kpi-value">{requestStats.total}</span>
              <span className="spd-kpi-label">Service Requests</span>
            </div>
          </div>
          <div className="spd-kpi-card">
            <div className="spd-kpi-icon orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22c5.5-3 8-7.5 8-12V5l-8-3-8 3v5c0 4.5 2.5 9 8 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div className="spd-kpi-body">
              <span className="spd-kpi-value">{requestStats.new + requestStats.assigned}</span>
              <span className="spd-kpi-label">Pending Action</span>
            </div>
          </div>
          <div className="spd-kpi-card">
            <div className="spd-kpi-icon teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="spd-kpi-body">
              <span className="spd-kpi-value">{requestStats.completed}</span>
              <span className="spd-kpi-label">Completed</span>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ───────────────────────────── */}
        <div className="spd-columns">
          {/* ── Left: Projects Overview ───────────────────── */}
          <div className="spd-card">
            <div className="spd-card-header">
              <h2 className="spd-card-title">Projects Overview</h2>
              <button type="button" className="spd-link-btn" onClick={() => navigate('/project-management')}>
                View All →
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="spd-empty">No projects yet.</div>
            ) : (
              <div className="spd-project-list">
                {projects.map((p) => {
                  const stats = getProjectStats(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="spd-project-row"
                      onClick={() => navigate(`/project-management/project/${p.id}`)}
                    >
                      <div className="spd-project-info">
                        <span className="spd-project-name">{p.name}</span>
                        <span className="spd-project-meta">
                          {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0} tasks complete
                        </span>
                      </div>
                      <div className="spd-progress-bar-wrap">
                        <div className="spd-progress-bar">
                          <div className="spd-progress-fill" style={{ width: `${stats?.avgProgress ?? 0}%` }} />
                        </div>
                        <span className="spd-progress-pct">{stats?.avgProgress ?? 0}%</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Right: Service Requests ───────────────────── */}
          <div className="spd-card spd-card-wide">
            <div className="spd-card-header">
              <h2 className="spd-card-title">Service Requests</h2>
              <div className="spd-tab-pills">
                {[
                  { id: 'all', label: 'All', count: requestStats.total },
                  { id: 'new', label: 'New', count: requestStats.new },
                  { id: 'assigned', label: 'Assigned', count: requestStats.assigned },
                  { id: 'in_progress', label: 'In Progress', count: requestStats.inProgress },
                  { id: 'completed', label: 'Completed', count: requestStats.completed },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`spd-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label} <span className="spd-tab-count">{tab.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="spd-empty">No service requests in this category.</div>
            ) : (
              <div className="spd-req-list">
                {filteredRequests.map((req) => {
                  const isExpanded = expandedReq === req.id
                  return (
                    <div key={req.id} className="spd-req-item">
                      <button
                        type="button"
                        className="spd-req-row"
                        onClick={() => setExpandedReq(isExpanded ? null : req.id)}
                      >
                        <div className="spd-req-left">
                          <span className="spd-req-title">{req.id}</span>
                          <span className="spd-req-company">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
                            {req.companyName || req.contactName || req.email}
                          </span>
                        </div>
                        <div className="spd-req-right">
                          <StatusBadge status={req.status} />
                          {req.priority && (
                            <span className={`spd-priority ${req.priority === 'Urgent' ? 'urgent' : ''}`}>
                              {req.priority}
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
                        <div className="spd-req-detail">
                          <div className="spd-detail-grid">
                            <div><strong>Services:</strong> {(req.services || []).join(', ') || '–'}</div>
                            <div><strong>Contact:</strong> {req.contactName || '–'}</div>
                            <div><strong>Email:</strong> {req.email || '–'}</div>
                            <div><strong>Phone:</strong> {req.phone || '–'}</div>
                            <div><strong>Preferred Date:</strong> {req.preferredDate || '–'}</div>
                            <div><strong>Created:</strong> {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : '–'}</div>
                            {req.assignedTo && <div><strong>Assigned To:</strong> {req.assignedTo}</div>}
                            {req.industryId && <div><strong>Industry:</strong> {req.industryId}</div>}
                          </div>
                          {req.description && (
                            <div className="spd-req-desc">
                              <strong>Description:</strong>
                              <p>{req.description}</p>
                            </div>
                          )}
                          {req.adminNotes && req.adminNotes.length > 0 && (
                            <div className="spd-admin-notes">
                              <strong>Notes:</strong>
                              {req.adminNotes.map((n, i) => (
                                <div key={i} className="spd-note">
                                  <span className="spd-note-text">{n.text}</span>
                                  <span className="spd-note-meta">— {n.by}, {new Date(n.at).toLocaleDateString()}</span>
                                </div>
                              ))}
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
