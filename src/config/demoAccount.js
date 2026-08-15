/**
 * Presentation demo account — isolated sandbox, no live database.
 * Access requires VITE_DEMO_ACCESS_CODE (shared only with allowed testers).
 */

export const DEMO_TENANT_ID = 'strefex-presentation-demo'
export const DEMO_SESSION_MODE = 'demo'

/** sessionStorage — unlocks demo buttons for this browser tab/session. */
export const DEMO_ACCESS_SESSION_KEY = 'strefex-demo-access-granted'

export const DEMO_PROFILES = {
  buyer: {
    id: 'demo-user-buyer',
    email: 'demo.buyer@strefex.app',
    fullName: 'Alex Demo',
    companyName: 'Demo Procurement GmbH',
    accountType: 'buyer',
    primaryAccountType: 'buyer',
    accountTypes: ['buyer'],
    planId: 'standard',
  },
  seller: {
    id: 'demo-user-seller',
    email: 'demo.manufacturer@strefex.app',
    fullName: 'Morgan Demo',
    companyName: 'Demo Manufacturing AG',
    accountType: 'seller',
    primaryAccountType: 'seller',
    accountTypes: ['seller'],
    planId: 'standard',
  },
}

/** Quick sign-in email (password must be the configured demo access code). */
export const DEMO_QUICK_EMAIL = 'demo@strefex.app'

export const DEMO_SEED_VERSION = '2026-05-20-v1'

const MIN_ACCESS_CODE_LENGTH = 8

/** Secret from deployment env — never committed. Stripped from production builds. */
export function getDemoAccessCode(env = import.meta.env) {
  if (env.PROD) return ''
  return String(env.VITE_DEMO_ACCESS_CODE || '').trim()
}

/** Demo UI/logins only in non-production, when an access code is configured. */
export function isDemoLoginEnabled(env = import.meta.env) {
  if (env.PROD) return false
  if (env.VITE_DEMO_LOGIN_ENABLED === 'false') return false
  return getDemoAccessCode(env).length >= MIN_ACCESS_CODE_LENGTH
}

export function verifyDemoAccessCode(code, env = import.meta.env) {
  const expected = getDemoAccessCode(env)
  if (!expected) return false
  return String(code || '').trim() === expected
}

export function grantDemoAccessSession() {
  try {
    sessionStorage.setItem(DEMO_ACCESS_SESSION_KEY, '1')
  } catch {
    /* silent */
  }
}

export function revokeDemoAccessSession() {
  try {
    sessionStorage.removeItem(DEMO_ACCESS_SESSION_KEY)
  } catch {
    /* silent */
  }
}

export function isDemoAccessGranted() {
  if (!isDemoLoginEnabled()) return false
  try {
    return sessionStorage.getItem(DEMO_ACCESS_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function isDemoModeActive() {
  try {
    const raw = localStorage.getItem('strefex-auth')
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return parsed?.sessionMode === DEMO_SESSION_MODE
  } catch {
    return false
  }
}

function isDemoEmail(normalizedEmail) {
  if (normalizedEmail === DEMO_QUICK_EMAIL.toLowerCase()) return true
  return Object.values(DEMO_PROFILES).some((p) => p.email.toLowerCase() === normalizedEmail)
}

export { isDemoEmail }

/** Resolve demo profile key from login email + access code, or null. */
export function matchDemoProfile(email, password) {
  if (!isDemoLoginEnabled()) return null
  if (!verifyDemoAccessCode(password)) return null

  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return null

  if (normalized === DEMO_QUICK_EMAIL.toLowerCase()) {
    return 'buyer'
  }

  for (const [key, profile] of Object.entries(DEMO_PROFILES)) {
    if (profile.email.toLowerCase() === normalized) {
      return key
    }
  }

  if (isDemoEmail(normalized)) return null
  return null
}

export function getDemoProfileMeta(profileKey) {
  return DEMO_PROFILES[profileKey] || DEMO_PROFILES.buyer
}

export function assertDemoAccessAllowed() {
  if (!isDemoAccessGranted()) {
    const err = new Error('Demo access code required. Enter the code on the login page first.')
    err.code = 'demo_access_denied'
    throw err
  }
}
