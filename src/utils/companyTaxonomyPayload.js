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

function isLeafId(value) {
  const id = String(value || '').trim()
  return Boolean(id) && id !== '*' && id !== '__all__'
}

/** Count string ids in industry → parent[] / industry → parent → sub[] maps. */
export function countNestedLeafIds(value) {
  if (value == null) return 0
  if (Array.isArray(value)) return value.filter(isLeafId).length
  if (typeof value === 'object') {
    return Object.values(value).reduce((n, child) => n + countNestedLeafIds(child), 0)
  }
  return isLeafId(value) ? 1 : 0
}

export function taxonomyMapHasIds(map) {
  return countNestedLeafIds(map) > 0
}

export function preferFilledTaxonomyMap(remote, local) {
  if (taxonomyMapHasIds(remote)) return asObject(remote)
  if (taxonomyMapHasIds(local)) return asObject(local)
  return asObject(remote) && Object.keys(asObject(remote)).length
    ? asObject(remote)
    : asObject(local)
}

/** Parent categories + nested subcategory checkmarks on a registry / admin account. */
export function countAccountTaxonomy(account = {}) {
  const categories = countNestedLeafIds(account.categories)
    + countNestedLeafIds(account.productCategories || account.product_categories)
    + (Array.isArray(account.serviceCategories || account.service_categories)
      ? (account.serviceCategories || account.service_categories).filter(Boolean).length
      : 0)
  const subcategories = countNestedLeafIds(
    account.equipmentSubcategories || account.equipment_subcategories,
  ) + countNestedLeafIds(
    account.productSubcategories || account.product_subcategories,
  )
  return { categories, subcategories }
}

export function mergeIndustryParentList(existing, industryId, parents = []) {
  const next = { ...asObject(existing) }
  const id = String(industryId || '').trim()
  if (!id) return next
  const list = [...new Set((Array.isArray(parents) ? parents : []).map(String).filter(Boolean))]
  if (!list.length) {
    delete next[id]
    return next
  }
  next[id] = list
  return next
}

export function mergeIndustryNestedSubs(existing, industryId, subs = {}) {
  const next = { ...asObject(existing) }
  const id = String(industryId || '').trim()
  if (!id) return next
  const cleaned = {}
  Object.entries(asObject(subs)).forEach(([parentId, list]) => {
    const ids = (Array.isArray(list) ? list : []).map(String).filter((v) => v && v !== '*' && v !== '__all__')
    if (ids.length) cleaned[parentId] = ids
  })
  if (!Object.keys(cleaned).length) {
    delete next[id]
    return next
  }
  next[id] = cleaned
  return next
}

export function checklistFromIndustryMaps(industryId, parentMap, subMap) {
  const id = String(industryId || '').trim()
  const parents = Array.isArray(parentMap?.[id]) ? parentMap[id] : []
  const subs = (subMap?.[id] && typeof subMap[id] === 'object' && !Array.isArray(subMap[id]))
    ? subMap[id]
    : {}
  const map = {}
  parents.forEach((parentId) => {
    const key = String(parentId || '')
    if (!key) return
    map[key] = Array.isArray(subs[key]) && subs[key].length ? [...subs[key]] : ['*']
  })
  Object.entries(subs).forEach(([parentId, list]) => {
    if (!map[parentId] && Array.isArray(list) && list.length) map[parentId] = [...list]
  })
  return map
}

export function industriesFromTaxonomyMaps(...maps) {
  const ids = new Set()
  maps.forEach((map) => {
    Object.entries(asObject(map)).forEach(([ind, val]) => {
      if (Array.isArray(val) && val.filter(Boolean).length) ids.add(String(ind))
      else if (val && typeof val === 'object' && countNestedLeafIds(val) > 0) ids.add(String(ind))
    })
  })
  return [...ids]
}

/** Merge the open industry checklist into stored maps without dropping other industries. */
export function commitIndustryChecklist({
  industryId,
  productSubs = {},
  equipmentSubs = {},
  categories = {},
  productCategories = {},
  equipmentSubcategories = {},
  productSubcategories = {},
} = {}) {
  const productSan = {
    parents: Object.keys(productSubs || {}),
    subs: {},
  }
  Object.entries(productSubs || {}).forEach(([parentId, list]) => {
    const ids = (Array.isArray(list) ? list : []).filter((id) => id && id !== '*' && id !== '__all__')
    if (ids.length) productSan.subs[parentId] = ids
  })
  const equipmentSan = {
    parents: Object.keys(equipmentSubs || {}),
    subs: {},
  }
  Object.entries(equipmentSubs || {}).forEach(([parentId, list]) => {
    const ids = (Array.isArray(list) ? list : []).filter((id) => id && id !== '*' && id !== '__all__')
    if (ids.length) equipmentSan.subs[parentId] = ids
  })
  const nextCategories = mergeIndustryParentList(categories, industryId, equipmentSan.parents)
  const nextProductCategories = mergeIndustryParentList(productCategories, industryId, productSan.parents)
  const nextEquipmentSubcategories = mergeIndustryNestedSubs(
    equipmentSubcategories,
    industryId,
    equipmentSan.subs,
  )
  const nextProductSubcategories = mergeIndustryNestedSubs(
    productSubcategories,
    industryId,
    productSan.subs,
  )
  const extraIndustry = String(industryId || '').trim()
  const nextIndustries = industriesFromTaxonomyMaps(
    nextCategories,
    nextProductCategories,
    nextEquipmentSubcategories,
    nextProductSubcategories,
  )
  if (extraIndustry && !nextIndustries.includes(extraIndustry)) nextIndustries.push(extraIndustry)
  return {
    industries: nextIndustries,
    categories: nextCategories,
    productCategories: nextProductCategories,
    equipmentSubcategories: nextEquipmentSubcategories,
    productSubcategories: nextProductSubcategories,
  }
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
  const email = String(row.email || '').trim().toLowerCase()
  const accountType = String(row.account_type || 'seller').trim() || 'seller'
  let accountTypes = []
  if (Array.isArray(row.account_types)) {
    accountTypes = row.account_types.map((t) => String(t || '').trim()).filter(Boolean)
  } else if (typeof row.account_types === 'string') {
    try {
      const parsed = JSON.parse(row.account_types)
      if (Array.isArray(parsed)) accountTypes = parsed.map(String).filter(Boolean)
    } catch { /* ignore */ }
  }
  const types = accountTypes.length ? accountTypes : [accountType]
  const coords = Array.isArray(row.coordinates) && row.coordinates.length === 2
    ? row.coordinates
    : null
  const metrics = (row.sourcing_metrics && typeof row.sourcing_metrics === 'object'
    && !Array.isArray(row.sourcing_metrics))
    ? row.sourcing_metrics
    : {}
  return {
    id: row.id,
    companyId: row.id,
    email,
    company: String(row.company || '').trim() || String(row.email || '').trim() || 'Company',
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
    certifications: Array.isArray(row.certifications)
      ? row.certifications
      : (Array.isArray(metrics.certifications) ? metrics.certifications : []),
    visibilityTier: row.visibility_tier || null,
    ...metrics,
    metadata: {
      sourcing_metrics: metrics,
    },
    source: 'database',
    published: Boolean(row.country || row.city),
  }
}
