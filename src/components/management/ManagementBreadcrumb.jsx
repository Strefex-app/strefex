import PageBreadcrumb from './PageBreadcrumb'
import { PAGE_ROOTS } from '../../config/pageBreadcrumbs'

/** @deprecated Use PageBreadcrumb — kept for existing imports. */
export default function ManagementBreadcrumb({ trail = [], root = PAGE_ROOTS.management }) {
  return <PageBreadcrumb root={root} trail={trail} />
}
