/**
 * Tenant-scoped localStorage — prevents cross-company data leaks.
 *
 * All data keys are scoped by COMPANY (derived from the user's email domain
 * or explicit companyName), so that:
 *   - All users within the SAME company share data (PRs, POs, vendors, etc.)
 *   - Different companies are completely isolated from each other.
 *   - No cross-company data leakage is possible.
 *
 * Company ID is derived as follows (priority order):
 *   1. tenant.id   — if the backend provides an explicit tenant/company ID
 *   2. tenant.slug — if the backend provides a slug
 *   3. user.companyName — explicit company name from registration
 *   4. email domain — extracted from user email (e.g. acme.com → acme.com)
 *   5. 'guest'      — fallback when no one is logged in
 *
 * GLOBAL data (auth session, account registry, UI settings) is NOT
 * scoped — it lives at the platform level.
 *
 * Usage:
 *   import { tenantKey, createTenantStorage, getUserId } from '../utils/tenantStorage'
 *
 *   // Manual localStorage:
 *   localStorage.getItem(tenantKey('strefex-selected-industries'))
 *
 *   // Zustand persist:
 *   persist(fn, { name: 'project-storage', storage: createTenantStorage() })
 */
import { createJSONStorage } from 'zustand/middleware'

const AUTH_KEY = 'strefex-auth'

/**
 * Get the current auth session from localStorage (parsed).
 */
function getAuthSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Get a stable, filesystem-safe COMPANY-level tenant identifier.
 * All users within the same company get the same tenantId, ensuring
 * shared data (PRs, POs, vendors, contracts, etc.) while preventing
 * cross-company data leakage.
 *
 * Returns 'guest' when no one is logged in.
 */
export function getTenantId() {
  const session = getAuthSession()
  if (!session) return 'guest'

  const { user, tenant } = session

  // Priority 1: explicit tenant/company ID from backend
  if (tenant?.id) return String(tenant.id).toLowerCase().replace(/[^a-z0-9._\-]/g, '')

  // Priority 2: tenant slug
  if (tenant?.slug) return tenant.slug.toLowerCase().replace(/[^a-z0-9._\-]/g, '')

  // Priority 3: derive company from email domain (e.g. john@acme.com → acme.com)
  // This takes precedence over companyName to stay consistent with
  // getCompanyDomain() used in transactionStore / serviceRequestStore.
  if (user?.email) {
    const domain = user.email.split('@')[1]
    if (domain) return domain.toLowerCase().replace(/[^a-z0-9._\-]/g, '')
  }

  // Priority 4: company name from user profile (fallback for non-email logins)
  if (user?.companyName) return user.companyName.toLowerCase().replace(/[^a-z0-9._\-]/g, '')

  return 'guest'
}

/**
 * Get a unique per-user identifier within a company.
 * Used when you need to track individual user actions within shared
 * company data (e.g. audit logs: "who did what").
 */
export function getUserId() {
  const session = getAuthSession()
  if (!session?.user?.email) return 'unknown'
  return session.user.email.toLowerCase().replace(/[^a-z0-9@._\-]/g, '')
}

/**
 * Get the current user's role within the company hierarchy.
 * Returns: 'superadmin' | 'auditor_external' | 'admin' | 'auditor_internal' | 'manager' | 'user' | 'guest'
 */
export function getUserRole() {
  const session = getAuthSession()
  return session?.role || 'guest'
}

/**
 * Get the current company name.
 */
export function getCompanyName() {
  const session = getAuthSession()
  if (!session) return 'Unknown'
  return session.tenant?.name || session.user?.companyName || 'Unknown'
}

/**
 * Build a tenant-scoped localStorage key.
 * Example: tenantKey('strefex-rfq-storage')
 *   → 'strefex-rfq-storage::acme.com'    (company-level)
 */
export function tenantKey(baseKey) {
  return `${baseKey}::${getTenantId()}`
}

/**
 * A localStorage-compatible object that automatically prefixes every
 * key with the tenant ID.  Drop-in replacement for `localStorage`.
 */
const tenantLocalStorage = {
  getItem: (name) => localStorage.getItem(tenantKey(name)),
  setItem: (name, value) => localStorage.setItem(tenantKey(name), value),
  removeItem: (name) => localStorage.removeItem(tenantKey(name)),
}

/**
 * Zustand `persist` storage adapter that isolates data per tenant.
 *
 * Usage:
 *   import { createTenantStorage } from '../utils/tenantStorage'
 *   persist(fn, { name: 'my-store', storage: createTenantStorage() })
 */
export function createTenantStorage() {
  return createJSONStorage(() => tenantLocalStorage)
}
