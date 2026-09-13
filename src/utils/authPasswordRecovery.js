const STORAGE_KEY = 'stx-password-recovery'
const EVENT_NAME = 'stx-password-recovery'

export function detectRecoveryFromLocation(location = typeof window === 'undefined' ? null : window.location) {
  if (!location) return false
  const hash = new URLSearchParams(String(location.hash || '').replace(/^#/, ''))
  const search = new URLSearchParams(location.search || '')
  return hash.get('type') === 'recovery'
    || search.get('type') === 'recovery'
    || search.get('reset') === 'true'
}

export function isPasswordRecoveryPending() {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markPasswordRecovery() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function clearPasswordRecovery() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function subscribePasswordRecovery(listener) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
