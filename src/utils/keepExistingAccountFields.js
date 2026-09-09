/**
 * Preserve supplier/company fields when a newer payload leaves them blank
 * (admin edit, RPC lag, platform refresh).
 */

const PLACEHOLDER_NAMES = new Set(['', 'company', 'new plant', '—', '-'])

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
  const company = firstFilledText(a.company, a.name, b.company, b.name)
  return {
    ...b,
    ...a,
    company: company || b.company || a.company || '',
    name: firstFilledText(a.name, b.name, company) || a.name || b.name || '',
    email: firstFilledText(a.email, b.email),
    phone: firstFilledText(a.phone, b.phone),
    website: firstFilledText(a.website, b.website),
    country: firstFilledText(a.country, b.country),
    city: firstFilledText(a.city, b.city),
    address: firstFilledText(a.address, b.address),
    contactName: firstFilledText(a.contactName, a.fullName, b.contactName, b.fullName),
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
