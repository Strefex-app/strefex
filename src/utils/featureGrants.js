/**
 * Superadmin feature grants — platform-wide localStorage (not tenant-scoped).
 * Evaluated in subscription `hasFeature` so granted tools unlock for the target account.
 */

export const FEATURE_GRANTS_STORAGE_KEY = 'strefex-feature-grants'

const normEmail = (email) => String(email || '').trim().toLowerCase()

export function loadFeatureGrants() {
  try {
    const raw = localStorage.getItem(FEATURE_GRANTS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return []
}

export function saveFeatureGrants(grants) {
  try {
    localStorage.setItem(FEATURE_GRANTS_STORAGE_KEY, JSON.stringify(grants))
  } catch {
    /* ignore */
  }
}

/**
 * Whether an active, non-expired grant exists for this feature and user.
 * Matches by email and/or account id (aligned with superadmin normalized accounts).
 */
export function userHasActiveFeatureGrant(featureKey, userEmail, userAccountId) {
  const grants = loadFeatureGrants()
  if (!Array.isArray(grants) || !featureKey) return false
  const em = normEmail(userEmail)
  const aid = userAccountId != null && userAccountId !== '' ? String(userAccountId) : ''
  const now = Date.now()
  return grants.some((g) => {
    if (!g || String(g.status || 'active') !== 'active') return false
    if (String(g.featureKey) !== String(featureKey)) return false
    if (g.expiresAt && new Date(g.expiresAt).getTime() < now) return false
    if (em && normEmail(g.email) === em) return true
    if (aid && String(g.accountId || '') === aid) return true
    return false
  })
}
