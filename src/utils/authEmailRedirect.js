import env from '../config/env'

/** Public site used in auth emails (must be on the Supabase redirect allow-list). */
export function authAppOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/$/, '')
  }
  const configured = String(env.APP_ORIGIN || '').trim().replace(/\/$/, '')
  if (configured) return configured
  return 'https://strefex.pro'
}

export function authEmailRedirectTo(path = '/login?confirmed=true') {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${authAppOrigin()}${suffix}`
}

/** True when Confirm email is on and GoTrue returned a user without a session. */
export function signupAwaitingConfirmation(signUpData) {
  return Boolean(signUpData?.user && !signUpData.session)
}

/**
 * Supabase returns 200 + user with empty identities when the email is already
 * registered. No confirmation mail is sent in that case.
 */
export function signupLooksLikeExistingAccount(signUpData) {
  const identities = signUpData?.user?.identities
  return Array.isArray(identities) && identities.length === 0
}

