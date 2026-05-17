/**
 * Canonical industry ids used by Product Hub, Equipment Hub, and industry routes
 * (`/product-hub/:id`, `/equipment-hub/:id`, `/industry/:id`).
 * Audit Management stores human-readable English labels in audit plans; this module maps to slugs for equipment/product/service category lookups.
 */

export const PLATFORM_HUB_INDUSTRY_SLUGS = [
  'automotive',
  'machinery',
  'electronics',
  'medical',
  'raw-materials',
  'oil-gas',
  'green-energy',
  'household-products',
]

/** UI / audit-plan label (English) → platform slug */
export const AUDIT_INDUSTRY_LABEL_TO_SLUG = {
  Automotive: 'automotive',
  Machinery: 'machinery',
  Electronics: 'electronics',
  Medical: 'medical',
  'Raw Materials': 'raw-materials',
  'Oil & Gas': 'oil-gas',
  'Green Energy': 'green-energy',
  'Household Products': 'household-products',
  /** Legacy audits — treat as machinery for platform maps & equipment catalog */
  Aerospace: 'machinery',
}

/** Ordered labels for Audit Pro dropdowns (matches hubs + legacy). */
export const AUDIT_INDUSTRY_LABELS_HUB_ORDER = [
  'Automotive',
  'Machinery',
  'Electronics',
  'Medical',
  'Raw Materials',
  'Oil & Gas',
  'Green Energy',
  'Household Products',
  'Aerospace',
]

export const PLATFORM_INDUSTRY_SLUG_SET = new Set(PLATFORM_HUB_INDUSTRY_SLUGS)

/** @param {string} label */
export function platformSlugFromAuditIndustryLabel(label) {
  const k = String(label || '').trim()
  if (!k) return null
  return AUDIT_INDUSTRY_LABEL_TO_SLUG[k] || null
}

/** Translation key or fixed label — same pattern as ProductHub `INDUSTRIES`. */
export const PLATFORM_HUB_INDUSTRY_META = {
  automotive: { tKey: 'industry.automotive', label: 'Automotive' },
  machinery: { tKey: 'industry.machinery', label: 'Machinery' },
  electronics: { tKey: 'industry.electronics', label: 'Electronics' },
  medical: { tKey: 'industry.medical', label: 'Medical' },
  'raw-materials': { tKey: 'industry.rawMaterials', label: 'Raw Materials' },
  'oil-gas': { tKey: 'industry.oilGas', label: 'Oil & Gas' },
  'green-energy': { tKey: 'industry.greenEnergy', label: 'Green Energy' },
  'household-products': { tKey: null, label: 'Household Products' },
}

/**
 * @param {string} slug
 * @param {(key: string) => string} t
 */
export function displayHubIndustryFromSlug(slug, t) {
  const s = String(slug || '').trim()
  const meta = PLATFORM_HUB_INDUSTRY_META[s]
  if (!meta) return s
  if (meta.tKey) return t(meta.tKey)
  return meta.label
}
