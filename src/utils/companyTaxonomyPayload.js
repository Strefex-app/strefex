/**
 * Build company + profile taxonomy payloads so industries / categories
 * land on first-class companies columns AND metadata (map + directory sync).
 */

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asStringArray(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((v) => String(v || '').trim()).filter(Boolean))]
}

/**
 * @param {object} input
 * @returns {{
 *   industries: string[],
 *   categories: object,
 *   service_categories: string[],
 *   metadataPatch: object,
 *   companyColumns: object,
 * }}
 */
export function buildCompanyTaxonomyWrite({
  industries = [],
  categories = {},
  productCategories = {},
  equipmentSubcategories = {},
  productSubcategories = {},
  serviceCategories = [],
  accountType = null,
  accountTypes = null,
  existingMetadata = {},
} = {}) {
  const nextIndustries = asStringArray(industries)
  const nextCategories = asObject(categories)
  const nextProduct = asObject(productCategories)
  const nextEqSubs = asObject(equipmentSubcategories)
  const nextProdSubs = asObject(productSubcategories)
  const nextServices = asStringArray(serviceCategories)
  const types = asStringArray(
    Array.isArray(accountTypes) && accountTypes.length
      ? accountTypes
      : (accountType ? [accountType] : []),
  )

  const metadataPatch = {
    ...(existingMetadata && typeof existingMetadata === 'object' ? existingMetadata : {}),
    industries: nextIndustries,
    categories: nextCategories,
    product_categories: nextProduct,
    equipment_subcategories: nextEqSubs,
    product_subcategories: nextProdSubs,
    service_categories: nextServices,
  }
  if (types.length) {
    metadataPatch.account_types = types
    metadataPatch.account_type = types[0]
  } else if (accountType) {
    metadataPatch.account_type = accountType
  }

  return {
    industries: nextIndustries,
    categories: nextCategories,
    service_categories: nextServices,
    metadataPatch,
    companyColumns: {
      industries: nextIndustries,
      categories: nextCategories,
      service_categories: nextServices,
      ...(types[0] ? { account_type: types[0] } : {}),
      metadata: metadataPatch,
    },
  }
}

/** Map a list_sourcing_network_accounts RPC row → local registry account shape. */
export function sourcingNetworkRowToAccount(row) {
  if (!row) return null
  const accountTypes = Array.isArray(row.account_types)
    ? row.account_types.map(String)
    : (typeof row.account_types === 'string'
      ? (() => { try { return JSON.parse(row.account_types) } catch { return [] } })()
      : [])
  const types = accountTypes.length
    ? accountTypes
    : [String(row.account_type || 'seller')]
  const coords = Array.isArray(row.coordinates) && row.coordinates.length === 2
    ? row.coordinates
    : null
  return {
    id: row.id,
    companyId: row.id,
    email: String(row.email || '').toLowerCase(),
    company: row.company || 'Company',
    contactName: row.contact_name || '',
    accountType: String(row.account_type || types[0] || 'seller'),
    accountTypes: types,
    status: row.status === 'canceled' ? 'canceled' : 'active',
    country: row.country || '',
    city: row.city || '',
    address: row.address || '',
    industries: Array.isArray(row.industries) ? row.industries.map(String) : [],
    categories: asObject(row.categories),
    productCategories: asObject(row.product_categories),
    equipmentSubcategories: asObject(row.equipment_subcategories),
    productSubcategories: asObject(row.product_subcategories),
    serviceCategories: Array.isArray(row.service_categories)
      ? row.service_categories.map(String)
      : [],
    coordinates: coords,
    certifications: Array.isArray(row.certifications) ? row.certifications : [],
    visibilityTier: row.visibility_tier || null,
    source: 'database',
    published: Boolean(row.country || row.city),
  }
}
