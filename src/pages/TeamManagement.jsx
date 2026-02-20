import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { useAccountRegistry } from '../store/accountRegistry'
import { getAccountTypeLabel } from '../services/stripeService'
import { usersApi } from '../services/api'
import { analytics } from '../services/analytics'
import { tenantKey } from '../utils/tenantStorage'
import AppLayout from '../components/AppLayout'
import EmptyState from '../components/EmptyState'
import './TeamManagement.css'

/**
 * Roles assignable by company admins.
 * superadmin and auditor_external are STREFEX-platform-level roles
 * and can only be assigned by STREFEX superadmin from the Super Admin Dashboard.
 */
const ROLES = [
  { value: 'admin', label: 'Admin', desc: 'Full access — manage team, billing, all features' },
  { value: 'manager', label: 'Manager', desc: 'Manage projects, view reports, program management' },
  { value: 'auditor_internal', label: 'Auditor (Internal)', desc: 'Read-only access to all company data for internal auditing' },
  { value: 'user', label: 'User', desc: 'Standard access — projects and assigned modules' },
]

export default function TeamManagement() {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const hasRole = useAuthStore((s) => s.hasRole)
  const accountType = useSubscriptionStore((s) => s.accountType)

  /* ── Get current business account from registry ─────── */
  const currentEmail = currentUser?.email || (() => {
    try { const s = JSON.parse(localStorage.getItem(tenantKey('strefex-subscription'))); return null } catch { return null }
  })()
  const registryAccounts = useAccountRegistry((s) => s.accounts)
  const inviteTeamMember = useAccountRegistry((s) => s.inviteTeamMember)
  const removeTeamMember = useAccountRegistry((s) => s.removeTeamMember)
  const updateTeamMember = useAccountRegistry((s) => s.updateTeamMember)

  // Find matching business account in registry
  const businessAccount = useMemo(() => {
    // Try to find by current user email
    if (currentEmail) {
      const domain = currentEmail.split('@')[1]?.toLowerCase()
      if (domain) {
        return registryAccounts.find((a) =>
          a.accountType === accountType &&
          a.email?.split('@')[1]?.toLowerCase() === domain &&
          a.status !== 'canceled'
        )
      }
    }
    // Fallback: try first active account of current type
    return registryAccounts.find((a) => a.accountType === accountType && a.status !== 'canceled')
  }, [registryAccounts, currentEmail, accountType])

  // Team members from registry + demo admin entry
  const registryMembers = businessAccount?.teamMembers || []
  const adminMember = businessAccount ? {
    id: 'admin-owner',
    email: businessAccount.email,
    full_name: businessAccount.contactName || 'Account Admin',
    role: 'admin',
    is_active: true,
    created_at: businessAccount.registeredAt?.slice(0, 10) || '2025-06-01',
    isOwner: true,
  } : { id: 'admin-owner', email: 'admin@strefex.com', full_name: 'John Doe', role: 'admin', is_active: true, created_at: '2025-06-01', isOwner: true }

  const [members, setMembers] = useState(() => [
    adminMember,
    ...registryMembers.map((m) => ({
      id: m.id,
      email: m.email,
      full_name: m.name,
      role: m.role,
      is_active: m.status === 'active',
      created_at: m.invitedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    })),
  ])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isAdmin = hasRole('admin')

  // Get domain for current account
  const currentDomain = businessAccount?.email?.split('@')[1]?.toLowerCase()

  /* ── Linked accounts (same domain, different directions) ── */
  const linkedAccounts = useMemo(() => {
    if (!currentDomain) return []
    return registryAccounts.filter((a) =>
      a.email?.split('@')[1]?.toLowerCase() === currentDomain &&
      a.accountType !== accountType &&
      a.status !== 'canceled'
    )
  }, [registryAccounts, currentDomain, accountType])

  const handleInvite = async () => {
    setError('')
    setSuccess('')
    if (inviteRole === 'superadmin' || inviteRole === 'auditor_external') {
      setError('This role can only be assigned by STREFEX platform administration.')
      return
    }
    if (!inviteEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setError('Please enter a valid email address')
      return
    }
    if (members.some((m) => m.email === inviteEmail)) {
      setError('This email is already a team member')
      return
    }
    // Warn if email domain doesn't match business
    if (currentDomain) {
      const inviteDomain = inviteEmail.split('@')[1]?.toLowerCase()
      if (inviteDomain !== currentDomain) {
        // Allow but warn
        if (!window.confirm(`This email (${inviteDomain}) differs from your business domain (${currentDomain}). Continue?`)) return
      }
    }

    setLoading(true)
    try {
      // Try backend
      const newUser = await usersApi.create({
        email: inviteEmail,
        full_name: inviteName || inviteEmail.split('@')[0],
        role: inviteRole,
      })
      setMembers((prev) => [...prev, { ...newUser, created_at: new Date().toISOString().slice(0, 10) }])
      setSuccess(`Invited ${inviteEmail} as ${inviteRole}`)
    } catch (err) {
      // Fallback demo — also persist to registry
      if (err.status === 0 || err.message?.includes('Network')) {
        const newMember = {
          id: String(Date.now()),
          email: inviteEmail,
          full_name: inviteName || inviteEmail.split('@')[0],
          role: inviteRole,
          is_active: true,
          created_at: new Date().toISOString().slice(0, 10),
        }
        setMembers((prev) => [...prev, newMember])
        // Persist to account registry
        if (businessAccount) {
          inviteTeamMember(businessAccount.id, {
            name: inviteName || inviteEmail.split('@')[0],
            email: inviteEmail,
            role: inviteRole,
          })
        }
        setSuccess(`Invited ${inviteEmail} as ${inviteRole} — no separate registration needed`)
      } else {
        setError(err.detail || err.message || 'Failed to invite user')
      }
    } finally {
      setLoading(false)
      setInviteEmail('')
      setInviteName('')
      setInviteRole('user')
      setShowInvite(false)
    }
    analytics.track('team_invite', { role: inviteRole })
  }

  const handleRoleChange = async (memberId, newRole) => {
    // Company admins cannot assign platform-level roles
    if (newRole === 'superadmin' || newRole === 'auditor_external') return
    try {
      await usersApi.update(memberId, { role: newRole })
    } catch { /* demo fallback */ }
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)))
    // Sync to registry
    const member = members.find((m) => m.id === memberId)
    if (businessAccount && member) {
      updateTeamMember(businessAccount.id, member.email, { role: newRole })
    }
    analytics.track('team_role_change', { role: newRole })
  }

  const handleRemove = async (memberId) => {
    if (!window.confirm('Remove this team member? They will no longer have access to the platform.')) return
    const member = members.find((m) => m.id === memberId)
    try {
      await usersApi.delete(memberId)
    } catch { /* demo fallback */ }
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
    // Remove from registry
    if (businessAccount && member) {
      removeTeamMember(businessAccount.id, member.email)
    }
    analytics.track('team_remove')
  }

  const handleToggleActive = async (memberId) => {
    const member = members.find((m) => m.id === memberId)
    if (!member) return
    const newStatus = !member.is_active
    try {
      await usersApi.update(memberId, { is_active: newStatus })
    } catch { /* demo fallback */ }
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, is_active: newStatus } : m)))
    // Sync to registry
    if (businessAccount && member) {
      updateTeamMember(businessAccount.id, member.email, { status: newStatus ? 'active' : 'disabled' })
    }
  }

  return (
    <AppLayout>
      <div className="tm-page">
        <header className="tm-header">
          <div>
            <h1 className="tm-title">Team Management</h1>
            <p className="tm-subtitle">
              {businessAccount?.company || tenant?.name || 'STREFEX Industries'} — {getAccountTypeLabel(accountType)} Account — {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isAdmin && (
            <button className="tm-btn tm-btn-primary" onClick={() => setShowInvite(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Invite Member
            </button>
          )}
        </header>

        {error && <div className="tm-alert tm-alert-error">{error}</div>}
        {success && <div className="tm-alert tm-alert-success">{success}</div>}

        {/* Business domain info banner */}
        {currentDomain && (
          <div className="tm-domain-info">
            <div className="tm-domain-main">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              <span>
                Business domain: <strong>@{currentDomain}</strong> — Team members are invited and do not need to register separately.
              </span>
            </div>
            {linkedAccounts.length > 0 && (
              <div className="tm-linked-accounts">
                <span className="tm-linked-label">Linked accounts on this domain:</span>
                {linkedAccounts.map((a) => (
                  <span key={a.id} className={`tm-linked-badge tm-linked-${a.accountType}`}>
                    {getAccountTypeLabel(a.accountType)} — {a.company}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members table */}
        <div className="tm-card">
          {members.length === 0 ? (
            <EmptyState icon="users" title="No team members" message="Invite your first team member to get started." />
          ) : (
            <table className="tm-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className={!m.is_active ? 'tm-row-disabled' : ''}>
                    <td>
                      <div className="tm-member-name">
                        {m.full_name}
                        {m.isOwner && <span className="tm-owner-badge">Owner</span>}
                      </div>
                      <div className="tm-member-email">{m.email}</div>
                    </td>
                    <td>
                      {isAdmin && m.id !== currentUser?.id && !m.isOwner ? (
                        <select
                          className="tm-role-select"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`tm-role-badge tm-role-${m.role}`}>{m.role}</span>
                      )}
                    </td>
                    <td>
                      <span className={`tm-status ${m.is_active ? 'active' : 'inactive'}`}>
                        {m.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="tm-date">{m.created_at}</td>
                    {isAdmin && (
                      <td className="tm-actions">
                        {m.id !== currentUser?.id && (
                          <>
                            <button className="tm-btn-icon" title={m.is_active ? 'Disable' : 'Enable'} onClick={() => handleToggleActive(m.id)}>
                              {m.is_active ? '⏸' : '▶'}
                            </button>
                            <button className="tm-btn-icon tm-btn-danger" title="Remove" onClick={() => handleRemove(m.id)}>
                              ✕
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Role descriptions */}
        <div className="tm-card tm-roles-info">
          <h3 className="tm-roles-title">Role Permissions</h3>
          <div className="tm-roles-grid">
            {ROLES.map((r) => (
              <div key={r.value} className="tm-role-item">
                <span className={`tm-role-badge tm-role-${r.value}`}>{r.label}</span>
                <span className="tm-role-desc">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="tm-modal-backdrop" onClick={() => setShowInvite(false)}>
          <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tm-modal-header">
              <h3>Invite Team Member</h3>
              <button className="tm-modal-close" onClick={() => setShowInvite(false)}>×</button>
            </div>
            <div className="tm-modal-body">
              <div className="tm-invite-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                Invited members join your business account — no separate registration needed. They share your plan and permissions.
              </div>
              <label className="tm-form-label">
                Email Address *
                <input className="tm-form-input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={currentDomain ? `colleague@${currentDomain}` : 'colleague@company.com'} autoFocus />
              </label>
              <label className="tm-form-label">
                Full Name
                <input className="tm-form-input" type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Jane Smith" />
              </label>
              <label className="tm-form-label">
                Role
                <select className="tm-form-input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                  ))}
                </select>
              </label>
              <div className="tm-form-actions">
                <button className="tm-btn tm-btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                <button className="tm-btn tm-btn-primary" onClick={handleInvite} disabled={loading}>
                  {loading ? 'Sending...' : 'Send Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
