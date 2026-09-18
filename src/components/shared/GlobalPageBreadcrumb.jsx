import { useLocation } from 'react-router-dom'
import PageBreadcrumb from '../management/PageBreadcrumb'
import { resolvePageBreadcrumb } from '../../config/pageBreadcrumbs'
import AuditorsHubNav from '../../pages/auditPro/AuditorsHubNav'
import { isAuditorsHubPath } from '../../utils/auditorsDirectory'

/**
 * Platform-wide address bar — Management / Module / Page (or Home / …).
 * Rendered once in AppLayout; pages with custom headers opt out via route config.
 */
export default function GlobalPageBreadcrumb() {
  const { pathname } = useLocation()
  const resolved = resolvePageBreadcrumb(pathname)

  if (!resolved || resolved.layout !== 'global') return null

  return (
    <div className="app-page-breadcrumb-bar">
      <PageBreadcrumb root={resolved.root} trail={resolved.trail} />
      {isAuditorsHubPath(pathname) ? <AuditorsHubNav /> : null}
    </div>
  )
}
