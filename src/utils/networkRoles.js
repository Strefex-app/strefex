/**
 * Role helpers for the flat app nav (no Network/Company mode switch).
 *
 * Home — status dashboard
 * Sourcing — find plants & send RFQs
 * Management — all plant / ops tools (unchanged hub)
 * Inbox — Home top actions only (not global nav)
 */
export function normalizeAccountTypes({ accountType, accountTypes, isSuperAdmin = false } = {}) {
  const types = (
    Array.isArray(accountTypes) && accountTypes.length > 0
      ? accountTypes
      : [accountType]
  ).filter(Boolean)
  if (isSuperAdmin && types.length === 0) return ['buyer', 'seller']
  return types
}

export function hasManufacturerSide(types = []) {
  const set = new Set(types)
  return set.has('seller') || set.has('service_provider')
}

export function hasBuyerSide(types = []) {
  return types.includes('buyer')
}

export function shouldShowHomeInNav({ accountType, accountTypes, isSuperAdmin = false } = {}) {
  if (isSuperAdmin) return true
  const types = normalizeAccountTypes({ accountType, accountTypes, isSuperAdmin })
  return types.length > 0
}

export function shouldShowSourcingInNav({ accountType, accountTypes, isSuperAdmin = false } = {}) {
  if (isSuperAdmin) return true
  const types = normalizeAccountTypes({ accountType, accountTypes, isSuperAdmin })
  return hasBuyerSide(types) || hasManufacturerSide(types)
}

/** Manufacturer RFQ inbox — reachable from Home top actions, not global nav. */
export function shouldShowInboxInNav() {
  return false
}

/** Management hub — plant tools for any company account. */
export function shouldShowManagementInNav({ accountType, accountTypes, isSuperAdmin = false } = {}) {
  if (isSuperAdmin) return true
  const types = normalizeAccountTypes({ accountType, accountTypes, isSuperAdmin })
  return hasBuyerSide(types) || hasManufacturerSide(types) || types.length > 0
}
