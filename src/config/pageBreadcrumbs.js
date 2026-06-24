import { matchPath } from 'react-router-dom'

/** Standard breadcrumb roots — user always jumps to a known hub, never browser back. */
export const PAGE_ROOTS = {
  management: { label: 'Management', to: '/management' },
  buyers: { label: 'Buyers', to: '/hub/procurement' },
  partners: { label: 'Partners', to: '/hub/partner' },
  governance: { label: 'Admin', to: '/hub/governance' },
  home: { label: 'Home', to: '/main-menu' },
  hr: { label: 'HR Space', to: '/hr-space' },
  forge: { label: 'Forge', to: '/forge' },
}

function titleFromSlug(slug = '') {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

const COST_CHILD = {
  calculator: 'Product Cost Calculator',
  bom: 'Bill of Materials',
  breakdown: 'Cost Breakdown',
  comparison: 'Cost Comparison',
  scenarios: 'What-If Scenarios',
  targets: 'Target Costing',
}

const ENTERPRISE_CHILD = {
  'fixed-costs': 'Fixed Costs',
  'variable-costs': 'Variable Costs',
  'semi-variable-costs': 'Semi-Variable Costs',
  'direct-costs': 'Direct Costs',
  'indirect-costs': 'Indirect Costs',
  opex: 'Operating Expenses',
  capex: 'Capital Expenditures',
  personnel: 'Personnel Costs',
  financial: 'Financial Costs',
  exceptional: 'Exceptional Costs',
  risk: 'Risk Costs',
  'product-calculation': 'Product Cost Calculation',
}

const PRODUCTION_CHILD = {
  '5s': '5S Workplace Organization',
  iso9001: 'ISO 9001',
  iatf16949: 'IATF 16949',
  vda63: 'VDA 6.3',
  oee: 'OEE Dashboard',
  downtime: 'Downtime Tracking',
  scrap: 'Scrap & Waste',
  output: 'Production Output',
  'quality-kpis': 'Quality KPIs',
  'process-audit': 'Product/Process Audit',
  'audit-history': 'Audit History',
  'floor-layout': 'Floor Layout',
  certifications: 'Certifications',
  'audit-questionnaire': 'Audit Questionnaire',
  'workcenter-output': 'Work Center Output',
  'system-management': 'System Management',
}

const HR_CHILD = {
  'qualification-matrix': 'Qualification Matrix',
  goals: 'Employee Goals',
  dialogue: 'Employee Dialogue',
  'hr-docs': 'HR Documentation',
  training: 'Training',
  workforce: 'Workforce',
  onboarding: 'Onboarding',
  attendance: 'Attendance',
  hiring: 'Hiring & Recruitment',
}

/**
 * Routes where the page renders its own breadcrumb (custom header layout).
 * Global bar is suppressed to avoid duplicates.
 */
const CUSTOM_LAYOUT_PATHS = [
  '/project-management',
  '/project-management/new-project',
  '/project-management/project/:projectId/control',
  '/management/rfq',
  '/management/rfq/new',
  '/management/rfq/intelligence',
  '/procurement/new-opportunity',
  '/procurement',
  '/management/auditors/overview',
]

function isCustomLayout(pathname) {
  return CUSTOM_LAYOUT_PATHS.some((pattern) => matchPath({ path: pattern, end: pattern.indexOf('*') < 0 }, pathname))
}

/** Explicit top-level and special routes. */
const EXACT_ROUTES = {
  '/management': { root: 'management', trail: [{ label: 'Overview' }] },
  '/team': { root: 'management', trail: [{ label: 'Team Management' }] },
  '/forum': { root: 'management', trail: [{ label: 'Forum' }] },
  '/hr-space': { root: 'management', trail: [{ label: 'HR Space' }] },
  '/project-management/new-project': { root: 'management', trail: [{ label: 'Project Management', to: '/project-management' }, { label: 'New project' }] },
  '/management/rfq': { root: 'management', trail: [{ label: 'RFQ' }] },
  '/management/rfq/new': { root: 'management', trail: [{ label: 'RFQ', to: '/management/rfq' }, { label: 'Procurement register' }] },
  '/management/rfq/intelligence': { root: 'management', trail: [{ label: 'RFQ', to: '/management/rfq' }, { label: 'Intelligence' }] },
  '/procurement/new-opportunity': { root: 'management', trail: [{ label: 'RFQ' }] },
  '/cost-management': { root: 'management', trail: [{ label: 'Cost Management' }] },
  '/production': { root: 'management', trail: [{ label: 'Production Management' }] },
  '/enterprise': { root: 'management', trail: [{ label: 'Enterprise Management' }] },
  '/procurement': { root: 'management', trail: [{ label: 'Procurement' }] },
  '/vendors': { root: 'management', trail: [{ label: 'Vendor Master' }] },
  '/contracts': { root: 'management', trail: [{ label: 'Contract Management' }] },
  '/spend-analysis': { root: 'management', trail: [{ label: 'Spend Analysis' }] },
  '/compliance': { root: 'management', trail: [{ label: 'Compliance & ESG' }] },
  '/erp-integrations': { root: 'management', trail: [{ label: 'ERP Integrations' }] },
  '/audit-logs': { root: 'management', trail: [{ label: 'Audit Logs' }] },
  '/ai-insights': { root: 'management', trail: [{ label: 'AI Insights' }] },
  '/templates': { root: 'management', trail: [{ label: 'Templates' }] },
  '/management/auditors/overview': { root: 'management', trail: [{ label: 'Audit management' }] },
  '/hub/procurement': { root: 'home', trail: [{ label: 'Buyers' }] },
  '/hub/partner': { root: 'home', trail: [{ label: 'Partners' }] },
  '/hub/governance': { root: 'home', trail: [{ label: 'Admin' }] },
  '/main-menu': { root: 'home', trail: [{ label: 'Home' }] },
  '/profile': { root: 'home', trail: [{ label: 'Profile' }] },
  '/settings': { root: 'home', trail: [{ label: 'Settings' }] },
  '/plans': { root: 'home', trail: [{ label: 'Plans' }] },
  '/payment': { root: 'home', trail: [{ label: 'Payment' }] },
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
  '/rfq-intelligence': { root: 'management', trail: [{ label: 'RFQ Intelligence' }] },
  '/add-supplier': { root: 'home', trail: [{ label: 'Add Supplier' }] },
  '/services': { root: 'home', trail: [{ label: 'Services' }] },
  '/equipment-request': { root: 'home', trail: [{ label: 'Equipment Request' }] },
  '/audit-request': { root: 'home', trail: [{ label: 'Audit Request' }] },
  '/request-service': { root: 'home', trail: [{ label: 'Request Service' }] },
  '/admin/approvals': { root: 'governance', trail: [{ label: 'Approvals' }] },
  '/developer': { root: 'governance', trail: [{ label: 'Developer' }] },
  '/admin-dashboard': { root: 'governance', trail: [{ label: 'Platform Dashboard' }] },
}

function mgmtModuleTrail(moduleLabel, modulePath, childLabel) {
  return {
    root: PAGE_ROOTS.management,
    trail: [
      { label: moduleLabel, to: modulePath },
      { label: childLabel },
    ],
  }
}

function resolvePrefix(pathname) {
  if (pathname.startsWith('/cost-management/')) {
    const child = pathname.split('/')[2]
    const label = COST_CHILD[child] || titleFromSlug(child)
    return mgmtModuleTrail('Cost Management', '/cost-management', label)
  }

  if (pathname.startsWith('/enterprise/')) {
    const child = pathname.split('/')[2]
    const label = ENTERPRISE_CHILD[child] || titleFromSlug(child)
    return mgmtModuleTrail('Enterprise Management', '/enterprise', label)
  }

  if (pathname.startsWith('/production/system/')) {
    const systemId = pathname.split('/')[3]
    return mgmtModuleTrail('Production Management', '/production', titleFromSlug(systemId))
  }

  if (pathname.startsWith('/production/')) {
    const child = pathname.split('/')[2]
    const label = PRODUCTION_CHILD[child] || titleFromSlug(child)
    return mgmtModuleTrail('Production Management', '/production', label)
  }

  if (pathname.startsWith('/hr-space/employees/')) {
    return mgmtModuleTrail('HR Space', '/hr-space', 'Employee profile')
  }

  if (pathname.startsWith('/hr-space/')) {
    const child = pathname.split('/')[2]
    const label = HR_CHILD[child] || titleFromSlug(child)
    return mgmtModuleTrail('HR Space', '/hr-space', label)
  }

  if (pathname.startsWith('/vendors/') && pathname !== '/vendors') {
    return mgmtModuleTrail('Vendor Master', '/vendors', 'Vendor detail')
  }

  if (pathname.startsWith('/project-management/project/') && pathname.endsWith('/control')) {
    return null
  }

  if (pathname.startsWith('/management/auditors/')) {
    const segment = pathname.split('/').slice(3).join(' / ') || 'Audit Pro'
    return mgmtModuleTrail('Audit management', '/management/auditors/overview', titleFromSlug(segment.replace(/\//g, ' ')))
  }

  if (pathname.startsWith('/industry/')) {
    return {
      root: PAGE_ROOTS.home,
      trail: [{ label: 'Industry', to: pathname.split('/').slice(0, 3).join('/') || '/main-menu' }, { label: titleFromSlug(pathname.split('/').slice(3).join('-')) || 'Page' }],
    }
  }

  if (pathname.startsWith('/product-hub/')) {
    return {
      root: PAGE_ROOTS.home,
      trail: [{ label: 'Product Hub', to: '/product-hub' }, { label: titleFromSlug(pathname.split('/').slice(2).join('-')) || 'Browse' }],
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

  return null
}

const AUTH_ONLY = new Set(['/login', '/register', '/verify-email', '/'])

/**
 * Resolve breadcrumb for current pathname.
 * @returns {{ root: object, trail: array, layout: 'global'|'custom'|'none' } | null}
 */
export function resolvePageBreadcrumb(pathname) {
  if (AUTH_ONLY.has(pathname)) return null

  if (isCustomLayout(pathname)) {
    return { layout: 'custom' }
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
