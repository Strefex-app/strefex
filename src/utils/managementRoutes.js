import { MANAGEMENT_MODULE_CLUSTERS, MANAGEMENT_MODULES } from '../data/managementModuleGroups'
import { getModuleSlug, MANAGEMENT_OVERVIEW_PATH } from '../constants/managementPaths'

/** Child segment labels for nested module pages. */
export const MANAGEMENT_CHILD_LABELS = {
  cost: {
    calculator: 'Product Cost Calculator',
    bom: 'Bill of Materials',
    breakdown: 'Cost Breakdown',
    comparison: 'Cost Comparison',
    scenarios: 'What-If Scenarios',
    targets: 'Target Costing',
  },
  enterprise: {
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
  },
  production: {
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
  },
  'hr-space': {
    'qualification-matrix': 'Qualification Matrix',
    goals: 'Employee Goals',
    dialogue: 'Employee Dialogue',
    'hr-docs': 'HR Documentation',
    training: 'Training',
    workforce: 'Workforce',
    onboarding: 'Onboarding',
    attendance: 'Attendance',
    hiring: 'Hiring & Recruitment',
    employees: 'Employee profile',
  },
  projects: {
    'new-project': 'New project',
    project: 'Project',
  },
}

function titleFromSlug(slug = '') {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function childLabel(moduleSlug, segment) {
  const map = MANAGEMENT_CHILD_LABELS[moduleSlug]
  if (map?.[segment]) return map[segment]
  return titleFromSlug(segment)
}

export function resolveManagementBreadcrumb(pathname) {
  if (!pathname.startsWith('/management')) return null

  const root = { label: 'Management', to: MANAGEMENT_OVERVIEW_PATH }
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 1) {
    return { root, trail: [{ label: 'Overview' }] }
  }

  const clusterId = segments[1]
  const cluster = MANAGEMENT_MODULE_CLUSTERS.find((c) => c.id === clusterId)
  if (!cluster) return null

  const trail = [
    { label: 'Overview', to: MANAGEMENT_OVERVIEW_PATH },
    { label: cluster.label, to: cluster.path },
  ]

  if (segments.length === 2) {
    return { root, trail }
  }

  const moduleSlug = segments[2]
  const mod = MANAGEMENT_MODULES.find(
    (m) => m.clusterId === clusterId && getModuleSlug(m.id) === moduleSlug,
  )

  if (mod) {
    trail.push({
      label: mod.label,
      to: segments.length > 3 ? mod.path : undefined,
    })
  } else if (moduleSlug === 'register' || moduleSlug === 'intelligence') {
    trail.push({
      label: moduleSlug === 'register' ? 'Procurement register' : 'Intelligence',
      to: segments.length > 3 ? `/${segments.slice(0, 4).join('/')}` : undefined,
    })
  } else {
    trail.push({ label: titleFromSlug(moduleSlug) })
  }

  for (let i = 3; i < segments.length; i += 1) {
    const seg = segments[i]
    const isLast = i === segments.length - 1
    const label = childLabel(moduleSlug, seg) || titleFromSlug(seg)
    if (isLast) {
      trail.push({ label })
    } else {
      trail.push({ label, to: `/${segments.slice(0, i + 1).join('/')}` })
    }
  }

  return { root, trail }
}

export function isManagementCustomLayout(pathname) {
  if (!pathname.startsWith('/management')) return false
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 2 && MANAGEMENT_MODULE_CLUSTERS.some((c) => c.id === segments[1])) {
    return true
  }
  if (pathname === '/management/sourcing/workspace') return true
  if (pathname.startsWith('/management/sourcing/register')) return true
  if (pathname.startsWith('/management/sourcing/intelligence')) return true
  if (pathname.startsWith('/management/contracts-compliance/auditors/overview')) return true
  if (pathname.startsWith('/management/ops/projects/new-project')) return true
  if (pathname.startsWith('/management/ops/projects/project/') && pathname.endsWith('/control')) {
    return true
  }
  return false
}

export const LEGACY_MANAGEMENT_REDIRECTS = [
  { from: '/team', to: '/management/people/team' },
  { from: '/forum', to: '/management/people/forum' },
  { from: '/hr-space', to: '/management/people/hr-space' },
  { from: '/vendors', to: '/management/sourcing/vendors' },
  { from: '/procurement', to: '/management/sourcing/procurement' },
  { from: '/contracts', to: '/management/contracts-compliance/contracts' },
  { from: '/compliance', to: '/management/contracts-compliance/compliance' },
  { from: '/audit-logs', to: '/management/contracts-compliance/activity-log' },
  { from: '/enterprise', to: '/management/finance/enterprise' },
  { from: '/cost-management', to: '/management/finance/cost' },
  { from: '/spend-analysis', to: '/management/finance/spend-analysis' },
  { from: '/project-management', to: '/management/ops/projects' },
  { from: '/production', to: '/management/ops/production' },
  { from: '/erp-integrations', to: '/management/platform/erp' },
  { from: '/ai-insights', to: '/management/platform/ai-insights' },
  { from: '/management/auditors', to: '/management/contracts-compliance/auditors' },
  { from: '/management/rfq', to: '/management/sourcing' },
  { from: '/management/rfq/new', to: '/management/sourcing/register/new' },
  { from: '/management/rfq/intelligence', to: '/management/sourcing/intelligence' },
  { from: '/procurement/new-opportunity', to: '/management/sourcing/register/new' },
  { from: '/rfq-intelligence', to: '/management/sourcing/intelligence' },
]

export function resolveLegacyManagementRedirect(pathname) {
  for (const { from, to } of LEGACY_MANAGEMENT_REDIRECTS) {
    if (pathname === from) return to
    if (pathname.startsWith(`${from}/`)) {
      return to + pathname.slice(from.length)
    }
  }
  return null
}

export { MANAGEMENT_OVERVIEW_PATH }
