import { matchPath } from 'react-router-dom'
import {
  isManagementCustomLayout,
  resolveLegacyManagementRedirect,
  resolveManagementBreadcrumb,
} from '../utils/managementRoutes'

/** Standard breadcrumb roots — user always jumps to a known hub, never browser back. */
export const PAGE_ROOTS = {
  management: { label: 'Management', to: '/management' },
  buyers: { label: 'Sourcing', to: '/hub/procurement' },
  manufacturers: { label: 'Quoting', to: '/hub/partner' },
  governance: { label: 'Admin', to: '/hub/governance' },
  home: { label: 'Home', to: '/main-menu' },
  hr: { label: 'HR Space', to: '/management/people/hr-space' },
  forge: { label: 'Forge', to: '/forge' },
}

function titleFromSlug(slug = '') {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Routes where the page renders its own breadcrumb (custom header layout).
 * Global bar is suppressed to avoid duplicates.
 */
const CUSTOM_LAYOUT_PATHS = [
  '/management/ops/projects',
  '/management/ops/projects/new-project',
  '/management/ops/projects/project/:projectId/control',
  /* Intelligent Sourcing fills the shell — no duplicate top chrome */
  '/hub/procurement',
  '/sourcing',
  '/dashboard/buyer',
  /* Home renders its own Sourcing-style address bar */
  '/main-menu',
]

function isCustomLayout(pathname) {
  if (isManagementCustomLayout(pathname)) return true
  return CUSTOM_LAYOUT_PATHS.some((pattern) =>
    matchPath({ path: pattern, end: pattern.indexOf(':') < 0 && pattern.indexOf('*') < 0 }, pathname),
  )
}

/** Non-management routes with explicit trails. */
const EXACT_ROUTES = {
  '/hub/procurement': { root: 'home', trail: [{ label: 'Sourcing' }] },
  '/hub/partner': { root: 'home', trail: [{ label: 'Quoting' }] },
  '/hub/governance': { root: 'home', trail: [{ label: 'Admin' }] },
  '/main-menu': { root: 'home', trail: [] },
  '/profile': { root: 'home', trail: [{ label: 'Profile' }] },
  '/settings': { root: 'home', trail: [{ label: 'Settings' }] },
  '/plans': { root: 'home', trail: [{ label: 'Plans' }] },
  '/templates': { root: 'home', trail: [{ label: 'Profile', to: '/profile' }, { label: 'Templates' }] },
  '/support': { root: 'home', trail: [{ label: 'Support' }] },
  '/messenger': { root: 'home', trail: [{ label: 'Messenger' }] },
  '/notifications': { root: 'home', trail: [{ label: 'Notifications' }] },
  '/calendar': { root: 'home', trail: [{ label: 'Calendar' }] },
  '/service-requests': { root: 'home', trail: [{ label: 'Service Requests' }] },
  '/equipment-hub': { root: 'home', trail: [{ label: 'Equipment Hub' }] },
  '/product-hub': { root: 'home', trail: [{ label: 'Product Hub' }] },
  '/service-hub': { root: 'home', trail: [{ label: 'Service Hub' }] },
  '/raw-materials': { root: 'home', trail: [{ label: 'Raw Materials' }] },
  '/machinery-industry': { root: 'home', trail: [{ label: 'Machinery Industry' }] },
  '/add-supplier': { root: 'home', trail: [{ label: 'Add Supplier' }] },
  '/services': { root: 'home', trail: [{ label: 'Services' }] },
  '/equipment-request': { root: 'home', trail: [{ label: 'Equipment Request' }] },
  '/audit-request': { root: 'home', trail: [{ label: 'Audit Request' }] },
  '/request-service': { root: 'home', trail: [{ label: 'Request Service' }] },
  '/admin/approvals': { root: 'governance', trail: [{ label: 'Approvals' }] },
  '/developer': { root: 'governance', trail: [{ label: 'Developer' }] },
  '/admin-dashboard': { root: 'governance', trail: [{ label: 'Platform Dashboard' }] },
}

function resolvePrefix(pathname) {
  if (pathname.startsWith('/industry/')) {
    return {
      root: PAGE_ROOTS.home,
      trail: [
        { label: 'Industry', to: pathname.split('/').slice(0, 3).join('/') || '/main-menu' },
        { label: titleFromSlug(pathname.split('/').slice(3).join('-')) || 'Page' },
      ],
    }
  }

  if (pathname.startsWith('/product-hub/')) {
    return {
      root: PAGE_ROOTS.home,
      trail: [
        { label: 'Product Hub', to: '/product-hub' },
        { label: titleFromSlug(pathname.split('/').slice(2).join('-')) || 'Browse' },
      ],
    }
  }

  if (pathname.startsWith('/dashboard/buyer')) {
    return {
      root: PAGE_ROOTS.buyers,
      trail: [{ label: titleFromSlug(pathname.split('/').slice(3).join('-')) || 'Workspace' }],
    }
  }

  if (pathname.startsWith('/admin-dashboard/account/')) {
    return {
      root: PAGE_ROOTS.governance,
      trail: [{ label: 'Platform Dashboard', to: '/admin-dashboard' }, { label: 'Account' }],
    }
  }

  if (pathname.startsWith('/management/sourcing/vendors/') && pathname !== '/management/sourcing/vendors') {
    return {
      root: PAGE_ROOTS.management,
      trail: [
        { label: 'Overview', to: '/management' },
        { label: 'Sourcing', to: '/management/sourcing' },
        { label: 'Vendor Master', to: '/management/sourcing/vendors' },
        { label: 'Vendor detail' },
      ],
    }
  }

  return null
}

const AUTH_ONLY = new Set(['/login', '/register', '/verify-email', '/'])

/**
 * Resolve breadcrumb for current pathname.
 * @returns {{ root: object, trail: array, layout: 'global'|'custom'|'none' } | null}
 */
export function resolvePageBreadcrumb(pathname) {
  if (AUTH_ONLY.has(pathname)) return null

  const canonicalPath = resolveLegacyManagementRedirect(pathname) || pathname

  if (isCustomLayout(canonicalPath)) {
    return { layout: 'custom' }
  }

  const managementTrail = resolveManagementBreadcrumb(canonicalPath)
  if (managementTrail) {
    return { ...managementTrail, layout: 'global' }
  }

  const exact = EXACT_ROUTES[pathname]
  if (exact) {
    return {
      root: PAGE_ROOTS[exact.root] || PAGE_ROOTS.management,
      trail: exact.trail,
      layout: 'global',
    }
  }

  const prefix = resolvePrefix(pathname)
  if (prefix) {
    return { ...prefix, layout: 'global' }
  }

  return null
}
