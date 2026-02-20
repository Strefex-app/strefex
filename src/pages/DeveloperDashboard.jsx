import { useState, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import AppLayout from '../components/AppLayout'
import './DeveloperDashboard.css'

/* ── Shared storage with CommunitySupport ────────────────── */
const STORAGE_KEY = 'strefex-support-tickets'
const loadAllTickets = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
const saveTickets = (tickets) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets)) } catch { /* */ }
}

const CATEGORIES = [
  { id: 'bug', label: 'Bug Report', icon: '🐛', color: '#e74c3c' },
  { id: 'feature', label: 'Feature Request', icon: '💡', color: '#f39c12' },
  { id: 'question', label: 'Question', icon: '❓', color: '#3498db' },
  { id: 'billing', label: 'Billing & Plans', icon: '💳', color: '#2ecc71' },
  { id: 'feedback', label: 'General Feedback', icon: '📝', color: '#9b59b6' },
  { id: 'account', label: 'Account Issue', icon: '🔑', color: '#e67e22' },
]

const STATUS_OPTIONS = [
  { id: 'open', label: 'Open', color: '#3498db' },
  { id: 'in_progress', label: 'In Progress', color: '#f39c12' },
  { id: 'resolved', label: 'Resolved', color: '#2ecc71' },
  { id: 'closed', label: 'Closed', color: '#999' },
]

export default function DeveloperDashboard() {
  const user = useAuthStore((s) => s.user)
  const [tickets, setTickets] = useState(loadAllTickets)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyText, setReplyText] = useState('')

  /* ── Stats ──────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const total = tickets.length
    const open = tickets.filter((t) => t.status === 'open').length
    const inProgress = tickets.filter((t) => t.status === 'in_progress').length
    const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length
    const byCategory = CATEGORIES.map((c) => ({
      ...c,
      count: tickets.filter((t) => t.category === c.id).length,
    }))
    const tenants = [...new Set(tickets.map((t) => t.tenantSlug || 'unknown'))]
    return { total, open, inProgress, resolved, byCategory, tenants }
  }, [tickets])

  /* ── Filtered list ──────────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = [...tickets]
    if (filterStatus !== 'all') list = list.filter((t) => t.status === filterStatus)
    if (filterCategory !== 'all') list = list.filter((t) => t.category === filterCategory)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (t) =>
          t.subject?.toLowerCase().includes(q) ||
          t.message?.toLowerCase().includes(q) ||
          t.userEmail?.toLowerCase().includes(q) ||
          t.id?.toLowerCase().includes(q) ||
          t.tenantName?.toLowerCase().includes(q)
      )
    }
    return list
  }, [tickets, filterStatus, filterCategory, searchQuery])

  /* ── Actions ────────────────────────────────────────────── */
  const updateStatus = (ticketId, newStatus) => {
    const updated = tickets.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    setTickets(updated)
    saveTickets(updated)
    if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, status: newStatus })
  }

  const sendReply = (ticketId) => {
    if (!replyText.trim()) return
    const reply = {
      from: 'STREFEX Support',
      message: replyText.trim(),
      createdAt: new Date().toISOString(),
    }
    const updated = tickets.map((t) =>
      t.id === ticketId ? { ...t, replies: [...(t.replies || []), reply] } : t
    )
    setTickets(updated)
    saveTickets(updated)
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, replies: [...(selectedTicket.replies || []), reply] })
    }
    setReplyText('')
  }

  const deleteTicket = (ticketId) => {
    if (!window.confirm('Delete this ticket permanently?')) return
    const updated = tickets.filter((t) => t.id !== ticketId)
    setTickets(updated)
    saveTickets(updated)
    if (selectedTicket?.id === ticketId) setSelectedTicket(null)
  }

  const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || { icon: '📄', label: id, color: '#999' }
  const statusInfo = (id) => STATUS_OPTIONS.find((s) => s.id === id) || STATUS_OPTIONS[0]

  return (
    <AppLayout>
      <div className="dd-page">
        {/* Header */}
        <div className="dd-header">
          <div>
            <h1 className="dd-title">Developer Dashboard</h1>
            <p className="dd-subtitle">STREFEX Platform — All support tickets across all tenants</p>
          </div>
          <span className="dd-badge-super">Super Admin</span>
        </div>

        {/* Stats row */}
        <div className="dd-stats">
          <div className="dd-stat"><div className="dd-stat-value">{stats.total}</div><div className="dd-stat-label">Total Tickets</div></div>
          <div className="dd-stat dd-stat-open"><div className="dd-stat-value">{stats.open}</div><div className="dd-stat-label">Open</div></div>
          <div className="dd-stat dd-stat-progress"><div className="dd-stat-value">{stats.inProgress}</div><div className="dd-stat-label">In Progress</div></div>
          <div className="dd-stat dd-stat-resolved"><div className="dd-stat-value">{stats.resolved}</div><div className="dd-stat-label">Resolved</div></div>
          <div className="dd-stat"><div className="dd-stat-value">{stats.tenants.length}</div><div className="dd-stat-label">Companies</div></div>
        </div>

        {/* Category breakdown */}
        <div className="dd-category-bar">
          {stats.byCategory.filter((c) => c.count > 0).map((c) => (
            <span key={c.id} className="dd-cat-chip" style={{ background: c.color + '18', color: c.color }}>
              {c.icon} {c.label}: {c.count}
            </span>
          ))}
        </div>

        {/* Filters */}
        <div className="dd-filters">
          <input
            className="dd-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets, users, companies..."
          />
          <select className="dd-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select className="dd-filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>

        {/* Two-panel layout */}
        <div className="dd-panels">
          {/* Left: ticket list */}
          <div className="dd-list">
            {filtered.length === 0 ? (
              <div className="dd-empty">No tickets match your filters.</div>
            ) : (
              filtered.map((tk) => (
                <div
                  key={tk.id}
                  className={`dd-ticket-row ${selectedTicket?.id === tk.id ? 'active' : ''}`}
                  onClick={() => { setSelectedTicket(tk); setReplyText('') }}
                >
                  <div className="dd-row-top">
                    <span className="dd-row-id">{tk.id}</span>
                    <span className="dd-row-status" style={{ background: statusInfo(tk.status).color + '22', color: statusInfo(tk.status).color }}>
                      {statusInfo(tk.status).label}
                    </span>
                  </div>
                  <div className="dd-row-subject">{tk.subject}</div>
                  <div className="dd-row-meta">
                    <span>{catInfo(tk.category).icon} {catInfo(tk.category).label}</span>
                    <span>{tk.userName || tk.userEmail}</span>
                    <span>{tk.tenantName}</span>
                    <span>{new Date(tk.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: ticket detail */}
          <div className="dd-detail">
            {!selectedTicket ? (
              <div className="dd-detail-empty">Select a ticket to view details</div>
            ) : (
              <>
                <div className="dd-detail-header">
                  <div>
                    <h3 className="dd-detail-subject">{selectedTicket.subject}</h3>
                    <div className="dd-detail-meta">
                      <span>{selectedTicket.id}</span>
                      <span>{catInfo(selectedTicket.category).icon} {catInfo(selectedTicket.category).label}</span>
                      <span>Priority: <strong>{selectedTicket.priority}</strong></span>
                    </div>
                  </div>
                  <div className="dd-detail-actions">
                    <select
                      className="dd-status-select"
                      value={selectedTicket.status}
                      onChange={(e) => updateStatus(selectedTicket.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <button className="dd-btn-delete" onClick={() => deleteTicket(selectedTicket.id)}>Delete</button>
                  </div>
                </div>

                <div className="dd-detail-info">
                  <div className="dd-info-row"><strong>From:</strong> {selectedTicket.userName} ({selectedTicket.userEmail})</div>
                  <div className="dd-info-row"><strong>Company:</strong> {selectedTicket.tenantName} ({selectedTicket.tenantSlug})</div>
                  <div className="dd-info-row"><strong>Role:</strong> {selectedTicket.userRole}</div>
                  <div className="dd-info-row"><strong>Date:</strong> {new Date(selectedTicket.createdAt).toLocaleString()}</div>
                  {selectedTicket.attachmentName && (
                    <div className="dd-info-row"><strong>Attachment:</strong> {selectedTicket.attachmentName}</div>
                  )}
                </div>

                <div className="dd-detail-message">{selectedTicket.message}</div>

                {/* Replies */}
                {selectedTicket.replies?.length > 0 && (
                  <div className="dd-replies">
                    <h4 className="dd-replies-title">Replies ({selectedTicket.replies.length})</h4>
                    {selectedTicket.replies.map((r, i) => (
                      <div key={i} className={`dd-reply ${r.from === 'STREFEX Support' ? 'dd-reply-staff' : ''}`}>
                        <div className="dd-reply-from">{r.from}</div>
                        <div className="dd-reply-msg">{r.message}</div>
                        <div className="dd-reply-time">{new Date(r.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                <div className="dd-reply-form">
                  <textarea
                    className="dd-reply-input"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    rows={3}
                  />
                  <button className="dd-btn dd-btn-primary" onClick={() => sendReply(selectedTicket.id)} disabled={!replyText.trim()}>
                    Send Reply
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
