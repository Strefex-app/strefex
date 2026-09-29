/**
 * HR Space → company workspace snapshot + Enterprise personnel headcount.
 * Tenant persistence is Zustand + tenant_workspace_snapshots (company_id).
 */
import useEnterpriseStore from '../store/enterpriseStore'
import { devWarn } from './devLog'

const HR_ARRAY_KEYS = [
  'employees',
  'openPositions',
  'candidates',
  'talentPoolEntries',
  'goals',
  'dialogues',
  'hrDocuments',
  'trainingRecords',
  'workforcePlans',
  'onboardingTasks',
  'attendanceEntries',
]

export function isHrEmployeeActive(emp) {
  const s = String(emp?.status || 'active').toLowerCase()
  return s === 'active' || s === 'onboarding'
}

export function isHrSpaceSnapshotEmpty(p) {
  if (!p || typeof p !== 'object') return true
  return HR_ARRAY_KEYS.every((k) => !Array.isArray(p[k]) || p[k].length === 0)
}

function deptKey(name) {
  return String(name || '').trim().toLowerCase() || 'unassigned'
}

function personnelSignature(rows) {
  return JSON.stringify(
    (Array.isArray(rows) ? rows : []).map((r) => [
      r.id,
      r.department,
      Number(r.headcount) || 0,
      Number(r.avgSalary) || 0,
      Number(r.benefits) || 0,
      Number(r.training) || 0,
    ]),
  )
}

/**
 * Roll HR active headcount into enterprise personnel rows.
 * Keeps salary / benefit / training from matching departments; keeps extra
 * enterprise-only cost rows (e.g. Management) that have no HR employees.
 */
export function buildPersonnelCostsFromEmployees(employees, existingCosts = []) {
  const list = Array.isArray(employees) ? employees : []
  const existing = Array.isArray(existingCosts) ? existingCosts : []
  const active = list.filter(isHrEmployeeActive)

  const byDept = new Map()
  active.forEach((emp) => {
    const name = String(emp.department || 'Unassigned').trim() || 'Unassigned'
    const key = deptKey(name)
    const row = byDept.get(key) || { name, headcount: 0 }
    row.headcount += 1
    byDept.set(key, row)
  })

  if (byDept.size === 0) return existing

  const existingByKey = new Map()
  existing.forEach((row) => {
    existingByKey.set(deptKey(row.department), row)
  })

  const fromHr = [...byDept.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, headcount }) => {
      const prev = existingByKey.get(deptKey(name))
      const slug = deptKey(name).replace(/\s+/g, '-')
      return {
        id: prev?.id || `pc-hr-${slug}`,
        department: prev?.department || name,
        headcount,
        avgSalary: Number(prev?.avgSalary) || 0,
        benefits: Number(prev?.benefits) || 0,
        training: Number(prev?.training) || 0,
        description: prev?.description || 'Headcount from HR Space',
        source: 'hr_space',
      }
    })

  const used = new Set(fromHr.map((r) => deptKey(r.department)))
  const extras = existing.filter((row) => !used.has(deptKey(row.department)))
  return [...fromHr, ...extras]
}

export function applyHrPersonnelToEnterprise(employees) {
  const existing = useEnterpriseStore.getState().personnelCosts || []
  const next = buildPersonnelCostsFromEmployees(employees, existing)
  if (personnelSignature(next) === personnelSignature(existing)) return false
  useEnterpriseStore.setState({ personnelCosts: next })
  if (typeof window !== 'undefined') {
    import('../services/workspaceCloudSync')
      .then((m) => {
        if (typeof m.notifyWorkspaceKeyDirty === 'function') {
          m.notifyWorkspaceKeyDirty('enterprise', true)
        }
      })
      .catch((err) => devWarn('enterprise personnel sync skipped', err))
  }
  return true
}

/** Flush HR snapshot to the company row in Supabase; update enterprise headcount when the employee list changed. */
export function persistHrSpaceToCompany(employeesIfChanged) {
  if (typeof window === 'undefined') return
  import('../services/workspaceCloudSync')
    .then((m) => {
      if (typeof m.notifyWorkspaceKeyDirty === 'function') {
        m.notifyWorkspaceKeyDirty('hr_space', true)
      }
    })
    .catch((err) => devWarn('hr_space sync skipped', err))
  if (employeesIfChanged) applyHrPersonnelToEnterprise(employeesIfChanged)
}

export function bindHrCompanyPersist(store) {
  if (typeof window === 'undefined' || !store?.subscribe) return
  if (import.meta.env?.VITEST) return
  queueMicrotask(() => {
    let lastEmployees = store.getState().employees
    applyHrPersonnelToEnterprise(lastEmployees)
    store.subscribe((s) => {
      const empChanged = s.employees !== lastEmployees
      lastEmployees = s.employees
      persistHrSpaceToCompany(empChanged ? s.employees : undefined)
    })
  })
}
