import PageBreadcrumb from './PageBreadcrumb'
import { PAGE_ROOTS } from '../../config/pageBreadcrumbs'

/**
 * Inline page breadcrumb. Use chrome when this is the page address bar
 * (full-bleed hairline aligned with the sidebar brand). Keep chrome off
 * when nested inside another header/widget.
 */
export default function ManagementBreadcrumb({
  trail = [],
  root = PAGE_ROOTS.management,
  chrome = false,
}) {
  const crumb = <PageBreadcrumb root={root} trail={trail} />
  if (!chrome) return crumb
  return <div className="app-page-breadcrumb-bar">{crumb}</div>
}
