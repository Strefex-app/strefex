import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useTranslation } from '../i18n/useTranslation'
import { analytics } from '../services/analytics'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import './CommunitySupport.css'

/* ── Ticket categories ────────────────────────────────────── */
const CATEGORIES = [
  { id: 'bug', label: 'Bug Report', icon: 'alert', color: '#192A56' },
  { id: 'feature', label: 'Feature Request', icon: 'ai', color: '#192A56' },
  { id: 'question', label: 'Question', icon: 'info', color: '#192A56' },
  { id: 'billing', label: 'Billing & Plans', icon: 'wallet', color: '#192A56' },
  { id: 'feedback', label: 'General Feedback', icon: 'edit', color: '#192A56' },
  { id: 'account', label: 'Account Issue', icon: 'key', color: '#192A56' },
]

const PRIORITIES = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'critical', label: 'Critical' },
]

/* ── Support ticket store (in-memory, will be replaced by backend) ── */
const STORAGE_KEY = 'strefex-support-tickets'
const loadTickets = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
const saveTickets = (tickets) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets)) } catch { /* */ }
}

export default function CommunitySupport() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const role = useAuthStore((s) => s.role)

  const [tickets, setTickets] = useState(loadTickets)
  const [activeTab, setActiveTab] = useState('submit') // 'submit' | 'mytickets' | 'faq'
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('medium')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const myTickets = tickets.filter(
    (t) => t.userEmail === (user?.email || 'guest@strefex.com')
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!category) { setError('Please select a category'); return }
    if (!subject.trim()) { setError('Please enter a subject'); return }
    if (!message.trim()) { setError('Please describe your issue'); return }

    const newTicket = {
      id: `TK-${Date.now().toString(36).toUpperCase()}`,
      category,
      priority,
      subject: subject.trim(),
      message: message.trim(),
      attachmentName: attachment?.name || null,
      userEmail: user?.email || 'guest@strefex.com',
      userName: user?.fullName || 'User',
      userRole: role,
      tenantName: tenant?.name || 'Company',
      tenantSlug: tenant?.slug || 'guest',
      status: 'open',
      createdAt: new Date().toISOString(),
      replies: [],
    }

    const updated = [newTicket, ...tickets]
    setTickets(updated)
    saveTickets(updated)

    analytics.track('support_ticket_submitted', { category, priority })

    setCategory('')
    setPriority('medium')
    setSubject('')
    setMessage('')
    setAttachment(null)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 4000)
  }

  const statusColor = (s) =>
    s === 'open' ? '#3498db' : s === 'in_progress' ? '#f39c12' : s === 'resolved' ? '#2ecc71' : '#999'

  return (
    <AppLayout>
      <div className="cs-page">
        {/* Header */}
        <div className="cs-header">
          <div>
            <h1 className="cs-title">Community Support</h1>
            <p className="cs-subtitle">Get help, report issues, or share feedback with the STREFEX team</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="cs-tabs">
          {[
            { id: 'submit', label: 'Submit Request' },
            { id: 'mytickets', label: `My Tickets (${myTickets.length})` },
            { id: 'faq', label: 'FAQ' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`cs-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Submit tab ─────────────────────────────────────── */}
        {activeTab === 'submit' && (
          <div className="cs-content">
            {submitted && (
              <div className="cs-alert cs-alert-success">
                <Icon name="check" size={20} />
                Your ticket has been submitted! Our team will respond shortly.
              </div>
            )}

            {/* Category selector */}
            <div className="cs-card">
              <h3 className="cs-card-title">What can we help you with?</h3>
              <div className="cs-categories">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    className={`cs-category ${category === c.id ? 'active' : ''}`}
                    onClick={() => setCategory(c.id)}
                    style={{ '--cat-color': c.color }}
                  >
                    <span className="cs-category-icon"><Icon name={c.icon} size={20} /></span>
                    <span className="cs-category-label">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket form */}
            <form className="cs-card cs-form" onSubmit={handleSubmit}>
              {error && <div className="cs-alert cs-alert-error">{error}</div>}

              <div className="cs-form-row">
                <label className="cs-label">
                  Subject *
                  <input
                    className="cs-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    maxLength={200}
                  />
                </label>
                <label className="cs-label cs-label-sm">
                  Priority
                  <select className="cs-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="cs-label">
                Description *
                <textarea
                  className="cs-input cs-textarea"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your issue in detail. Include steps to reproduce if reporting a bug."
                  rows={5}
                />
              </label>

              <label className="cs-label">
                Attachment (optional)
                <input
                  type="file"
                  className="cs-file-input"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  accept=".png,.jpg,.jpeg,.gif,.pdf,.txt,.csv"
                />
                {attachment && <span className="cs-file-name">{attachment.name}</span>}
              </label>

              <div className="cs-form-footer">
                <span className="cs-form-hint">All tickets are sent to the STREFEX developer team.</span>
                <button type="submit" className="cs-btn cs-btn-primary">Submit Ticket</button>
              </div>
            </form>
          </div>
        )}

        {/* ── My Tickets tab ─────────────────────────────────── */}
        {activeTab === 'mytickets' && (
          <div className="cs-content">
            {myTickets.length === 0 ? (
              <div className="cs-card cs-empty">
                <Icon name="messenger" size={48} color="#ccc" />
                <p>No tickets yet. Submit a request to get started.</p>
              </div>
            ) : (
              <div className="cs-tickets">
                {myTickets.map((tk) => (
                  <div key={tk.id} className="cs-ticket-card">
                    <div className="cs-ticket-header">
                      <span className="cs-ticket-id">{tk.id}</span>
                      <span className="cs-ticket-status" style={{ background: statusColor(tk.status) + '22', color: statusColor(tk.status) }}>
                        {tk.status === 'in_progress' ? 'In Progress' : tk.status.charAt(0).toUpperCase() + tk.status.slice(1)}
                      </span>
                    </div>
                    <h4 className="cs-ticket-subject">{tk.subject}</h4>
                    <p className="cs-ticket-preview">{tk.message.slice(0, 120)}{tk.message.length > 120 ? '...' : ''}</p>
                    <div className="cs-ticket-meta">
                      <span><Icon name={CATEGORIES.find((c) => c.id === tk.category)?.icon || 'info'} size={14} /> {CATEGORIES.find((c) => c.id === tk.category)?.label}</span>
                      <span>Priority: {tk.priority}</span>
                      <span>{new Date(tk.createdAt).toLocaleDateString()}</span>
                    </div>
                    {tk.replies.length > 0 && (
                      <div className="cs-ticket-replies">
                        {tk.replies.map((r, i) => (
                          <div key={i} className="cs-reply">
                            <strong>{r.from}:</strong> {r.message}
                            <span className="cs-reply-time">{new Date(r.createdAt).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FAQ tab ────────────────────────────────────────── */}
        {activeTab === 'faq' && (
          <div className="cs-content">
            <div className="cs-card">
              <h3 className="cs-card-title">Frequently Asked Questions</h3>
              {[
                { q: 'How do I upgrade my subscription?', a: 'Go to Plans in the sidebar and choose the plan that fits your needs. Click Subscribe to complete the upgrade via Stripe.' },
                { q: 'Can I invite team members?', a: 'Admins can manage team members from the Team page. Go to Team in the sidebar, then click Invite Member.' },
                { q: 'How does role-based access work?', a: 'Users have standard access. Managers can view program management and reports. Admins can manage team, billing, and all features.' },
                { q: 'How do I export data to PDF?', a: 'Most pages with tables or charts include an Export PDF button. Look for it in the page header or toolbar.' },
                { q: 'What happens when my trial expires?', a: 'After the 14-day trial, your account reverts to the Start (free) tier. Upgrade anytime to keep your Enterprise features.' },
                { q: 'How do I contact support?', a: 'Use this Community Support page to submit a ticket. Our developer team reviews all tickets and responds promptly.' },
              ].map((faq, i) => (
                <details key={i} className="cs-faq-item">
                  <summary className="cs-faq-q">{faq.q}</summary>
                  <p className="cs-faq-a">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
