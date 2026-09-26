import { NavLink, useLocation } from 'react-router-dom'
import {
  AUDITORS_SOP_NAV,
  isAuditorsSopNavActive,
} from '../../utils/auditorsDirectory'
import { useAuthStore } from '../../store/authStore'
import { useAuditorsHubNav } from './auditorsHubNavContext'

export default function AuditorsHubNav() {
  const ctx = useAuditorsHubNav()
  const location = useLocation()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  if (!ctx) return null
  const { openRems = 0, overdue = 0 } = ctx
  const items = AUDITORS_SOP_NAV.filter((n) => !n.superadminOnly || isSuperAdmin)

  return (
    <nav className="audit-pro-app-nav audit-pro-app-nav--chrome" aria-label="Supplier audit operations">
      {overdue > 0 ? (
        <span className="app-page-chip">{overdue} overdue</span>
      ) : null}
      {items.map((n) => {
        const active = isAuditorsSopNavActive(n, location.pathname, location.search)
        const badge = n.badgeReminders ? openRems : 0
        return (
          <NavLink
            key={`${n.leaf}:${n.view || 'default'}`}
            to={n.to}
            className={`app-page-btn-outline ap-nav-pill stx-click-feedback${active ? ' ap-nav-pill-active' : ''}`}
          >
            {n.label}
            {badge > 0 ? <span className="ap-badge-nav ap-badge-nav--pill">{badge}</span> : null}
          </NavLink>
        )
      })}
    </nav>
  )
}
