/**
 * Profile fields required for Network map / compare / RFQ visibility.
 */

export const SOURCING_VISIBILITY_FIELDS = [
  { key: 'country', label: 'Country', requiredFor: ['seller', 'service_provider', 'buyer'] },
  { key: 'city', label: 'City', requiredFor: ['seller', 'service_provider', 'buyer'] },
  { key: 'address', label: 'Plant / site address', requiredFor: ['seller', 'service_provider'] },
  { key: 'industries', label: 'Industry', requiredFor: ['seller', 'service_provider', 'buyer'], isArray: true },
]

function hasValue(account, field) {
  if (field.isArray) {
    return Array.isArray(account?.[field.key]) && account[field.key].length > 0
  }
  const v = account?.[field.key]
  return typeof v === 'string' ? v.trim().length > 0 : v != null && v !== ''
}

/**
 * Ensure registry accounts have sourcing fields (empty string / [] placeholders).
 * Does not invent location data — users fill on next login.
 */
export function ensureSourcingFieldPlaceholders(account) {
  if (!account || typeof account !== 'object') return account
  const next = { ...account }
  let changed = false
  if (!('country' in next) || next.country == null) { next.country = ''; changed = true }
  if (!('city' in next) || next.city == null) { next.city = ''; changed = true }
  if (!('address' in next) || next.address == null) { next.address = ''; changed = true }
  if (!Array.isArray(next.industries)) { next.industries = []; changed = true }
  if (!next.categories || typeof next.categories !== 'object') { next.categories = {}; changed = true }
  return changed ? next : account
}

export function getAccountSourcingGaps(account) {
  if (!account) return SOURCING_VISIBILITY_FIELDS.map((f) => f.key)
  const type = String(account.accountType || 'seller').toLowerCase()
  return SOURCING_VISIBILITY_FIELDS
    .filter((f) => f.requiredFor.includes(type))
    .filter((f) => !hasValue(account, f))
    .map((f) => f.key)
}

export function accountVisibleOnSourcingMap(account) {
  if (!account || account.status === 'canceled') return false
  const type = String(account.accountType || '').toLowerCase()
  if (type !== 'seller' && type !== 'service_provider') return false
  // Approximate pin works with country alone; still flag city/industry as gaps for completeness UI.
  return Boolean(String(account.country || '').trim()) || Boolean(String(account.city || '').trim())
}

export function describeSourcingGaps(gaps) {
  const labels = {
    country: 'country',
    city: 'city',
    address: 'plant address',
    industries: 'industry',
  }
  return gaps.map((g) => labels[g] || g)
}
