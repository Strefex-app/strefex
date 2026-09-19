/**
 * Company legal name vs contact person — registration and display standard.
 * Buyers and the map show the legal entity, never the login contact or email.
 */

const PLACEHOLDER = new Set(['', 'company', 'new plant', 'business', 'supplier', 'registered supplier', '—', '-'])

const LEGAL_ENTITY_RE = /\b(gmbh|ag|kg|ug|ek|e\.k\.|ltd|limited|llc|inc|corp|plc|llp|lp|sa|sas|sarl|bv|nv|oy|ab|as|aps|srl|spa|s\.p\.a\.|kk|co\.?|company|holding|group|industries|manufacturing|mfg|tools|gmbh\s*&\s*co|ooo|ao|pjsc|jsc|pty|bhd|sdn|oü|uab|sp\.\s*z\s*o\.o)\b/i

export function normalizeComparableName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[.,'"()]/g, '')
    .replace(/\s+/g, ' ')
}

export function looksLikeEmailValue(value) {
  const s = String(value || '').trim()
  if (!s || s.includes('•')) return Boolean(s)
  return s.includes('@') && !/\s/.test(s)
}

export function namesMatch(a, b) {
  const left = normalizeComparableName(a)
  const right = normalizeComparableName(b)
  return Boolean(left && right && left === right)
}

export function hasLegalEntityToken(value) {
  return LEGAL_ENTITY_RE.test(String(value || ''))
}

function emailLocalPart(email) {
  const raw = String(email || '').trim().toLowerCase()
  if (!raw.includes('@')) return ''
  return raw.split('@')[0].replace(/[._-]+/g, ' ')
}

function contactHints(ctx = {}) {
  return [
    ctx.contactName,
    ctx.contact_name,
    ctx.fullName,
    ctx.full_name,
    ctx.email,
    emailLocalPart(ctx.email),
  ].map((v) => String(v || '').trim()).filter(Boolean)
}

export function isContactLikeLabel(value, ctx = {}) {
  const label = String(value || '').trim()
  if (!label) return true
  if (PLACEHOLDER.has(normalizeComparableName(label))) return true
  if (looksLikeEmailValue(label) || label.includes('•')) return true
  if (hasLegalEntityToken(label)) return false
  return contactHints(ctx).some((hint) => namesMatch(label, hint) || namesMatch(label, emailLocalPart(hint)))
}

/**
 * @returns {string|null} error message, or null if the legal name is acceptable
 */
export function companyLegalNameError(companyName, ctx = {}) {
  const label = String(companyName || '').trim()
  if (label.length < 2) return 'Enter the company legal name (not the contact person’s name).'
  if (looksLikeEmailValue(label)) return 'Company name cannot be an email address.'
  if (isContactLikeLabel(label, ctx)) {
    return 'Company legal name must be different from the contact name and email. Use the registered company name.'
  }
  return null
}

export function pickLegalCompanyName(account = {}, fallback = 'Registered supplier') {
  const ctx = {
    contactName: account.contactName || account.contact_name,
    fullName: account.fullName || account.full_name,
    email: account.email,
  }
  const candidates = [
    account.company,
    account.companyName,
    account.company_name,
  ]
  for (const raw of candidates) {
    const label = String(raw || '').trim()
    if (!label) continue
    if (isContactLikeLabel(label, ctx)) continue
    if (normalizeComparableName(label) === 'company') continue
    return label
  }
  const name = String(account.name || '').trim()
  if (name && !isContactLikeLabel(name, ctx) && normalizeComparableName(name) !== 'company') {
    return name
  }
  return fallback
}

export function contactPersonName(account = {}) {
  const person = String(
    account.contactName
    || account.contact_name
    || account.fullName
    || account.full_name
    || '',
  ).trim()
  if (person && !looksLikeEmailValue(person)) return person
  return ''
}

/** Persist company (legal entity) separately from contact (person). */
export function applyCompanyNamingStandard(account) {
  if (!account || typeof account !== 'object') return account
  const contact = contactPersonName(account)
  const legal = pickLegalCompanyName(account, '')
  if (
    account.company === legal
    && (account.companyName || '') === (legal || account.companyName || '')
    && (account.name || '') === (legal || '')
    && (account.contactName || '') === contact
  ) {
    return account
  }
  return {
    ...account,
    company: legal,
    companyName: legal || account.companyName || '',
    name: legal || '',
    contactName: contact || '',
    fullName: account.fullName || contact || '',
  }
}

export function slugifyCompanyLegalName(name) {
  return String(name || 'company')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'company'
}
