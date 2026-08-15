/** Management hub cluster routes — six operational areas under /management. */
export const MANAGEMENT_CLUSTER_IDS = [
  'people',
  'sourcing',
  'contracts-compliance',
  'finance',
  'ops',
  'platform',
]

export const MANAGEMENT_OVERVIEW_PATH = '/management'

export const MODULE_SLUGS = {
  team: 'team',
  'hr-space': 'hr-space',
  forum: 'forum',
  sourcing: 'workspace',
  vendors: 'vendors',
  procurement: 'procurement',
  'auditors-hub': 'auditors',
  contracts: 'contracts',
  compliance: 'compliance',
  'audit-logs': 'activity-log',
  enterprise: 'enterprise',
  cost: 'cost',
  spend: 'spend-analysis',
  project: 'projects',
  production: 'production',
  erp: 'erp',
  'ai-insights': 'ai-insights',
  'platform-security-audit': 'security-audit',
}

export function managementClusterPath(clusterId) {
  return `/management/${clusterId}`
}

export function isManagementClusterId(id) {
  return MANAGEMENT_CLUSTER_IDS.includes(id)
}

export function getModuleSlug(moduleId) {
  return MODULE_SLUGS[moduleId] || moduleId
}

/** Build canonical path: /management/{cluster}/{slug}/… */
export function managementModulePath(clusterId, slug, ...rest) {
  const base = `/management/${clusterId}/${slug}`
  if (!rest.length) return base
  return `${base}/${rest.filter(Boolean).join('/')}`
}
