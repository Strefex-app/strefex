import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useAuthStore } from '../store/authStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { mergeRequestTimelineEntries, ACTIVITY_KIND_LABEL } from '../utils/serviceRequestTimeline'
import '../styles/app-page.css'
import './ServiceRequestManagement.css'

const STATUS_COLORS = {
  new: { bg: 'var(--accent-light)', color: 'var(--link-color)', label: 'New' },
  assigned: { bg: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', label: 'Assigned' },
  on_hold: { bg: 'var(--bg-surface)', color: 'var(--color-muted)', label: 'On Hold' },
  in_progress: { bg: 'var(--accent-light)', color: '#7b1fa2', label: 'In Progress' },
  completed: { bg: 'var(--badge-success-bg)', color: 'var(--badge-success-text)', label: 'Completed' },
  cancelled: { bg: 'var(--danger-light)', color: 'var(--danger-text)', label: 'Cancelled' },
  recalled: { bg: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)', label: 'Recalled' },
}

const PRIORITY_COLORS = {
  Normal: '#3498db',
  High: '#e67e22',
  Urgent: '#e74c3c',
}

const getDomain = (email) => String(email || '').split('@')[1]?.toLowerCase() || ''

export default function ServiceRequestManagement() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const isSuperAdmin = role === 'superadmin'
  const isAdmin = role === 'admin' || isSuperAdmin
  const isManager = role === 'manager' || isAdmin
  const isOrderingUser = !isAdmin && !isManager

  const requests = useServiceRequestStore((s) => s.getSafeRequests())
  const assignRequest = useServiceRequestStore((s) => s.assignRequest)
  const updateRequestStatus = useServiceRequestStore((s) => s.updateRequestStatus)
  const addNote = useServiceRequestStore((s) => s.addNote)
  const getStats = useServiceRequestStore((s) => s.getStats)

  const accounts = useAccountRegistry((s) => s.accounts)
  const myDomain = getDomain(user?.email)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [assignEmail, setAssignEmail] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [newNote, setNewNote] = useState('')
  const [newStatus, setNewStatus] = useState('')

  const [activityOpen, setActivityOpen] = useState(false)

  const stats = useMemo(() => getStats(), [requests]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActivityOpen(false)
  }, [selectedRequest])

  // Filter requests
  const filteredRequests = useMemo(() => {
    let list = requests
    // Managers see only assigned-to-them requests; admins/superadmins see all
    if (!isAdmin && isManager) {
      list = list.filter((r) => r.assignedTo === user?.email || r.status === 'new')
    }
    if (filterStatus) list = list.filter((r) => r.status === filterStatus)
    if (filterPriority) list = list.filter((r) => r.priority === filterPriority)
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      list = list.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        (r.companyName || '').toLowerCase().includes(q) ||
        (r.contactName || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        r.services.some((s) => s.toLowerCase().includes(q))
      )
    }
    return list
  }, [requests, filterStatus, filterPriority, searchTerm, isAdmin, isManager, user?.email])

  // Get team members for assignment
  const assignableMembers = useMemo(() => {
    const members = []
    accounts.forEach((acct) => {
      const accountDomain = getDomain(acct.email)
      if (!isSuperAdmin && myDomain && accountDomain !== myDomain) return
      // Add the main account holder
      if (acct.email) members.push({ email: acct.email, name: acct.contactName || acct.company, role: 'admin' })
      // Add team members who are managers
      if (acct.teamMembers) {
        acct.teamMembers.forEach((tm) => {
          if (tm.role === 'manager' || tm.role === 'admin') {
            members.push({ email: tm.email, name: tm.name, role: tm.role })
          }
        })
      }
    })
    // Deduplicate
    const seen = new Set()
    return members.filter((m) => {
      if (seen.has(m.email)) return false
      seen.add(m.email)
      return true
    })
  }, [accounts, isSuperAdmin, myDomain])

  const handleAssign = (requestId) => {
    if (!assignEmail) return
    assignRequest(requestId, assignEmail, user?.email)
    setAssignEmail('')
  }

  const handleStatusUpdate = (requestId) => {
    if (!newStatus) return
    updateRequestStatus(requestId, newStatus, statusNote || null, user?.email)
    setStatusNote('')
    setNewStatus('')
  }

  const handleAddNote = (requestId) => {
    if (!newNote.trim()) return
    addNote(requestId, newNote.trim(), user?.email)
    setNewNote('')
  }

  const selected = selectedRequest ? requests.find((r) => r.id === selectedRequest) : null

  const activityEntries = useMemo(
    () => (selected ? mergeRequestTimelineEntries(selected) : []),
    [selected]
  )

  return (
    <AppLayout>
      <div className="app-page srm-page">
        {/* Header */}
        <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
          ← Back
        </a>
        <div className="app-page-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
            <div>
              <h2 className="app-page-title">{isOrderingUser ? 'Service requests' : 'Service Request Management'}</h2>
              <p className="app-page-subtitle">
                {isOrderingUser
                  ? 'Service orders you have placed (reference B-…). Buyers and sellers use the same list — no separate service-provider signup is required to submit a request.'
                  : 'Manage, assign, and track all incoming service requests.'}
              </p>
            </div>
            <button
              type="button"
              className="app-page-action"
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => navigate('/service-hub')}
            >
              {isOrderingUser ? 'Order a service' : 'New order (service hub)'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="srm-stats">
          <div className="srm-stat"><span className="srm-stat-value">{stats.total}</span><span className="srm-stat-label">Total</span></div>
          <div className="srm-stat srm-stat-new"><span className="srm-stat-value">{stats.new}</span><span className="srm-stat-label">New</span></div>
          <div className="srm-stat srm-stat-assigned"><span className="srm-stat-value">{stats.assigned}</span><span className="srm-stat-label">Assigned</span></div>
          <div className="srm-stat"><span className="srm-stat-value">{stats.onHold || 0}</span><span className="srm-stat-label">On Hold</span></div>
          <div className="srm-stat srm-stat-progress"><span className="srm-stat-value">{stats.inProgress}</span><span className="srm-stat-label">In Progress</span></div>
          <div className="srm-stat srm-stat-complete"><span className="srm-stat-value">{stats.completed}</span><span className="srm-stat-label">Completed</span></div>
          <div className="srm-stat"><span className="srm-stat-value">{stats.recalled || 0}</span><span className="srm-stat-label">Recalled</span></div>
        </div>

        {/* Filters */}
        <div className="app-page-card srm-filters">
          <input
            type="text"
            className="srm-search"
            placeholder="Search by ID, company, contact, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="srm-select">
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="on_hold">On Hold</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="recalled">Recalled</option>
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="srm-select">
            <option value="">All Priorities</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>

        {/* Two-panel layout */}
        <div className="srm-layout">
          {/* Request list */}
          <div className="app-page-card srm-list-panel">
            <h3 className="srm-panel-title">Requests ({filteredRequests.length})</h3>
            {filteredRequests.length === 0 ? (
              <div className="srm-empty">No service requests found.</div>
            ) : (
              <div className="srm-request-list">
                {filteredRequests.map((r) => {
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.new
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className={`srm-request-item ${selectedRequest === r.id ? 'srm-request-active' : ''}`}
                      onClick={() => setSelectedRequest(r.id)}
                    >
                      <div className="srm-req-top">
                        <span className="srm-req-id">{r.id}</span>
                        <span className="srm-req-status" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                      </div>
                      <div className="srm-req-company">{r.companyName || r.contactName}</div>
                      <div className="srm-req-services">{r.services?.join(', ')}</div>
                      <div className="srm-req-bottom">
                        <span className="srm-req-priority" style={{ color: PRIORITY_COLORS[r.priority] || '#888' }}>{r.priority}</span>
                        <span className="srm-req-date">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="app-page-card srm-detail-panel">
            {!selected ? (
              <div className="srm-empty">Select a request to view details.</div>
            ) : (
              <div className="srm-detail">
                <div className="srm-detail-header">
                  <h3>{selected.id}</h3>
                  <span className="srm-req-status" style={{ background: STATUS_COLORS[selected.status]?.bg, color: STATUS_COLORS[selected.status]?.color }}>
                    {STATUS_COLORS[selected.status]?.label}
                  </span>
                </div>

                <div className="srm-detail-grid">
                  <div className="srm-detail-field">
                    <label>Company</label>
                    <span>{selected.companyName || '—'}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Contact</label>
                    <span>{selected.contactName || '—'}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Email</label>
                    <span>{selected.email || '—'}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Phone</label>
                    <span>{selected.phone || '—'}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Priority</label>
                    <span style={{ color: PRIORITY_COLORS[selected.priority], fontWeight: 600 }}>{selected.priority}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Preferred Date</label>
                    <span>{selected.preferredDate || '—'}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Account Type</label>
                    <span style={{ textTransform: 'capitalize' }}>{selected.accountType?.replace('_', ' ') || '—'}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Industry</label>
                    <span style={{ textTransform: 'capitalize' }}>{selected.industryId || '—'}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Service Category</label>
                    <span>{selected.serviceCategoryLabel || selected.serviceCategoryId || '—'}</span>
                  </div>
                  <div className="srm-detail-field">
                    <label>Preferred Provider</label>
                    <span>{selected.preferredProviderName || selected.preferredProviderEmail || '—'}</span>
                  </div>
                </div>

                <div className="srm-detail-section">
                  <label>Services Requested</label>
                  <div className="srm-service-tags">
                    {selected.services?.map((s, i) => (
                      <span key={i} className="srm-service-tag">{s}</span>
                    ))}
                  </div>
                </div>

                {selected.description && (
                  <div className="srm-detail-section">
                    <label>Description</label>
                    <p className="srm-desc-text">{selected.description}</p>
                  </div>
                )}

                {selected.attachmentNames?.length > 0 && (
                  <div className="srm-detail-section">
                    <label>Attachments</label>
                    <div className="srm-attachments">
                      {selected.attachmentNames.map((name, i) => (
                        <span key={i} className="srm-attachment">{name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignment section — admin only */}
                {isAdmin && (
                  <div className="srm-detail-section srm-assign-section">
                    <label>Assignment</label>
                    {selected.assignedTo ? (
                      <div className="srm-assigned-info">
                        <span>Assigned to: <strong>{selected.assignedTo}</strong></span>
                        <span className="srm-assigned-by">by {selected.assignedBy} on {selected.assignedAt ? new Date(selected.assignedAt).toLocaleDateString() : ''}</span>
                      </div>
                    ) : (
                      <div className="srm-assign-form">
                        <select value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} className="srm-select">
                          <option value="">Assign to...</option>
                          <option value={user?.email}>Myself ({user?.email})</option>
                          {assignableMembers.filter((m) => m.email !== user?.email).map((m) => (
                            <option key={m.email} value={m.email}>{m.name} ({m.role}) — {m.email}</option>
                          ))}
                        </select>
                        <button type="button" className="srm-btn-primary" onClick={() => handleAssign(selected.id)} disabled={!assignEmail}>
                          Assign
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Status update — admin/manager */}
                {isManager && (
                  <div className="srm-detail-section">
                    <label>Update Status</label>
                    <div className="srm-status-form">
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="srm-select">
                        <option value="">Change status...</option>
                        <option value="on_hold">On Hold</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        {isSuperAdmin && <option value="recalled">Recalled</option>}
                      </select>
                      <textarea
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                        placeholder="Optional note with this status change…"
                        className="srm-textarea srm-status-note"
                        rows={2}
                      />
                      <button type="button" className="srm-btn-primary" onClick={() => handleStatusUpdate(selected.id)} disabled={!newStatus}>
                        Update
                      </button>
                    </div>
                  </div>
                )}

                {/* Activity: one threaded history per request (assign, status, notes) */}
                <div className="srm-detail-section srm-activity-section">
                  <label>Activity &amp; history</label>
                  <p className="srm-activity-lead">
                    All changes for this reference stay on one thread so you can see assigned → in progress → done in order.
                  </p>
                  {activityEntries.length === 0 ? (
                    <p className="srm-empty srm-activity-empty">No activity recorded yet.</p>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="srm-activity-fold-trigger"
                        onClick={() => setActivityOpen(!activityOpen)}
                        aria-expanded={activityOpen}
                        aria-controls="srm-activity-panel"
                        id="srm-activity-fold-trigger"
                      >
                        <span className="srm-activity-fold-arrow" aria-hidden>
                          {activityOpen ? '▾' : '▸'}
                        </span>
                        <span>History of changes</span>
                        <span className="srm-activity-fold-count">({activityEntries.length})</span>
                      </button>
                      {activityOpen && (
                        <div className="srm-activity-dropdown" id="srm-activity-panel" role="region" aria-labelledby="srm-activity-fold-trigger">
                          <ol className="srm-activity-timeline">
                            {activityEntries.map((e) => (
                              <li key={e.id} className="srm-activity-row">
                                <span className="srm-activity-kind">
                                  {ACTIVITY_KIND_LABEL[e.kind] || e.kind}
                                </span>
                                <time className="srm-activity-time" dateTime={e.at}>
                                  {e.at ? new Date(e.at).toLocaleString() : '—'}
                                </time>
                                <div className="srm-activity-summary">{e.summary}</div>
                                {e.detail && (
                                  <div className="srm-activity-detail">{e.detail}</div>
                                )}
                                {e.actorEmail && (
                                  <div className="srm-activity-actor">{e.actorEmail}</div>
                                )}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Notes — same store as timeline; form appends both note + activity row */}
                {isManager && (
                  <div className="srm-detail-section">
                    <label>Add a note</label>
                    <div className="srm-note-form">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add a note… (appears in Activity above)"
                        className="srm-textarea"
                        rows={2}
                      />
                      <button type="button" className="srm-btn-secondary" onClick={() => handleAddNote(selected.id)} disabled={!newNote.trim()}>
                        Save note
                      </button>
                    </div>
                  </div>
                )}

                <div className="srm-detail-footer">
                  <span>Created: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '—'}</span>
                  <span>Updated: {selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : '—'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
