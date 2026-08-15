/**
 * Superadmin Authentication — STREFEX Platform Administration
 *
 * Superadmin role is assigned server-side (Supabase Auth + public.profiles).
 * Client-side email check is a safeguard only — never authenticate passwords here.
 */

const DEFAULT_SUPERADMIN_EMAIL = 'strefex@strfgroup.ru'

export function configuredSuperadminEmail(runtimeEnv = import.meta.env) {
  const fromEnv = String(runtimeEnv?.VITE_SA_EMAIL || '').trim().toLowerCase()
  if (fromEnv) return fromEnv
  if (runtimeEnv?.PROD) return ''
  return DEFAULT_SUPERADMIN_EMAIL
}

/**
 * Check whether an email address is the registered STREFEX superadmin.
 */
export function isSuperadminEmail(email, runtimeEnv = import.meta.env) {
  const configured = configuredSuperadminEmail(runtimeEnv)
  if (!configured) return false
  return email?.trim().toLowerCase() === configured
}

/** @deprecated Use Supabase auth; client must not verify superadmin passwords. */
export function validateSuperadminCredentials(_email, _password) {
  return false
}

export function canAssignSuperadmin(currentRole) {
  return currentRole === 'superadmin'
}

export function getSuperadminEmail(runtimeEnv = import.meta.env) {
  return configuredSuperadminEmail(runtimeEnv)
}

export function changeSuperadminPassword(_currentPassword, _newPassword) {
  return false
}
