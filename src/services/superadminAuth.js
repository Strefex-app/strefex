/**
 * Superadmin Authentication — STREFEX Platform Administration
 *
 * The superadmin role belongs EXCLUSIVELY to STREFEX administration.
 * - Only the registered STREFEX superadmin email can log in as superadmin
 * - Superadmin login requires 2FA email confirmation code
 * - Only an existing superadmin can promote another account to superadmin
 * - Company admins CANNOT self-escalate to superadmin
 *
 * Credentials are read from environment variables (VITE_SA_EMAIL, VITE_SA_PASS_HASH).
 * In production the 2FA code is sent via a real email API; in dev it is shown in the UI.
 */

import env from '../config/env'

const SUPERADMIN_EMAIL = (import.meta.env.VITE_SA_EMAIL || '').trim().toLowerCase()
const SA_PASS_HASH     = (import.meta.env.VITE_SA_PASS_HASH || '').trim()

function verifyPassword(password) {
  if (!SA_PASS_HASH) return false
  try {
    return password === atob(SA_PASS_HASH)
  } catch {
    return false
  }
}

/**
 * Check whether an email address is the registered STREFEX superadmin.
 */
export function isSuperadminEmail(email) {
  if (!SUPERADMIN_EMAIL) return false
  return email?.trim().toLowerCase() === SUPERADMIN_EMAIL
}

/**
 * Validate superadmin credentials (step 1 of login).
 */
export function validateSuperadminCredentials(email, password) {
  if (!isSuperadminEmail(email)) return false
  return verifyPassword(password)
}

/**
 * Generate a 6-digit 2FA confirmation code.
 * In production this would be sent via email to the superadmin address.
 */
let _pending2FA = null

export function generate2FACode() {
  const code = String(Math.floor(100000 + Math.random() * 900000))
  _pending2FA = {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  }
  return code
}

/**
 * Verify the 2FA confirmation code (step 2 of login).
 */
export function verify2FACode(inputCode) {
  if (!_pending2FA) return false
  if (Date.now() > _pending2FA.expiresAt) {
    _pending2FA = null
    return false
  }
  const valid = String(inputCode).trim() === _pending2FA.code
  if (valid) _pending2FA = null
  return valid
}

export function clear2FA() {
  _pending2FA = null
}

export function canAssignSuperadmin(currentRole) {
  return currentRole === 'superadmin'
}

export function getSuperadminEmail() {
  return SUPERADMIN_EMAIL
}

export function changeSuperadminPassword(_currentPassword, _newPassword) {
  // Password changes must go through the backend / Supabase auth in production.
  // Client-side password mutation is disabled for security.
  return false
}
