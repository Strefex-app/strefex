import { NavLink, useLocation } from 'react-router-dom'
import { AUDITORS_DIRECTORY_PATH, auditorsHubLeaf } from '../../utils/auditorsDirectory'
import { useAuditorsHubNav } from './auditorsHubNavContext'

const NAV = [
  { to: AUDITORS_DIRECTORY_PATH, label: 'Pool', end: true },
  { to: `${AUDITORS_DIRECTORY_PATH}/calendar`, label: 'Calendar', badgeReminders: true },
  { to: `${AUDITORS_DIRECTORY_PATH}/suppliers`, label: 'Suppliers' },
  { to: `${AUDITORS_DIRECTORY_PATH}/auditors`, label: 'Auditors' },
  { to: `${AUDITORS_DIRECTORY_PATH}/standards`, label: 'Standards' },
]

export default function AuditorsHubNav() {
  const ctx = useAuditorsHubNav()
  const location = useLocation()
  if (!ctx) return null
  const leaf = auditorsHubLeaf(location.pathname)
  const { openRems = 0, overdue = 0 } = ctx

  return (
    <nav className="audit-pro-app-nav audit-pro-app-nav--chrome" aria-label="Audit management sections">
      {overdue > 0 ? (
        <span className="app-page-chip">{overdue} overdue</span>
      ) : null}
      {NAV.map((n) => {
        const badge = n.badgeReminders ? openRems : 0
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end === true}
            className={({ isActive }) => {
              const onGroup = (n.label === 'Calendar' && ['calendar', 'findings'].includes(leaf))
                || (n.label === 'Suppliers' && (leaf === 'suppliers' || leaf === 'record'))
              return `app-page-btn-outline ap-nav-pill stx-click-feedback${isActive || onGroup ? ' ap-nav-pill-active' : ''}`
            }}
          >
            {n.label}
            {n.badgeReminders && badge > 0 ? <span className="ap-badge-nav ap-badge-nav--pill">{badge}</span> : null}
          </NavLink>
        )
      })}
    </nav>
  )
}
