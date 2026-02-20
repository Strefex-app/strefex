import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useExhibitionStore from '../store/exhibitionStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useTransactionStore, getCompanyDomain } from '../store/transactionStore'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAccountRegistry } from '../store/accountRegistry'
import '../styles/app-page.css'
import './Notifications.css'

const INDUSTRY_COLORS = {
  Automotive: '#e74c3c',
  Manufacturing: '#3498db',
  Plastic: '#27ae60',
  Metal: '#e67e22',
  'Medical Equipment': '#9b59b6',
  'Raw Materials': '#16a085',
}

const TASK_STATUS_LABELS = {
  unassigned: { label: 'Unassigned', color: '#e74c3c', bg: '#fce4ec' },
  assigned: { label: 'Assigned', color: '#e65100', bg: '#fff3e0' },
  in_progress: { label: 'In Progress', color: '#7b1fa2', bg: '#f3e5f5' },
  completed: { label: 'Completed', color: '#2e7d32', bg: '#e8f5e9' },
}

/** Human-readable labels for multi-level plan approval statuses. */
const PLAN_STATUS_MAP = {
  requested:                 { label: 'Awaiting Company Admin',  color: '#e65100', bg: '#fff3e0' },
  company_approved:          { label: 'Approved — Awaiting Payment', color: '#1565c0', bg: '#e3f2fd' },
  pending_platform_approval: { label: 'Paid — Awaiting STREFEX',  color: '#6a1b9a', bg: '#f3e5f5' },
  pending_approval:          { label: 'Paid — Awaiting STREFEX',  color: '#6a1b9a', bg: '#f3e5f5' },
  paid:                      { label: 'Active',                   color: '#2e7d32', bg: '#e8f5e9' },
  rejected_by_company:       { label: 'Rejected by Company Admin', color: '#c62828', bg: '#fce4ec' },
  rejected_by_platform:      { label: 'Rejected by STREFEX',     color: '#c62828', bg: '#fce4ec' },
}

export default function Notifications() {
  const navigate = useNavigate()
  const { getPlannedExhibitions } = useExhibitionStore()
  const planned = getPlannedExhibitions()

  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const isSuperAdmin = role === 'superadmin'
  const isAdmin = role === 'admin' || isSuperAdmin
  const isCompanyAdmin = role === 'admin' // company-level admin (NOT superadmin)
  const isManager = role === 'manager' || isAdmin

  const myDomain = getCompanyDomain(user?.email)

  /* ── Service request notifications ── */
  const serviceNotifications = useServiceRequestStore((s) => s.notifications)
  const markNotificationRead = useServiceRequestStore((s) => s.markNotificationRead)

  // Scope service notifications: superuser sees all, company admin/manager sees own company only
  const scopedServiceNotifs = useMemo(() => {
    const unread = serviceNotifications.filter(
      (n) => !(n.readBy || []).includes(user?.email)
    )
    if (isSuperAdmin) return unread
    if (!isManager || !myDomain) return []
    return unread.filter(
      (n) => getCompanyDomain(n.fromEmail) === myDomain
    )
  }, [serviceNotifications, isSuperAdmin, isManager, myDomain, user?.email])

  /* ── Transactions ── */
  const allTransactions = useTransactionStore((s) => s.transactions)
  const assignTask = useTransactionStore((s) => s.assignTask)
  const updateTaskStatus = useTransactionStore((s) => s.updateTaskStatus)
  const companyApprovePlan = useTransactionStore((s) => s.companyApprovePlan)
  const companyRejectPlan = useTransactionStore((s) => s.companyRejectPlan)
  const platformApprovePlan = useTransactionStore((s) => s.platformApprovePlan)
  const platformRejectPlan = useTransactionStore((s) => s.platformRejectPlan)
  const setPlan = useSubscriptionStore((s) => s.setPlan)

  /* ── Company admin: team upgrade requests (scoped to company domain) ── */
  const companyPendingRequests = useMemo(() => {
    if (!isCompanyAdmin || !myDomain) return []
    return allTransactions.filter(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        tx.status === 'requested' &&
        (tx.companyDomain || getCompanyDomain(tx.userEmail)) === myDomain
    )
  }, [allTransactions, isCompanyAdmin, myDomain])

  /* ── Company admin: paid, awaiting STREFEX (scoped) ── */
  const companyPendingPlatform = useMemo(() => {
    if (!isCompanyAdmin || !myDomain) return []
    return allTransactions.filter(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        (tx.status === 'pending_platform_approval' || tx.status === 'pending_approval') &&
        (tx.companyDomain || getCompanyDomain(tx.userEmail)) === myDomain
    )
  }, [allTransactions, isCompanyAdmin, myDomain])

  /* ── STREFEX superuser: ALL pending platform approvals ── */
  const platformPendingApprovals = useMemo(() => {
    if (!isSuperAdmin) return []
    return allTransactions.filter(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        (tx.status === 'pending_platform_approval' || tx.status === 'pending_approval')
    )
  }, [allTransactions, isSuperAdmin])

  /* ── STREFEX superuser: service payment tasks (actionable) ── */
  const serviceTasks = useMemo(() => {
    if (!isSuperAdmin) return []
    return allTransactions.filter((tx) => tx.type === 'service_payment')
  }, [allTransactions, isSuperAdmin])
  const unassignedTasks = serviceTasks.filter((tx) => !tx.taskStatus || tx.taskStatus === 'unassigned')
  const assignedTasks = serviceTasks.filter((tx) => tx.taskStatus === 'assigned' || tx.taskStatus === 'in_progress')

  /* ── Regular user: own pending upgrade request ── */
  const userPendingRequest = useMemo(() => {
    if (isAdmin) return null // admins use the specialized sections
    return allTransactions.find(
      (tx) =>
        tx.type === 'plan_upgrade' &&
        ['requested', 'company_approved', 'pending_platform_approval', 'pending_approval'].includes(tx.status) &&
        tx.userEmail === user?.email
    )
  }, [allTransactions, isAdmin, user?.email])

  /* ── Recent transactions: company-scoped for admin, user-scoped for user ── */
  const recentTransactions = useMemo(() => {
    if (isSuperAdmin) return [] // superuser has specialized views
    if (isCompanyAdmin && myDomain) {
      return allTransactions
        .filter((tx) => (tx.companyDomain || getCompanyDomain(tx.userEmail)) === myDomain)
        .slice(0, 10)
    }
    return allTransactions.filter((tx) => tx.userEmail === user?.email).slice(0, 5)
  }, [allTransactions, isSuperAdmin, isCompanyAdmin, myDomain, user?.email])

  /* ── Get STREFEX team members for task assignment (superuser only) ── */
  const accounts = useAccountRegistry((s) => s.accounts)
  const assignableMembers = useMemo(() => {
    const members = []
    accounts.forEach((acct) => {
      if (acct.email) members.push({ email: acct.email, name: acct.contactName || acct.company, role: acct.role || 'user' })
      if (acct.teamMembers) {
        acct.teamMembers.forEach((tm) => {
          members.push({ email: tm.email, name: tm.name, role: tm.role || 'user' })
        })
      }
    })
    const seen = new Set()
    return members.filter((m) => {
      if (seen.has(m.email)) return false
      seen.add(m.email)
      return true
    })
  }, [accounts])

  /* ── Local UI state ── */
  const [rejectingTxId, setRejectingTxId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [assigningTxId, setAssigningTxId] = useState(null)
  const [selectedAssignee, setSelectedAssignee] = useState('')

  /* ── Handlers: Company admin ── */
  const handleCompanyApproveAndPay = (tx) => {
    companyApprovePlan(tx.id, user?.email)
    const billing = tx.billingPeriod || (tx.service?.includes('3-Year') ? 'triennial' : tx.service?.includes('Annual') || tx.service?.includes('Yearly') ? 'annual' : 'monthly')
    navigate(`/payment?plan=${tx.planTo}&billing=${billing}&txId=${tx.id}`)
  }

  const handleCompanyReject = (txId) => {
    companyRejectPlan(txId, user?.email, rejectReason)
    setRejectingTxId(null)
    setRejectReason('')
  }

  /* ── Handlers: STREFEX superuser (platform approval) ── */
  const handlePlatformApprove = (txId) => {
    const approvedTx = platformApprovePlan(txId, user?.email)
    if (approvedTx?.planTo && approvedTx?.userEmail) {
      // Persist plan activation for the target user
      const targetEmail = approvedTx.userEmail.toLowerCase().replace(/[^a-z0-9@._\-]/g, '')
      try {
        const key = `strefex-subscription::${targetEmail}`
        const raw = localStorage.getItem(key)
        const current = raw ? JSON.parse(raw) : {}
        current.planId = approvedTx.planTo
        current.status = 'active'
        current.trialEndsAt = null
        localStorage.setItem(key, JSON.stringify(current))
      } catch { /* ignore */ }

      // If the approved user is the currently logged-in user, update store immediately
      if (approvedTx.userEmail === user?.email) {
        setPlan(approvedTx.planTo, 'active')
      }
    }
  }

  const handlePlatformReject = (txId) => {
    platformRejectPlan(txId, user?.email, rejectReason)
    setRejectingTxId(null)
    setRejectReason('')
  }

  /* ── Handlers: Service task assignment (superuser) ── */
  const handleAssignTask = (txId) => {
    if (!selectedAssignee) return
    const member = assignableMembers.find((m) => m.email === selectedAssignee)
    assignTask(txId, selectedAssignee, member?.name || selectedAssignee, user?.email)
    setAssigningTxId(null)
    setSelectedAssignee('')
  }

  const handleTaskStatusChange = (txId, newStatus) => {
    updateTaskStatus(txId, newStatus)
  }

  /* ── Build exhibition notifications ── */
  const allNotifications = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  planned.forEach((ex) => {
    const start = new Date(ex.startDate + 'T00:00:00')
    start.setHours(0, 0, 0, 0)
    const diff = Math.ceil((start - today) / 86400000)

    if (diff <= 30 && diff > 0) {
      allNotifications.push({
        id: `${ex.id}-1m`,
        exhibition: ex,
        type: 'reminder',
        urgency: diff <= 1 ? 'urgent' : diff <= 7 ? 'warning' : 'info',
        message: diff === 1 ? 'Starts TOMORROW!' : diff <= 7 ? `Starts in ${diff} days` : `Starts in ${diff} days (within 1 month)`,
        daysLeft: diff,
        icon: diff <= 1 ? 'urgent' : diff <= 7 ? 'week' : 'month',
      })
    }
    if (diff === 0) {
      allNotifications.push({
        id: `${ex.id}-today`,
        exhibition: ex,
        type: 'today',
        urgency: 'today',
        message: 'Exhibition starts TODAY!',
        daysLeft: 0,
        icon: 'today',
      })
    }
    if (diff < 0 && diff >= -7) {
      const endDate = new Date(ex.endDate + 'T00:00:00')
      if (today <= endDate) {
        allNotifications.push({
          id: `${ex.id}-ongoing`,
          exhibition: ex,
          type: 'ongoing',
          urgency: 'ongoing',
          message: 'Exhibition is currently ongoing',
          daysLeft: diff,
          icon: 'ongoing',
        })
      }
    }
  })

  const scheduled = planned.filter((ex) => {
    const start = new Date(ex.startDate + 'T00:00:00')
    const diff = Math.ceil((start - today) / 86400000)
    return diff > 30
  })

  allNotifications.sort((a, b) => a.daysLeft - b.daysLeft)

  const getUrgencyIcon = (icon) => {
    switch (icon) {
      case 'today':
        return <span className="notif-icon today">!</span>
      case 'urgent':
        return <span className="notif-icon urgent">1d</span>
      case 'week':
        return <span className="notif-icon week">1w</span>
      case 'month':
        return <span className="notif-icon month">1m</span>
      case 'ongoing':
        return <span className="notif-icon ongoing">●</span>
      default:
        return <span className="notif-icon info">i</span>
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  /* ── Check if we have any content to show ── */
  const hasExhibitionContent = allNotifications.length > 0 || scheduled.length > 0
  const hasCompanyAdminContent = companyPendingRequests.length > 0 || companyPendingPlatform.length > 0
  const hasSuperuserContent = platformPendingApprovals.length > 0 || unassignedTasks.length > 0 || assignedTasks.length > 0
  const hasServiceNotifs = scopedServiceNotifs.length > 0
  const hasUserRequest = !!userPendingRequest
  const hasTransactions = recentTransactions.length > 0
  const hasAnyContent = hasExhibitionContent || hasCompanyAdminContent || hasSuperuserContent || hasServiceNotifs || hasUserRequest || hasTransactions

  /* ── Reject form helper ── */
  const renderRejectForm = (txId, onConfirm) => (
    <div className="notif-task-assign-form" style={{ marginTop: 10 }}>
      <input
        type="text"
        className="notif-task-select"
        placeholder="Reason for rejection (optional)"
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        style={{ flex: 1 }}
      />
      <button
        className="notif-task-btn"
        onClick={() => onConfirm(txId)}
        style={{ background: '#d32f2f', color: '#fff' }}
      >
        Confirm Reject
      </button>
      <button
        className="notif-task-btn notif-task-btn-secondary"
        onClick={() => { setRejectingTxId(null); setRejectReason('') }}
      >
        Cancel
      </button>
    </div>
  )

  return (
    <AppLayout>
      <div className="app-page notif-page">
        <div className="app-page-card">
          <h2 className="app-page-title">Notifications</h2>
          <p className="app-page-subtitle">
            {isSuperAdmin
              ? 'Platform-wide notifications, subscription approvals, and task management.'
              : isCompanyAdmin
              ? 'Company notifications, team upgrade requests, and subscription status.'
              : 'Exhibition reminders, upgrade requests, and account activity.'}
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════
         *  1. EXHIBITION REMINDERS (unchanged, everyone)
         * ═══════════════════════════════════════════════════════ */}
        {allNotifications.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">Active Reminders</h3>
            <div className="notif-list">
              {allNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${n.urgency}`}
                  onClick={() => navigate('/profile/calendar')}
                >
                  {getUrgencyIcon(n.icon)}
                  <div className="notif-body">
                    <div className="notif-name">{n.exhibition.name}</div>
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-meta">
                      <span className="notif-industry" style={{ color: INDUSTRY_COLORS[n.exhibition.industry] }}>{n.exhibition.industry}</span>
                      <span className="notif-dot">·</span>
                      <span>{n.exhibition.city}, {n.exhibition.country}</span>
                      <span className="notif-dot">·</span>
                      <span>{formatDate(n.exhibition.startDate)} – {formatDate(n.exhibition.endDate)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. SCHEDULED EXHIBITIONS */}
        {scheduled.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">Scheduled Exhibitions</h3>
            <p className="notif-section-sub">Reminders will be sent 1 month, 1 week, and 1 day before the start date.</p>
            <div className="notif-scheduled-list">
              {scheduled.map((ex) => {
                const start = new Date(ex.startDate + 'T00:00:00')
                const diff = Math.ceil((start - today) / 86400000)
                return (
                  <div
                    key={ex.id}
                    className="notif-scheduled-item"
                    onClick={() => navigate('/profile/calendar')}
                  >
                    <div className="scheduled-color" style={{ background: INDUSTRY_COLORS[ex.industry] }} />
                    <div className="scheduled-info">
                      <div className="scheduled-name">{ex.name}</div>
                      <div className="scheduled-meta">
                        {formatDate(ex.startDate)} – {formatDate(ex.endDate)} · {ex.city}, {ex.country}
                      </div>
                    </div>
                    <div className="scheduled-countdown">{diff} days</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  3. COMPANY ADMIN: Team Upgrade Requests (company-scoped)
         * ═══════════════════════════════════════════════════════ */}
        {isCompanyAdmin && !isSuperAdmin && companyPendingRequests.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">
              Team Upgrade Requests
              <span className="notif-badge" style={{ background: '#fff3e0', color: '#e65100' }}>{companyPendingRequests.length} pending</span>
            </h3>
            <p className="notif-section-sub">
              Users in your company have requested plan upgrades. Approve and complete payment to proceed.
            </p>
            <div className="notif-task-list">
              {companyPendingRequests.map((tx) => (
                <div key={tx.id} className="notif-task-card notif-task-unassigned" style={{ borderLeftColor: '#e65100' }}>
                  <div className="notif-task-header">
                    <span className="notif-task-badge" style={{ background: '#fff3e0', color: '#e65100' }}>Upgrade Request</span>
                    <span className="notif-task-amount">${(tx.amount || 0).toLocaleString()}/mo</span>
                  </div>
                  <div className="notif-task-service">{tx.service}</div>
                  <div className="notif-task-meta">
                    <span><strong>Requested by:</strong> {tx.requestedBy || tx.userEmail}</span>
                    <span className="notif-dot">·</span>
                    <span><strong>From:</strong> {tx.planFrom || 'start'} → <strong>To:</strong> {tx.planTo}</span>
                    <span className="notif-dot">·</span>
                    <span>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</span>
                  </div>

                  {rejectingTxId === tx.id
                    ? renderRejectForm(tx.id, handleCompanyReject)
                    : (
                      <div className="notif-task-actions" style={{ marginTop: 10 }}>
                        <button
                          className="notif-task-btn notif-task-btn-success"
                          onClick={() => handleCompanyApproveAndPay(tx)}
                        >
                          ✓ Approve &amp; Pay
                        </button>
                        <button
                          className="notif-task-btn"
                          onClick={() => setRejectingTxId(tx.id)}
                          style={{ background: '#ffebee', color: '#d32f2f' }}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  4. COMPANY ADMIN: Awaiting STREFEX Approval (read-only)
         * ═══════════════════════════════════════════════════════ */}
        {isCompanyAdmin && !isSuperAdmin && companyPendingPlatform.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">
              Awaiting STREFEX Approval
              <span className="notif-badge" style={{ background: '#e3f2fd', color: '#1565c0' }}>{companyPendingPlatform.length}</span>
            </h3>
            <p className="notif-section-sub">
              Payment has been submitted. These subscriptions are awaiting final approval from STREFEX.
            </p>
            <div className="notif-task-list">
              {companyPendingPlatform.map((tx) => (
                <div key={tx.id} className="notif-task-card" style={{ borderLeftColor: '#1565c0' }}>
                  <div className="notif-task-header">
                    <span className="notif-task-badge" style={{ background: '#e3f2fd', color: '#1565c0' }}>Awaiting STREFEX</span>
                    <span className="notif-task-amount">${(tx.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="notif-task-service">{tx.service}</div>
                  <div className="notif-task-meta">
                    <span><strong>User:</strong> {tx.userEmail}</span>
                    <span className="notif-dot">·</span>
                    <span><strong>Paid by:</strong> {tx.paidBy || tx.companyApprovedBy || '—'}</span>
                    <span className="notif-dot">·</span>
                    <span><strong>Method:</strong> {tx.method || '—'}</span>
                    <span className="notif-dot">·</span>
                    <span>{tx.paidAt ? new Date(tx.paidAt).toLocaleDateString() : tx.date ? new Date(tx.date).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  5. STREFEX SUPERUSER: Platform Subscription Approvals
         * ═══════════════════════════════════════════════════════ */}
        {isSuperAdmin && platformPendingApprovals.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">
              Platform Subscription Approvals
              <span className="notif-badge" style={{ background: '#f3e5f5', color: '#6a1b9a' }}>{platformPendingApprovals.length} pending</span>
            </h3>
            <p className="notif-section-sub">
              Companies have paid for plan upgrades. Review and approve to activate subscriptions.
            </p>
            <div className="notif-task-list">
              {platformPendingApprovals.map((tx) => (
                <div key={tx.id} className="notif-task-card notif-task-unassigned" style={{ borderLeftColor: '#6a1b9a' }}>
                  <div className="notif-task-header">
                    <span className="notif-task-badge" style={{ background: '#f3e5f5', color: '#6a1b9a' }}>Pending Approval</span>
                    <span className="notif-task-amount">${(tx.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="notif-task-service">{tx.service}</div>
                  <div className="notif-task-meta">
                    <span><strong>Company:</strong> {tx.companyName || tx.companyDomain || '—'}</span>
                    <span className="notif-dot">·</span>
                    <span><strong>User:</strong> {tx.userEmail}</span>
                    <span className="notif-dot">·</span>
                    <span><strong>Paid by:</strong> {tx.paidBy || tx.userEmail}</span>
                    <span className="notif-dot">·</span>
                    <span><strong>From:</strong> {tx.planFrom || 'start'} → <strong>To:</strong> {tx.planTo}</span>
                    <span className="notif-dot">·</span>
                    <span><strong>Method:</strong> {tx.method || '—'}</span>
                    <span className="notif-dot">·</span>
                    <span>{tx.paidAt ? new Date(tx.paidAt).toLocaleDateString() : tx.date ? new Date(tx.date).toLocaleDateString() : ''}</span>
                  </div>

                  {rejectingTxId === tx.id
                    ? renderRejectForm(tx.id, handlePlatformReject)
                    : (
                      <div className="notif-task-actions" style={{ marginTop: 10 }}>
                        <button
                          className="notif-task-btn notif-task-btn-success"
                          onClick={() => handlePlatformApprove(tx.id)}
                        >
                          ✓ Approve &amp; Activate Plan
                        </button>
                        <button
                          className="notif-task-btn"
                          onClick={() => setRejectingTxId(tx.id)}
                          style={{ background: '#ffebee', color: '#d32f2f' }}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  6. STREFEX SUPERUSER: Service Tasks — Unassigned
         * ═══════════════════════════════════════════════════════ */}
        {isSuperAdmin && unassignedTasks.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">
              Service Tasks — Unassigned
              <span className="notif-badge">{unassignedTasks.length} pending</span>
            </h3>
            <p className="notif-section-sub">
              Clients have paid for these services. Assign each task to a STREFEX team member to fulfil the request.
            </p>
            <div className="notif-task-list">
              {unassignedTasks.map((tx) => (
                <div key={tx.id} className="notif-task-card notif-task-unassigned">
                  <div className="notif-task-header">
                    <span className="notif-task-badge" style={{ background: TASK_STATUS_LABELS.unassigned.bg, color: TASK_STATUS_LABELS.unassigned.color }}>
                      Unassigned
                    </span>
                    <span className="notif-task-amount">${(tx.amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="notif-task-service">{tx.service}</div>
                  <div className="notif-task-meta">
                    <span>From: <strong>{tx.companyName || tx.userEmail}</strong></span>
                    <span className="notif-dot">·</span>
                    <span>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</span>
                    <span className="notif-dot">·</span>
                    <span className={`notif-task-pay-status ${tx.status}`}>{tx.status === 'paid' ? 'Paid' : tx.status === 'pending' ? 'Payment Pending' : tx.status}</span>
                  </div>

                  {assigningTxId === tx.id ? (
                    <div className="notif-task-assign-form">
                      <select
                        value={selectedAssignee}
                        onChange={(e) => setSelectedAssignee(e.target.value)}
                        className="notif-task-select"
                      >
                        <option value="">Select team member...</option>
                        <option value={user?.email}>Myself ({user?.fullName || user?.name || user?.email})</option>
                        {assignableMembers.filter((m) => m.email !== user?.email).map((m) => (
                          <option key={m.email} value={m.email}>{m.name} ({m.role}) — {m.email}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="notif-task-btn notif-task-btn-primary"
                        onClick={() => handleAssignTask(tx.id)}
                        disabled={!selectedAssignee}
                      >
                        Assign
                      </button>
                      <button
                        type="button"
                        className="notif-task-btn notif-task-btn-secondary"
                        onClick={() => { setAssigningTxId(null); setSelectedAssignee('') }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="notif-task-btn notif-task-btn-primary"
                      onClick={() => setAssigningTxId(tx.id)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                        <path d="M20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Assign Task
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  7. STREFEX SUPERUSER: Assigned / In Progress Tasks
         * ═══════════════════════════════════════════════════════ */}
        {isSuperAdmin && assignedTasks.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">
              Service Tasks — In Progress
              <span className="notif-badge" style={{ background: '#e65100' }}>{assignedTasks.length} active</span>
            </h3>
            <div className="notif-task-list">
              {assignedTasks.map((tx) => {
                const st = TASK_STATUS_LABELS[tx.taskStatus] || TASK_STATUS_LABELS.assigned
                return (
                  <div key={tx.id} className="notif-task-card notif-task-assigned">
                    <div className="notif-task-header">
                      <span className="notif-task-badge" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                      <span className="notif-task-amount">${(tx.amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="notif-task-service">{tx.service}</div>
                    <div className="notif-task-meta">
                      <span>From: <strong>{tx.companyName || tx.userEmail}</strong></span>
                      <span className="notif-dot">·</span>
                      <span>Assigned to: <strong>{tx.assignedToName || tx.assignedTo}</strong></span>
                      <span className="notif-dot">·</span>
                      <span>{tx.assignedAt ? new Date(tx.assignedAt).toLocaleDateString() : ''}</span>
                    </div>
                    <div className="notif-task-actions">
                      {tx.taskStatus === 'assigned' && (
                        <button
                          type="button"
                          className="notif-task-btn notif-task-btn-primary"
                          onClick={() => handleTaskStatusChange(tx.id, 'in_progress')}
                        >
                          Start Work
                        </button>
                      )}
                      {(tx.taskStatus === 'assigned' || tx.taskStatus === 'in_progress') && (
                        <button
                          type="button"
                          className="notif-task-btn notif-task-btn-success"
                          onClick={() => handleTaskStatusChange(tx.id, 'completed')}
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  8. SERVICE REQUEST NOTIFICATIONS (company-scoped)
         * ═══════════════════════════════════════════════════════ */}
        {isManager && scopedServiceNotifs.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">
              Service Requests
              <span className="notif-badge">{scopedServiceNotifs.length} new</span>
            </h3>
            <div className="notif-list">
              {scopedServiceNotifs.map((n) => (
                <div
                  key={n.id}
                  className="notif-item info"
                  onClick={() => {
                    markNotificationRead(n.id, user?.email)
                    navigate('/service-requests')
                  }}
                >
                  <span className="notif-icon service">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <div className="notif-body">
                    <div className="notif-name">{n.title}</div>
                    <div className="notif-message">{n.message}</div>
                    <div className="notif-meta">
                      <span style={{ color: n.priority === 'Urgent' ? '#e74c3c' : n.priority === 'High' ? '#e67e22' : '#3498db', fontWeight: 600 }}>{n.priority}</span>
                      <span className="notif-dot">·</span>
                      <span>{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  9. REGULAR USER: Your Upgrade Request Status
         * ═══════════════════════════════════════════════════════ */}
        {userPendingRequest && (
          <div className="app-page-card">
            <h3 className="notif-section-title">Your Upgrade Request</h3>
            <div className="notif-task-list">
              <div
                className="notif-task-card"
                style={{ borderLeftColor: PLAN_STATUS_MAP[userPendingRequest.status]?.color || '#888' }}
              >
                <div className="notif-task-header">
                  <span
                    className="notif-task-badge"
                    style={{
                      background: PLAN_STATUS_MAP[userPendingRequest.status]?.bg || '#f5f5f5',
                      color: PLAN_STATUS_MAP[userPendingRequest.status]?.color || '#888',
                    }}
                  >
                    {PLAN_STATUS_MAP[userPendingRequest.status]?.label || userPendingRequest.status}
                  </span>
                  <span className="notif-task-amount">${(userPendingRequest.amount || 0).toLocaleString()}/mo</span>
                </div>
                <div className="notif-task-service">{userPendingRequest.service}</div>
                <div className="notif-task-meta">
                  <span><strong>From:</strong> {userPendingRequest.planFrom || 'start'} → <strong>To:</strong> {userPendingRequest.planTo}</span>
                  <span className="notif-dot">·</span>
                  <span>Submitted: {userPendingRequest.date ? new Date(userPendingRequest.date).toLocaleDateString() : '—'}</span>
                </div>
                <p style={{ fontSize: 13, color: '#666', margin: '8px 0 0' }}>
                  {userPendingRequest.status === 'requested'
                    ? 'Your company admin needs to approve and pay for this upgrade.'
                    : userPendingRequest.status === 'company_approved'
                    ? 'Your company admin has approved this request and will complete the payment.'
                    : 'Payment has been submitted. Awaiting final approval from STREFEX.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  10. RECENT TRANSACTIONS (company-scoped for admin, user-scoped for user)
         * ═══════════════════════════════════════════════════════ */}
        {recentTransactions.length > 0 && (
          <div className="app-page-card">
            <h3 className="notif-section-title">
              {isCompanyAdmin ? 'Company Transactions' : 'Recent Transactions'}
            </h3>
            <div className="notif-list">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="notif-item info"
                  onClick={() => navigate('/payment')}
                >
                  <span className="notif-icon month">$</span>
                  <div className="notif-body">
                    <div className="notif-name">{tx.service}</div>
                    <div className="notif-message">
                      ${(tx.amount || 0).toLocaleString()} — {
                        tx.status === 'paid' ? 'Paid'
                        : tx.status === 'pending' ? 'Pending'
                        : tx.status === 'requested' ? 'Requested'
                        : tx.status === 'company_approved' ? 'Approved'
                        : tx.status === 'pending_platform_approval' || tx.status === 'pending_approval' ? 'Awaiting STREFEX'
                        : tx.status === 'rejected_by_company' ? 'Rejected by Admin'
                        : tx.status === 'rejected_by_platform' ? 'Rejected by STREFEX'
                        : tx.status
                      }
                    </div>
                    <div className="notif-meta">
                      <span>{tx.type === 'plan_upgrade' ? 'Plan Upgrade' : tx.type === 'plan_downgrade' ? 'Plan Downgrade' : 'Payment'}</span>
                      <span className="notif-dot">·</span>
                      <span>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</span>
                      {isCompanyAdmin && tx.userEmail !== user?.email && (
                        <>
                          <span className="notif-dot">·</span>
                          <span>by {tx.userEmail}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
         *  11. EMPTY STATE
         * ═══════════════════════════════════════════════════════ */}
        {!hasAnyContent && (
          <div className="app-page-card">
            <div className="notif-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h3>No Notifications</h3>
              <p>Plan exhibitions from the <strong>Exhibition Calendar</strong> to receive reminders.</p>
              <button type="button" className="notif-goto-cal" onClick={() => navigate('/profile/calendar')}>
                Open Exhibition Calendar
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
