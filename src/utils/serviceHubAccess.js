import { normalizeAccountTypes } from './networkRoles'

/** Buyer / seller order & discover entry — Intelligent Sourcing. */
export const BUYER_SERVICE_SOURCING_PATH = '/sourcing'

/** @deprecated Same as BUYER_SERVICE_SOURCING_PATH — catalog Exec Summary removed. */
export const BUYER_SERVICE_INDUSTRY_PATH = BUYER_SERVICE_SOURCING_PATH

/**
 * Legacy Service Hub + Service Executive Summary stay for service-provider registration
 * (and superadmin). Buyers/sellers order through Sourcing / industry hubs instead.
 */
export function canAccessLegacyServiceHub({
  accountType,
  accountTypes,
  isSuperAdmin = false,
} = {}) {
  if (isSuperAdmin) return true
  const types = normalizeAccountTypes({ accountType, accountTypes, isSuperAdmin })
  return types.includes('service_provider') || types.includes('auditor')
}
