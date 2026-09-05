import { IATF_CONTROL_PATH, IATF_DOC_DEPARTMENTS } from '../data/iatfControlCatalog'
import {
  COMPANY_DATABASE_PATH,
  DEPARTMENT_FOLDER_HINTS,
  HR_PEOPLE_SPACE,
  PLANT_QMS_SPACE,
} from '../data/companyDatabaseSpaces'
import { companyDatabasePath } from './companyFolders'
import {
  findDepartment,
  makeDepartmentId,
  normalizeDepartment,
  normalizeDepartmentList,
} from './departmentRecord'

export const DEPARTMENTS_PATH = '/management/people/departments'

/** Deep link to the department's folder in Company Database. */
export function departmentFolderPath(departmentName, space) {
  const resolvedSpace = space
    || (departmentName === 'HR' ? HR_PEOPLE_SPACE : PLANT_QMS_SPACE)
  const folderId = DEPARTMENT_FOLDER_HINTS[departmentName]
  return folderId
    ? companyDatabasePath(resolvedSpace, folderId)
    : `${COMPANY_DATABASE_PATH}/${resolvedSpace}`
}

export function departmentSlug(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Stable department objects for the company registry. */
export function listCompanyDepartmentRecords({
  hrDepartments = [],
  employees = [],
  documents = [],
  lots = [],
  openPositions = [],
  workforcePlans = [],
} = {}) {
  const pooled = [
    ...IATF_DOC_DEPARTMENTS.map((name) => ({ id: makeDepartmentId(name), name })),
    ...normalizeDepartmentList(hrDepartments),
  ]
  const pushName = (name) => {
    const row = normalizeDepartment(name)
    if (row) pooled.push(row)
  }
  ;(employees || []).forEach((row) => pushName(row.department))
  ;(documents || []).forEach((row) => pushName(row.department))
  ;(lots || []).forEach((row) => pushName(row.department))
  ;(openPositions || []).forEach((row) => pushName(row.department))
  ;(workforcePlans || []).forEach((row) => pushName(row.department))
  return normalizeDepartmentList(pooled)
}

/** Display names (legacy). Prefer listCompanyDepartmentRecords for ids. */
export function listCompanyDepartments(ctx) {
  return listCompanyDepartmentRecords(ctx).map((d) => d.name)
}

export function findDepartmentBySlug(namesOrRecords, slug) {
  const q = String(slug || '').trim().toLowerCase()
  if (!q) return null
  const records = normalizeDepartmentList(
    (namesOrRecords || []).map((row) => (typeof row === 'string' ? row : row)),
  )
  const hit = records.find(
    (d) => d.id === q || d.id === `dept-${q}` || departmentSlug(d.name) === q || d.name.toLowerCase() === q,
  )
  // Legacy callers expect the display name string.
  return hit ? hit.name : null
}

export function inferLotDepartment(lot, documents = []) {
  if (lot?.department) return lot.department
  const hit = (documents || []).find((doc) => doc.partId && doc.partId === lot?.partId && doc.department)
  return hit?.department || ''
}

export function buildDepartmentHome(dept, {
  employees = [],
  documents = [],
  lots = [],
  ncrs = [],
  openPositions = [],
  workforcePlans = [],
} = {}) {
  const record = normalizeDepartment(dept)
  const name = record?.name || String(dept?.name || dept || '')
  const id = record?.id || makeDepartmentId(name)
  const people = (employees || []).filter((row) => (
    row.department === name || row.departmentId === id
  ))
  const docs = (documents || []).filter((row) => row.department === name || row.departmentId === id)
  const deptLots = (lots || []).filter((lot) => {
    if (lot.departmentId === id || lot.department === name) return true
    return inferLotDepartment(lot, documents) === name
  })
  const lotIds = new Set(deptLots.map((lot) => lot.id))
  const deptNcrs = (ncrs || []).filter((ncr) => (
    ncr.department === name
    || ncr.departmentId === id
    || (ncr.lotIds || []).some((lid) => lotIds.has(lid))
  ))
  return {
    id,
    name,
    slug: departmentSlug(name),
    path: `${DEPARTMENTS_PATH}/${id}`,
    people,
    documents: docs,
    lots: deptLots,
    ncrs: deptNcrs,
    positions: (openPositions || []).filter((row) => (
      (row.department === name || row.departmentId === id) && row.status === 'open'
    )),
    workforce: (workforcePlans || []).filter((row) => row.department === name || row.departmentId === id),
    hrefIatf: IATF_CONTROL_PATH,
    hrefCompanyDatabase: departmentFolderPath(name),
  }
}

export function matchTeamToEmployees(teamMembers = [], employees = []) {
  const empById = new Map((employees || []).filter((row) => row.id).map((row) => [row.id, row]))
  const empByEmail = new Map(
    (employees || [])
      .map((row) => [String(row.email || '').trim().toLowerCase(), row])
      .filter(([email]) => email),
  )
  const pairs = []
  const usedEmployees = new Set()
  const linkedKeys = new Set()
  const memberKey = (row) => row.id || String(row.email || '').trim().toLowerCase()
  ;(teamMembers || []).forEach((member) => {
    const byId = member.employeeId ? empById.get(member.employeeId) : null
    const email = String(member.email || '').trim().toLowerCase()
    const byEmail = email ? empByEmail.get(email) : null
    const employee = byId || byEmail
    if (!employee) return
    pairs.push({ member, employee, via: byId ? 'id' : 'email' })
    usedEmployees.add(employee)
    linkedKeys.add(memberKey(member))
  })
  const teamWithoutEmployee = (teamMembers || []).filter((row) => !linkedKeys.has(memberKey(row)))
  const employeesWithoutLogin = (employees || []).filter((row) => !usedEmployees.has(row))
  return {
    linked: pairs.map((row) => row.member),
    pairs,
    teamWithoutEmployee,
    employeesWithoutLogin,
  }
}

export { findDepartment, makeDepartmentId, normalizeDepartment, normalizeDepartmentList }
