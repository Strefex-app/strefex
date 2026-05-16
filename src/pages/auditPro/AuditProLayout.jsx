import { useEffect } from 'react'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAuthStore } from '../../store/authStore'
import { useAccountRegistry } from '../../store/accountRegistry'
import useAuditProStore from '../../store/auditProStore'
import '../../styles/app-page.css'
import '../../styles/auditPro.css'

const NAV = [
  { to: 'dashboard', icon: '⬡', label: 'Dashboard' },
  { to: 'new-audit', icon: '＋', label: 'New Audit' },
  { to: 'plans', icon: '≡', label: 'Audit Plans' },
  { to: 'calendar', icon: '◫', label: 'Calendar', badgeReminders: true },
  { to: 'auditors', icon: '◈', label: 'Auditors' },
  { to: 'suppliers', icon: '◉', label: 'Suppliers' },
  { to: 'risk-matrix', icon: '◧', label: 'Risk Matrix' },
  { to: 'logs', icon: '⧉', label: 'Audit Logs' },
  { to: 'reports', icon: '⬗', label: 'Reports' },
]

const TITLES = {
  dashboard: 'Dashboard',
  'new-audit': 'Create New Audit Plan',
  conduct: 'Conduct Audit',
  plans: 'Audit Plans',
  calendar: 'Calendar & Reminders',
  auditors: 'Auditor Registry',
  suppliers: 'Supplier Registry',
  'risk-matrix': 'Risk Matrix',
  logs: 'Audit Activity Logs',
  reports: 'Analytics & Reports',
  print: 'Print Report',
}

function segmentTitle(segment) {
  if (segment.startsWith('conduct')) return TITLES.conduct
  if (segment.startsWith('print')) return TITLES.print
  return TITLES[segment] || 'Audit Pro'
}

export default function AuditProLayout() {
  const location = useLocation()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  const canUse = isSuperAdmin() || isAuditor()

  const rehydrateRegistryFromStorage = useAccountRegistry((s) => s.rehydrateRegistryFromStorage)
  const ensureSeed = useAuditProStore((s) => s.ensureSeed)
  const hydrateFromSupabase = useAuditProStore((s) => s.hydrateFromSupabase)
  const reminders = useAuditProStore((s) => s.reminders)
  const toast = useAuditProStore((s) => s.toast)

  useEffect(() => {
    rehydrateRegistryFromStorage()
    ensureSeed()
    void hydrateFromSupabase()
  }, [rehydrateRegistryFromStorage, ensureSeed, hydrateFromSupabase])

  if (!canUse) {
    return <Navigate to="/management" replace />
  }

  const leaf = location.pathname.replace(/^.+\/auditors\/?/, '').split('/')[0] || 'dashboard'
  const title = segmentTitle(leaf)
  const openRems = (reminders || []).filter((r) => r.status === 'Open').length
  const overdue = (reminders || []).filter(
    (r) => r.status === 'Open' && new Date(r.dueDate) < new Date(new Date().toISOString().slice(0, 10)),
  ).length

  return (
    <AppLayout>
      <div className="app-page audit-pro-app-wrap">
        <div className="audit-pro-app-shell">
          <div className="audit-pro-app-head-row">
            <div style={{ minWidth: 0 }}>
              <NavLink to="/management/auditors/dashboard" className="audit-pro-app-back stx-click-feedback">
                ← Audit dashboard
              </NavLink>
              <h1 className="audit-pro-app-title stx-text-wrap">{title}</h1>
              <p className="audit-pro-app-meta">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              {overdue > 0 && (
                <div className="ap-overdue-chip">
                  ⚠ {overdue} overdue
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div className="ap-pulse-dot" />
                <span style={{ fontSize: 11, color: 'var(--badge-success-text)' }}>Live</span>
              </div>
            </div>
          </div>

          <nav className="audit-pro-app-nav" aria-label="Audit management sections">
            {NAV.map((n) => {
              const isCal = n.to === 'calendar'
              const badge = isCal ? openRems : 0
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.to === 'dashboard'}
                  className={({ isActive }) =>
                    `ap-nav-pill stx-click-feedback${isActive ? ' ap-nav-pill-active' : ''}`
                  }
                >
                  <span aria-hidden style={{ fontSize: 13 }}>
                    {n.icon}
                  </span>
                  {n.label}
                  {n.badgeReminders && badge > 0 ? <span className="ap-badge-nav ap-badge-nav--pill">{badge}</span> : null}
                </NavLink>
              )
            })}
          </nav>

          <div className="ap-root ap-root--platform ap-scrollbar stx-text-wrap">
            <Outlet />
          </div>
        </div>

        {toast && (
          <div className={`ap-toast-fixed${toast.type === 'success' ? ' ap-toast-success' : ' ap-toast-error'}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
