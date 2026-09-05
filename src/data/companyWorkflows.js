import { IATF_CONTROL_PATH } from './iatfControlCatalog'
import { DEPARTMENTS_PATH, departmentSlug } from '../utils/departmentHome'

export const HR_CANON = '/management/people/hr-space'
export const COMPANY_WORKFLOWS_PATH = '/management/people/workflows'

export function hrCanon(suffix = '') {
  if (!suffix) return HR_CANON
  return `${HR_CANON}/${String(suffix).replace(/^\//, '')}`
}

export function withEmployee(path, employeeId) {
  if (!employeeId) return path
  const join = path.includes('?') ? '&' : '?'
  return `${path}${join}employeeId=${encodeURIComponent(employeeId)}`
}

/**
 * Sequential Company OS chains. Steps point at existing modules — not new silos.
 */
export const COMPANY_WORKFLOW_CHAINS = [
  {
    id: 'people-hire',
    label: 'People — hire to HR standard',
    clusterId: 'people',
    description: 'Workforce plan → hire → employee → onboarding → qualification → training → goals → review → HR documents → department.',
    steps: [
      { id: 'workforce', label: 'Workforce plan', path: () => hrCanon('workforce') },
      { id: 'hiring', label: 'Hiring', path: () => hrCanon('hiring') },
      { id: 'hired', label: 'Employee record', path: (ctx) => (ctx.employeeId ? hrCanon(`employees/${ctx.employeeId}`) : hrCanon()) },
      { id: 'onboarding', label: 'Onboarding', path: (ctx) => withEmployee(hrCanon('onboarding'), ctx.employeeId) },
      { id: 'qualification', label: 'Qualification matrix', path: (ctx) => withEmployee(hrCanon('qualification-matrix'), ctx.employeeId) },
      { id: 'training', label: 'Training records', path: (ctx) => withEmployee(hrCanon('training'), ctx.employeeId) },
      { id: 'goals', label: 'Goals', path: (ctx) => withEmployee(hrCanon('goals'), ctx.employeeId) },
      { id: 'dialogue', label: 'Review', path: (ctx) => withEmployee(hrCanon('dialogue'), ctx.employeeId) },
      { id: 'hr-docs', label: 'HR documents', path: (ctx) => withEmployee(hrCanon('hr-docs'), ctx.employeeId) },
      { id: 'department', label: 'Department home', path: (ctx) => (
        ctx.department ? `${DEPARTMENTS_PATH}/${departmentSlug(ctx.department)}` : DEPARTMENTS_PATH
      ) },
    ],
  },
  {
    id: 'quality-contain',
    label: 'Quality — contain to close',
    clusterId: 'ops',
    description: 'Suspect lot → NCR → 8D → change → controlled document → PPAP → department.',
    steps: [
      { id: 'lot', label: 'Lot', path: () => IATF_CONTROL_PATH },
      { id: 'ncr', label: 'NCR contain', path: () => IATF_CONTROL_PATH },
      { id: 'eightd', label: '8D', path: (ctx) => (
        ctx.eightDRecordId
          ? `/management/ops/quality-excellence/t4-8d/${ctx.eightDRecordId}`
          : '/management/ops/quality-excellence/t4-8d'
      ) },
      { id: 'change', label: 'Change control', path: () => IATF_CONTROL_PATH },
      { id: 'document', label: 'QMS document', path: () => IATF_CONTROL_PATH },
      { id: 'ppap', label: 'PPAP pack', path: () => IATF_CONTROL_PATH },
      { id: 'department', label: 'Department', path: (ctx) => (
        ctx.department ? `${DEPARTMENTS_PATH}/${departmentSlug(ctx.department)}` : DEPARTMENTS_PATH
      ) },
    ],
  },
  {
    id: 'sourcing-award',
    label: 'Sourcing — award to plant',
    clusterId: 'sourcing',
    description: 'RFQ → award → project → PO → IATF binder → PPAP.',
    steps: [
      { id: 'rfq', label: 'RFQ', path: (ctx) => (ctx.rfqId ? `/rfq-comparison/${ctx.rfqId}` : '/hub/procurement') },
      { id: 'award', label: 'Award', path: (ctx) => (ctx.rfqId ? `/rfq-comparison/${ctx.rfqId}` : IATF_CONTROL_PATH) },
      { id: 'project', label: 'Project', path: (ctx) => (
        ctx.projectId ? `/management/ops/projects/project/${ctx.projectId}` : '/management/ops/projects'
      ) },
      { id: 'po', label: 'Purchase order', path: () => '/management/sourcing/procurement' },
      { id: 'binder', label: 'Plant binder', path: () => IATF_CONTROL_PATH },
      { id: 'ppap', label: 'PPAP', path: () => IATF_CONTROL_PATH },
    ],
  },
  {
    id: 'production-release',
    label: 'Production — process to lot',
    clusterId: 'ops',
    description: 'Process → part → work instruction → gauge → lot release.',
    steps: [
      { id: 'process', label: 'Process', path: () => IATF_CONTROL_PATH },
      { id: 'part', label: 'Part', path: () => IATF_CONTROL_PATH },
      { id: 'wi', label: 'Work instruction', path: () => IATF_CONTROL_PATH },
      { id: 'gauge', label: 'Gauge', path: () => IATF_CONTROL_PATH },
      { id: 'lot', label: 'Lot', path: () => IATF_CONTROL_PATH },
    ],
  },
]

export function getWorkflowChain(chainId) {
  return COMPANY_WORKFLOW_CHAINS.find((row) => row.id === chainId) || null
}
