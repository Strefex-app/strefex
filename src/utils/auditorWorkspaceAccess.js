import { AUDITORS_DIRECTORY_ALIAS, isAuditorsHubPath } from './auditorsDirectory'

export function isAuditorWorkspaceRole(role) {
  const r = String(role || '').toLowerCase()
  return r === 'auditor_external' || r === 'auditor_internal'
}

export function auditorLandingPath() {
  return `${AUDITORS_DIRECTORY_ALIAS}/calendar`
}

/** Auditors must not be sent to /management when the hub gate denies access (that path is blocked). */
export function auditProgramDeniedPath(role) {
  if (isAuditorWorkspaceRole(role)) return '/profile'
  return '/management'
}

/** Surfaces that expose the seller network, RFQs, or plant catalogues. */
export function isSourcingSurfacePath(pathname = '') {
  const p = String(pathname || '').split('?')[0]
  if (!p) return false
  if (p === '/main-menu' || p === '/sourcing' || p.startsWith('/sourcing/')) return true
  if (p === '/product-hub' || p.startsWith('/product-hub/')) return true
  if (p === '/equipment-hub' || p.startsWith('/equipment-hub/')) return true
  if (p.startsWith('/industry/')) return true
  if (p.startsWith('/intelligent-sourcing')) return true
  if (p === '/invite-sellers' || p.startsWith('/invite-sellers')) return true
  if (p === '/add-supplier' || p.startsWith('/add-supplier')) return true
  if (p.startsWith('/equipment-request')) return true
  if (p.startsWith('/management/sourcing')) return true
  if (p.startsWith('/dashboard/buyer') || p.startsWith('/dashboard/supplier')) return true
  if (p.startsWith('/rfq-comparison') || p.startsWith('/rfq/')) return true
  if (p.startsWith('/suppliers/')) return true
  if (p.startsWith('/supplier-dashboard') || p.startsWith('/seller-dashboard')) return true
  if (p.startsWith('/service-hub') || p.startsWith('/service-list')) return true
  if (p.startsWith('/buyer-workspace') || p.startsWith('/workspace/buyer')) return true
  return false
}

export function isBlockedManagementPathForExternalAuditor(pathname = '') {
  const p = String(pathname || '').split('?')[0]
  if (isAuditorsHubPath(p)) return false
  if (p === '/management' || p.startsWith('/management/')) return true
  if (p.startsWith('/hub/')) return true
  if (p.startsWith('/admin/')) return true
  if (p.startsWith('/project-management') || p.startsWith('/production')) return true
  if (p.startsWith('/cost-management') || p.startsWith('/enterprise')) return true
  return false
}

export function auditorSafeRedirect(role, pathname) {
  if (!isAuditorWorkspaceRole(role)) return null
  if (isSourcingSurfacePath(pathname)) return auditorLandingPath()
  if (String(role).toLowerCase() === 'auditor_external' && isBlockedManagementPathForExternalAuditor(pathname)) {
    return auditorLandingPath()
  }
  return null
}
