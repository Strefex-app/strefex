/**
 * Superadmin Authentication — STREFEX Platform Administration
 *
 * Superadmin role is assigned server-side (Supabase Auth + public.profiles).
 * Client-side email check is a safeguard only — never authenticate passwords here.
 */

const DEFAULT_SUPERADMIN_EMAIL = 'strefex@strfgroup.ru'
const SUPERADMIN_EMAIL = (import.meta.env.VITE_SA_EMAIL || DEFAULT_SUPERADMIN_EMAIL).trim().toLowerCase()

/**
 * Check whether an email address is the registered STREFEX superadmin.
 */
export function isSuperadminEmail(email) {
  if (!SUPERADMIN_EMAIL) return false
  return email?.trim().toLowerCase() === SUPERADMIN_EMAIL
}

/** @deprecated Use Supabase auth; client must not verify superadmin passwords. */
export function validateSuperadminCredentials(_email, _password) {
  return false
}

export function canAssignSuperadmin(currentRole) {
  return currentRole === 'superadmin'
}

export function getSuperadminEmail() {
  return SUPERADMIN_EMAIL
}

export function changeSuperadminPassword(_currentPassword, _newPassword) {
  return false
}
