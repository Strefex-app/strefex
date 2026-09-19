/**
 * Cross-jurisdiction account privacy veil (EU GDPR, China PIPL, USA CCPA/CPRA, Russia 152-FZ).
 *
 * Default public card is company identity for B2B matching only:
 * name, country, city, industry, badges — not contact persons, email, phone, or street address.
 * Identified data is shown only to the owning company, platform operators (superadmin /
 * assigned external auditor), or a buyer after the seller grants a logged disclosure.
 */

export const IDENTIFIED_ACCOUNT_FIELDS = [
  'email',
  'phone',
  'contactName',
  'contact_name',
  'fullName',
  'full_name',
  'address',
  'street',
  'postalCode',
  'postal_code',
  'taxId',
  'vatNumber',
]

export const PRIVILEGED_PRIVACY_ROLES = new Set(['superadmin', 'auditor_external'])

export function maskEmail(value) {
  const raw = String(value || '').trim()
  if (!raw || !raw.includes('@')) return raw ? '••••' : ''
  const [local, domain] = raw.split('@')
  const loc = local.slice(0, 1) || '•'
  const host = String(domain || '')
  const dot = host.lastIndexOf('.')
  const tld = dot > 0 ? host.slice(dot) : ''
  const stem = (dot > 0 ? host.slice(0, dot) : host).slice(0, 1) || '•'
  return `${loc}••••@${stem}••••${tld}`
}

export function maskPhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length <= 4) return '••••'
  return `•••• ${digits.slice(-2)}`
}

export function maskPersonName(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) return `${parts[0].slice(0, 1).toUpperCase()}.`
  return `${parts[0].slice(0, 1).toUpperCase()}. ${parts[parts.length - 1].slice(0, 1).toUpperCase()}.`
}

export function isPrivilegedPrivacyRole(role) {
  return PRIVILEGED_PRIVACY_ROLES.has(String(role || '').trim())
}

export function accountCompanyKey(account) {
  return String(account?.companyId || account?.company_id || account?.id || '').trim()
}

export function sameCompany(account, viewer) {
  const a = accountCompanyKey(account)
  const v = String(viewer?.companyId || viewer?.company_id || viewer?.id || '').trim()
  if (a && v && a === v) return true
  const ae = String(account?.email || '').trim().toLowerCase()
  const ve = String(viewer?.email || '').trim().toLowerCase()
  return Boolean(ae && ve && ae === ve && ae.includes('@') && !ae.includes('•'))
}

export function shouldExposeIdentifiedAccount(account, ctx = {}) {
  if (!account) return false
  if (ctx.privileged || isPrivilegedPrivacyRole(ctx.role)) return true
  if (sameCompany(account, ctx.viewer || {})) return true
  const key = accountCompanyKey(account)
  if (key && Array.isArray(ctx.grantedCompanyIds) && ctx.grantedCompanyIds.includes(key)) return true
  return false
}

export function veilAccountIdentifiedFields(account) {
  if (!account || typeof account !== 'object') return account
  const company = String(account.company || account.companyName || account.name || '').trim()
  const contact = String(account.contactName || account.fullName || '').trim()
  const nameLooksLikeCompany = company && String(account.name || '').trim() === company
  return {
    ...account,
    email: maskEmail(account.email),
    phone: maskPhone(account.phone),
    contactName: maskPersonName(account.contactName || account.contact_name),
    contact_name: maskPersonName(account.contact_name || account.contactName),
    fullName: maskPersonName(account.fullName || account.full_name),
    name: nameLooksLikeCompany ? account.name : (maskPersonName(account.name) || account.name),
    address: '',
    street: '',
    postalCode: '',
    identifiedVeiled: true,
  }
}

export function applyAccountPrivacyVeil(accounts = [], ctx = {}) {
  return (Array.isArray(accounts) ? accounts : []).map((row) => (
    shouldExposeIdentifiedAccount(row, ctx) ? row : veilAccountIdentifiedFields(row)
  ))
}

import { pickLegalCompanyName } from './companyLegalName'

export function publicLocationLabel(account) {
  return [account?.city, account?.country].filter(Boolean).join(' · ')
}

/** Company label for buyer-facing cards — never email, contact name, or a mask. */
export function publicCompanyDisplayName(account, fallback = 'Registered supplier') {
  return pickLegalCompanyName(account, fallback)
}
