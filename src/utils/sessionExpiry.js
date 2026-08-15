/**
 * Convert a Supabase session `expires_at` (unix seconds) to epoch milliseconds.
 * Returns null when the session has no usable expiry.
 */
export function sessionExpiresAtMs(session) {
  const unix = session?.expires_at
  if (typeof unix === 'number' && Number.isFinite(unix) && unix > 0) {
    return unix * 1000
  }
  const numeric = Number(unix)
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric * 1000
  }
  return null
}
