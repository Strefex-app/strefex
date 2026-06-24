import { Link } from 'react-router-dom'
import { PAGE_ROOTS } from '../../config/pageBreadcrumbs'
import '../../styles/managementShell.css'

/**
 * Standard path trail: Root / Module / … / Current
 * Use explicit `to` links — never browser back.
 */
export default function PageBreadcrumb({
  root = PAGE_ROOTS.management,
  trail = [],
}) {
  const crumbs = [root, ...trail]

  return (
    <nav className="mgmt-breadcrumb" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={`${crumb.label}-${i}`} className="mgmt-breadcrumb__item">
            {i > 0 ? <span className="mgmt-breadcrumb__sep" aria-hidden>/</span> : null}
            {!isLast && crumb.to ? (
              <Link to={crumb.to} className="mgmt-breadcrumb__link">{crumb.label}</Link>
            ) : (
              <span className="mgmt-breadcrumb__current" aria-current={isLast ? 'page' : undefined}>
                {crumb.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
