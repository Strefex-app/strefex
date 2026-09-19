/**
 * Preserve supplier/company fields when a newer payload leaves them blank
 * (admin edit, RPC lag, platform refresh).
 *
 * Identified personal data (email, phone, address, contact name) follows the
 * incoming payload when that payload includes the key — so a redacted network
 * RPC cannot be undone from stale localStorage (GDPR / PIPL / CCPA / 152-FZ).
 */

import { IDENTIFIED_ACCOUNT_FIELDS } from './accountPrivacy'

const PLACEHOLDER_NAMES = new Set(['', 'company', 'new plant', '—', '-'])

function isIdentifiedEmpty(value) {
  if (value == null) return true
  const s = String(value).trim()
  return !s || s.includes('•')
}

/** Incoming wins when it sent the key (including empty/redacted). Otherwise keep existing. */
export function mergeIdentifiedText(incoming = {}, existing = {}, keys = []) {
  const a = incoming && typeof incoming === 'object' ? incoming : {}
  const b = existing && typeof existing === 'object' ? existing : {}
  const sent = keys.filter((k) => Object.prototype.hasOwnProperty.call(a, k))
  if (!sent.length) return firstFilledText(...keys.map((k) => b[k]))
  for (const k of sent) {
    if (isIdentifiedEmpty(a[k])) return ''
    return String(a[k]).trim()
  }
  return ''
}

export function firstFilledText(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim()
    if (!s) continue
    if (PLACEHOLDER_NAMES.has(s.toLowerCase())) continue
    return s
  }
  return ''
}

export function firstFilledArray(...vals) {
  for (const v of vals) {
    if (Array.isArray(v) && v.length) return v
  }
  return []
}

export function firstFilledObject(...vals) {
  for (const v of vals) {
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) return v
  }
  return {}
}

/**
 * Overlay `incoming` onto `existing`, but never replace a filled value with empty.
 */
export function mergeAccountsPreferFilled(incoming = {}, existing = {}) {
  const a = incoming && typeof incoming === 'object' ? incoming : {}
  const b = existing && typeof existing === 'object' ? existing : {}
  const company = firstFilledText(a.company, a.companyName, b.company, b.companyName)
  const email = mergeIdentifiedText(a, b, ['email'])
  const phone = mergeIdentifiedText(a, b, ['phone'])
  const address = mergeIdentifiedText(a, b, ['address', 'street'])
  const contactName = mergeIdentifiedText(a, b, ['contactName', 'contact_name', 'fullName', 'full_name'])
  const identified = {}
  IDENTIFIED_ACCOUNT_FIELDS.forEach((key) => {
    if (key === 'email' || key === 'phone' || key === 'address' || key === 'street'
      || key === 'contactName' || key === 'contact_name' || key === 'fullName' || key === 'full_name') {
      return
    }
    identified[key] = mergeIdentifiedText(a, b, [key])
  })
  return {
    ...b,
    ...a,
    company: company || b.company || a.company || '',
    name: company || firstFilledText(a.company, a.companyName, b.company, b.companyName) || '',
    email,
    phone,
    website: firstFilledText(a.website, b.website),
    country: firstFilledText(a.country, b.country),
    city: firstFilledText(a.city, b.city),
    address,
    street: address ? (mergeIdentifiedText(a, b, ['street']) || '') : '',
    contactName,
    contact_name: contactName,
    fullName: contactName,
    ...identified,
    industries: firstFilledArray(a.industries, b.industries),
    categories: firstFilledObject(a.categories, b.categories),
    productCategories: firstFilledObject(a.productCategories, b.productCategories),
    equipmentSubcategories: firstFilledObject(a.equipmentSubcategories, b.equipmentSubcategories),
    productSubcategories: firstFilledObject(a.productSubcategories, b.productSubcategories),
    serviceCategories: firstFilledArray(a.serviceCategories, a.service_categories, b.serviceCategories, b.service_categories),
    accountTypes: firstFilledArray(a.accountTypes, a.account_types, b.accountTypes, b.account_types),
    certifications: firstFilledArray(a.certifications, b.certifications),
    receivingPlants: firstFilledArray(a.receivingPlants, b.receivingPlants),
    metadata: {
      ...(b.metadata || {}),
      ...(a.metadata || {}),
      sourcing_metrics: {
        ...((b.metadata && b.metadata.sourcing_metrics) || {}),
        ...((a.metadata && a.metadata.sourcing_metrics) || {}),
      },
    },
  }
}

/** Drop keys that would clear an existing company column. */
export function omitEmptyCompanyScalars(payload = {}, existing = {}) {
  const out = { ...payload }
  const keys = ['email', 'phone', 'website', 'country', 'city', 'address']
  keys.forEach((k) => {
    const next = out[k]
    const empty = next == null || (typeof next === 'string' && !String(next).trim())
    if (empty && firstFilledText(existing[k], existing.metadata?.[k])) {
      delete out[k]
    }
  })
  const nextName = String(out.name || '').trim()
  if (!nextName) {
    const keep = firstFilledText(existing.name, existing.company)
    if (keep) out.name = keep
    else delete out.name
  }
  if (Array.isArray(out.industries) && !out.industries.length) {
    const keep = firstFilledArray(existing.industries)
    if (keep.length) out.industries = keep
  }
  if (Array.isArray(out.service_categories) && !out.service_categories.length) {
    const keep = firstFilledArray(existing.service_categories, existing.serviceCategories)
    if (keep.length) out.service_categories = keep
  }
  return out
}
