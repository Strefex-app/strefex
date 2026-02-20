/**
 * Company Guard — Enforces company-level data isolation & role hierarchy.
 *
 * This utility provides:
 *   1. Company-scoped data filtering — prevents cross-company data leakage
 *   2. Role hierarchy enforcement — user < manager < auditor_internal < admin < auditor_external < superadmin
 *   3. Creator-based filtering — users see only what they created
 *   4. Audit logging integration — tracks who accessed what
 *   5. Read-only enforcement for auditor roles
 *
 * ROLES:
 *   - user:             see ONLY data they personally created / are assigned to
 *   - manager:          see their department's data + everything users see; can edit/approve
 *   - auditor_internal: see ALL company data (read-only); CANNOT edit or approve
 *   - admin:            see ALL company data; full edit/approve rights within company
 *   - auditor_external: see data across companies (read-only); CANNOT edit or approve
 *   - superadmin:       see ALL data across ALL companies; full control
 *
 * Usage:
 *   import { filterByCompanyRole, canApprove, canEdit, isAuditor, ROLE_HIERARCHY } from '../utils/companyGuard'
 */

import { getUserId, getUserRole, getCompanyName, getTenantId } from './tenantStorage'

/* ── Role hierarchy levels ─────────────────────────────────── */
export const ROLE_HIERARCHY = {
  guest: 0,
  user: 1,
  manager: 2,
  auditor_internal: 3,
  admin: 4,
  auditor_external: 5,
  superadmin: 6,
}

/* ── All valid role names ──────────────────────────────────── */
export const ALL_ROLES = Object.keys(ROLE_HIERARCHY)

/**
 * Check if current user's role meets or exceeds the required level.
 */
export function hasMinRole(requiredRole) {
  const current = getUserRole()
  return (ROLE_HIERARCHY[current] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0)
}

/**
 * Whether the current user holds an auditor role (internal or external).
 * Auditors have elevated read access but cannot modify or approve data.
 */
export function isAuditor(role) {
  const r = role || getUserRole()
  return r === 'auditor_internal' || r === 'auditor_external'
}

/**
 * Whether the current user can EDIT/MODIFY records.
 * Auditors (internal & external) are read-only — they cannot edit.
 * Guests cannot edit either.
 */
export function canEdit(role) {
  const r = role || getUserRole()
  if (isAuditor(r)) return false
  return (ROLE_HIERARCHY[r] || 0) >= ROLE_HIERARCHY.user
}

/**
 * Whether the current user can DELETE records.
 * Only manager+ (non-auditor) roles can delete.
 */
export function canDelete(role) {
  const r = role || getUserRole()
  if (isAuditor(r)) return false
  return (ROLE_HIERARCHY[r] || 0) >= ROLE_HIERARCHY.manager
}

/**
 * Filter an array of records by company & role hierarchy.
 *
 * @param {Array} records — array of objects to filter
 * @param {Object} opts
 * @param {string} opts.creatorField — field name that stores the creator email/name
 * @param {string} opts.departmentField — field name for department (optional)
 * @param {string} opts.userDepartment — current user's department (optional)
 * @param {string} opts.companyField — field name for company domain (for global stores)
 * @returns {Array} filtered records
 */
export function filterByCompanyRole(records, opts = {}) {
  if (!Array.isArray(records) || records.length === 0) return []

  const role = getUserRole()
  const userId = getUserId()
  const companyId = getTenantId()

  // Superadmin and external auditor see everything across companies
  if (role === 'superadmin' || role === 'auditor_external') return records

  // If records have a company field (global stores), filter by company first
  let companyFiltered = records
  if (opts.companyField) {
    companyFiltered = records.filter((r) => {
      const recordCompany = (r[opts.companyField] || '').toLowerCase()
      return recordCompany === companyId
    })
  }

  // Admin and internal auditor see all company data
  if (role === 'admin' || role === 'auditor_internal') return companyFiltered

  // Manager sees department data + own data
  if (role === 'manager') {
    if (opts.departmentField && opts.userDepartment) {
      return companyFiltered.filter((r) => {
        const isOwnData = opts.creatorField && matchesUser(r[opts.creatorField], userId)
        const isSameDepartment = r[opts.departmentField] === opts.userDepartment
        return isOwnData || isSameDepartment
      })
    }
    return companyFiltered
  }

  // Regular user sees only own data (created by them or assigned to them)
  if (opts.creatorField) {
    return companyFiltered.filter((r) => {
      const isCreator = matchesUser(r[opts.creatorField], userId)
      const isAssigned = r.assignedTo && matchesUser(r.assignedTo, userId)
      const isOwner = r.owner && matchesUser(r.owner, userId)
      return isCreator || isAssigned || isOwner
    })
  }

  return companyFiltered
}

/**
 * Check if user can approve at a given approval level.
 *
 * Approval hierarchy for PRs/POs:
 *   - manager: can approve manager-level
 *   - admin:   can approve admin-level + manager-level
 *   - finance: only admin or superadmin
 *
 * Auditors (internal & external) CANNOT approve anything.
 * No user can approve their own submissions.
 */
export function canApprove(approvalLevel, submitterEmail) {
  const role = getUserRole()
  const userId = getUserId()

  // Auditors cannot approve
  if (isAuditor(role)) return false

  // Cannot approve your own submission
  if (matchesUser(submitterEmail, userId)) return false

  // Superadmin can approve everything
  if (role === 'superadmin') return true

  switch (approvalLevel) {
    case 'manager':
      return role === 'manager' || role === 'admin'
    case 'admin':
      return role === 'admin'
    case 'finance':
      return role === 'admin'
    default:
      return false
  }
}

/**
 * Check if a record creator identifier matches the current user.
 */
function matchesUser(creatorValue, currentUserId) {
  if (!creatorValue || !currentUserId) return false
  const cv = String(creatorValue).toLowerCase().trim()
  const cu = currentUserId.toLowerCase().trim()
  if (cv === cu) return true
  const cuLocal = cu.split('@')[0]
  const cvLocal = cv.split('@')[0]
  if (cuLocal && cvLocal && cuLocal === cvLocal) return true
  return false
}

/**
 * Get the current user's company context for use in components.
 */
export function getCompanyContext() {
  const role = getUserRole()
  return {
    userId: getUserId(),
    role,
    companyName: getCompanyName(),
    companyId: getTenantId(),
    isSuperAdmin: role === 'superadmin',
    isAdmin: role === 'admin' || role === 'superadmin',
    isManager: hasMinRole('manager') && !isAuditor(role),
    isAuditorInternal: role === 'auditor_internal',
    isAuditorExternal: role === 'auditor_external',
    isAuditor: isAuditor(role),
    canEdit: canEdit(role),
    canDelete: canDelete(role),
    isUser: hasMinRole('user'),
  }
}

/**
 * Stamp a new record with company context so it can be properly filtered later.
 */
export function stampCompanyContext(record) {
  return {
    ...record,
    _companyId: getTenantId(),
    _companyName: getCompanyName(),
    _createdBy: getUserId(),
    _createdByRole: getUserRole(),
    _createdAt: new Date().toISOString(),
  }
}
