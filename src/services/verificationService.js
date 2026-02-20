/**
 * Verification Service — Email & Phone 2FA for STREFEX Platform
 *
 * Handles generation and validation of one-time verification codes
 * for both email addresses and phone numbers during registration.
 *
 * In production, codes would be sent via:
 *   - Email: SendGrid / AWS SES / SMTP
 *   - Phone: Twilio / AWS SNS / Vonage
 *
 * For the client-side demo, codes are generated locally and displayed
 * in the UI (simulating "check your email/phone").
 */

const CODE_TTL_MS = 5 * 60 * 1000
const VERIFIED_KEY = 'strefex-verified-contacts'

const _pending = { email: null, phone: null }

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/**
 * Send a verification code to an email address.
 * In production: sends via email API. In demo: returns the code.
 * @returns {{ code: string, expiresAt: number }}
 */
export function sendEmailCode(email) {
  const code = generateCode()
  _pending.email = {
    target: email.trim().toLowerCase(),
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  }
  return { code, expiresAt: _pending.email.expiresAt }
}

/**
 * Verify the email code.
 * @returns {boolean}
 */
export function verifyEmailCode(inputCode) {
  if (!_pending.email) return false
  if (Date.now() > _pending.email.expiresAt) {
    _pending.email = null
    return false
  }
  const valid = String(inputCode).trim() === _pending.email.code
  if (valid) {
    markVerified('email', _pending.email.target)
    _pending.email = null
  }
  return valid
}

/**
 * Send a verification code to a phone number.
 * In production: sends via SMS API. In demo: returns the code.
 * @returns {{ code: string, expiresAt: number }}
 */
export function sendPhoneCode(phone) {
  const code = generateCode()
  _pending.phone = {
    target: phone.trim(),
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  }
  return { code, expiresAt: _pending.phone.expiresAt }
}

/**
 * Verify the phone code.
 * @returns {boolean}
 */
export function verifyPhoneCode(inputCode) {
  if (!_pending.phone) return false
  if (Date.now() > _pending.phone.expiresAt) {
    _pending.phone = null
    return false
  }
  const valid = String(inputCode).trim() === _pending.phone.code
  if (valid) {
    markVerified('phone', _pending.phone.target)
    _pending.phone = null
  }
  return valid
}

/**
 * Clear any pending verification (on cancel / navigation away).
 */
export function clearPendingVerification() {
  _pending.email = null
  _pending.phone = null
}

/**
 * Persist that a contact (email or phone) has been verified.
 */
function markVerified(type, value) {
  try {
    const raw = localStorage.getItem(VERIFIED_KEY)
    const data = raw ? JSON.parse(raw) : {}
    if (!data[type]) data[type] = []
    if (!data[type].includes(value)) data[type].push(value)
    localStorage.setItem(VERIFIED_KEY, JSON.stringify(data))
  } catch { /* silent */ }
}

/**
 * Check if a contact is already verified.
 */
export function isContactVerified(type, value) {
  try {
    const raw = localStorage.getItem(VERIFIED_KEY)
    if (!raw) return false
    const data = JSON.parse(raw)
    return data[type]?.includes(value.trim().toLowerCase?.() ?? value.trim()) ?? false
  } catch {
    return false
  }
}

/**
 * Format a phone number for display (mask middle digits).
 */
export function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone || ''
  return phone.slice(0, 3) + '***' + phone.slice(-3)
}

/**
 * Format an email for display (mask local part).
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || ''
  const [local, domain] = email.split('@')
  if (local.length <= 2) return local + '@' + domain
  return local[0] + '***' + local[local.length - 1] + '@' + domain
}
