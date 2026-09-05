import { matchPath } from 'react-router-dom'
import {
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
 * Routes that render their own top chrome (aligned hairline).
 * Global address bar is suppressed only here to avoid duplicates.
 */
const OWN_CHROME_PATHS = [
  '/main-menu',
  '/hub/procurement',
  '/sourcing',
  '/dashboard/buyer',
]

function isOwnChromeLayout(pathname) {
  return OWN_CHROME_PATHS.some((pattern) =>
    matchPath({ path: pattern, end: true }, pathname),
  )
}

/** Non-management routes with explicit trails. */
const EXACT_ROUTES = {
  '/hub/procurement': { root: 'home', trail: [{ label: 'Sourcing' }] },
  '/hub/partner': { root: 'home', trail: [{ label: 'Quoting' }] },
  '/hub/governance': { root: 'home', trail: [{ label: 'Admin' }] },
  '/main-menu': { root: 'home', trail: [] },
  '/profile': { root: 'home', trail: [{ label: 'Profile' }] },
  '/profile/calendar': { root: 'home', trail: [{ label: 'Profile', to: '/profile' }, { label: 'Calendar' }] },
  '/settings': { root: 'home', trail: [{ label: 'Settings' }] },
  '/plans': { root: 'home', trail: [{ label: 'Plans' }] },
  '/payment': { root: 'home', trail: [{ label: 'Plans', to: '/plans' }, { label: 'Payment' }] },
  '/templates': { root: 'home', trail: [{ label: 'Profile', to: '/profile' }, { label: 'Templates' }] },
  '/support': { root: 'home', trail: [{ label: 'Support' }] },
  '/messenger': { root: 'home', trail: [{ label: 'Messenger' }] },
  '/notifications': { root: 'home', trail: [{ label: 'Notifications' }] },
  '/calendar': { root: 'home', trail: [{ label: 'Calendar' }] },
  '/resources': { root: 'home', trail: [{ label: 'Resources' }] },
  '/tasks': { root: 'home', trail: [{ label: 'Tasks' }] },
  '/project': { root: 'home', trail: [{ label: 'Project' }] },
  '/dashboard': { root: 'home', trail: [{ label: 'Dashboard' }] },
  '/dashboard/supplier': { root: 'home', trail: [{ label: 'Supplier workspace' }] },
  '/service-provider-dashboard': { root: 'home', trail: [{ label: 'Service provider' }] },
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
  '/executive-summary': { root: 'home', trail: [{ label: 'Executive Summary' }] },
  '/forge': { root: 'forge', trail: [] },
  '/admin/approvals': { root: 'governance', trail: [{ label: 'Approvals' }] },
  '/developer': { root: 'governance', trail: [{ label: 'Developer' }] },
  '/admin-dashboard': { root: 'governance', trail: [{ label: 'Platform Dashboard' }] },
  '/admin/supplier-governance': { root: 'governance', trail: [{ label: 'Supplier governance' }] },
  '/admin/data-ingestion': { root: 'governance', trail: [{ label: 'Data ingestion' }] },
}

function resolvePrefix(pathname) {
  if (pathname.startsWith('/industry/')) {
    const parts = pathname.split('/').filter(Boolean)
    const trail = [{ label: 'Industry', to: `/${parts.slice(0, 2).join('/')}` }]
    if (parts.length > 2) {
      trail.push({ label: titleFromSlug(parts.slice(2).join('-')) || 'Page' })
    }
    return { root: PAGE_ROOTS.home, trail }
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

  if (pathname.startsWith('/raw-materials/')) {
    return {
      root: PAGE_ROOTS.home,
      trail: [
        { label: 'Raw Materials', to: '/raw-materials' },
        { label: titleFromSlug(pathname.split('/').slice(2).join('-')) || 'Category' },
      ],
    }
  }

  if (pathname.startsWith('/service-hub/')) {
    return {
      root: PAGE_ROOTS.home,
      trail: [
        { label: 'Service Hub', to: '/service-hub' },
        { label: titleFromSlug(pathname.split('/').slice(2).join('-')) || 'Page' },
      ],
    }
  }

  if (pathname.startsWith('/dashboard/buyer')) {
    const rest = pathname.split('/').slice(3).filter(Boolean)
    return {
      root: PAGE_ROOTS.buyers,
      trail: rest.length
        ? [{ label: titleFromSlug(rest.join('-')) || 'Workspace' }]
        : [{ label: 'Workspace' }],
    }
  }

  if (pathname.startsWith('/admin-dashboard/account/') || pathname.startsWith('/admin-dashboard/local-account/')) {
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

  if (pathname.startsWith('/forge/')) {
    return {
      root: PAGE_ROOTS.forge,
      trail: [{ label: titleFromSlug(pathname.split('/').slice(1).join('-')) || 'Module' }],
    }
  }

  if (pathname.startsWith('/rfq-comparison/')) {
    return {
      root: PAGE_ROOTS.buyers,
      trail: [{ label: 'RFQ comparison' }],
    }
  }

  if (pathname.startsWith('/suppliers/')) {
    return {
      root: PAGE_ROOTS.home,
      trail: [{ label: 'Supplier profile' }],
    }
  }

  if (pathname.startsWith('/profile/')) {
    return {
      root: PAGE_ROOTS.home,
      trail: [
        { label: 'Profile', to: '/profile' },
        { label: titleFromSlug(pathname.split('/').slice(2).join('-')) || 'Page' },
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

  if (isOwnChromeLayout(canonicalPath)) {
    return { layout: 'custom' }
  }

  const managementTrail = resolveManagementBreadcrumb(canonicalPath)
  if (managementTrail) {
    return { ...managementTrail, layout: 'global' }
  }

  const exact = EXACT_ROUTES[pathname] || EXACT_ROUTES[canonicalPath]
  if (exact) {
    return {
      root: PAGE_ROOTS[exact.root] || PAGE_ROOTS.management,
      trail: exact.trail,
      layout: 'global',
    }
  }

  const prefix = resolvePrefix(pathname) || resolvePrefix(canonicalPath)
  if (prefix) {
    return { ...prefix, layout: 'global' }
  }

  /* Fallback — every AppLayout page gets an address bar */
  const segments = canonicalPath.split('/').filter(Boolean)
  const leaf = segments[segments.length - 1] || 'Page'
  return {
    root: PAGE_ROOTS.home,
    trail: [{ label: titleFromSlug(leaf) || 'Page' }],
    layout: 'global',
  }
}
