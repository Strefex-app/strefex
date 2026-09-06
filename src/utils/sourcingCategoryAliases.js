/**
 * Bridge platform registration / registry category ids ↔ Intelligent Sourcing canvas ids.
 * Keeps sellers out of service pools and maps service expertise onto IS service categories.
 */

/** Platform equipment category → Intelligent Sourcing equipment category */
export const EQUIPMENT_PLATFORM_TO_SOURCING = {
  'injection-machines': ['imm'],
  'mold-makers': ['tooling'],
  robots: ['robot'],
  presses: ['press'],
  automation: ['robot', 'assembly'],
  'automation-general': ['robot', 'assembly'],
  testing: ['metrology'],
  'testing-general': ['metrology'],
  cnc: ['cnc'],
  'hot-runner': ['tooling', 'imm'],
  coolers: ['tooling'],
  dryer: ['tooling'],
  conveyors: ['assembly'],
  tooling: ['tooling'],
  mills: ['cnc'],
  lathes: ['cnc'],
  grinders: ['cnc'],
  molding: ['imm', 'cleanroom'],
  sterilisation: ['sterile'],
  sterilization: ['sterile'],
  packaging: ['packaging'],
  inspection: ['metrology'],
  pcb: ['assembly'],
  smt: ['assembly'],
  soldering: ['assembly'],
}

/** Platform product parent → IS product parent (mostly 1:1; fix known drifts) */
export const PRODUCT_PLATFORM_TO_SOURCING = {
  composites: ['composite'],
  composite: ['composite'],
  'electronics-assembly': ['electronics'],
  electronics: ['electronics'],
}

/**
 * Registration / Service ES expertise buckets → Intelligent Sourcing service category ids.
 * Broad buckets intentionally expand so a registered provider appears under related IS cards.
 */
export const SERVICE_PLATFORM_TO_SOURCING = {
  'project-management': [
    'apqp', 'engineering', 'industrialisation', 'mechdesign', 'install', 'retrofit',
    'as9100', 'airworthy', 'epc', 'dfmelec',
  ],
  'supplier-services': [
    'logistics', 'industrialisation', 'install', 'obsolescence', 'rework', 'hedging',
  ],
  'quality-services': [
    'audit', 'testing', 'as9100', 'ndtserv', 'val', 'qms13485', 'ce', 'bio', 'mdr',
    'itar', 'emc', 'reachsvc', 'mattest', 'apiqual', 'weldeng', 'iecqual', 'gridcode',
    'nqasvc', 'qualtest', 'consumercert', 'qcinsp', 'inspection',
  ],
  'supplier-audit': ['audit', 'as9100', 'qms13485', 'val'],
  'supplier-selection': ['apqp', 'engineering', 'audit'],
  'rfq-management': ['apqp', 'logistics'],
  'production-followup': ['industrialisation', 'install', 'qcinsp', 'inspection'],
  'equipment-acceptance': ['install', 'testing', 'val'],
  'shipment-acceptance': ['logistics', 'qcinsp', 'inspection'],
}

/** Intelligent Sourcing industry id → display name used in the canvas INDUSTRIES list */
export const SOURCING_INDUSTRY_LABELS = {
  automotive: 'Automotive',
  aerospace: 'Aerospace & Defence',
  medical: 'Medical Devices',
  machinery: 'Machinery & Industrial',
  electronics: 'Electronics',
  rawmat: 'Raw Materials',
  oilgas: 'Oil & Gas',
  energy: 'Green Energy',
  nuclear: 'Nuclear',
  household: 'Household Products',
}

function expandIds(ids, aliasMap) {
  const out = new Set()
  ;(Array.isArray(ids) ? ids : []).forEach((raw) => {
    const id = String(raw || '').trim()
    if (!id) return
    out.add(id)
    const aliases = aliasMap[id]
    if (Array.isArray(aliases)) aliases.forEach((a) => out.add(String(a)))
  })
  return [...out]
}

export function expandEquipmentCategoryIds(ids = []) {
  return expandIds(ids, EQUIPMENT_PLATFORM_TO_SOURCING)
}

export function expandProductCategoryIds(ids = []) {
  return expandIds(ids, PRODUCT_PLATFORM_TO_SOURCING)
}

export function expandServiceCategoryIds(ids = []) {
  return expandIds(ids, SERVICE_PLATFORM_TO_SOURCING)
}

/** True when account types include seller (manufacturer). */
export function accountHasSellerRole(account) {
  const types = collectAccountTypes(account)
  return types.has('seller')
}

/** True when account types include service_provider. */
export function accountHasServiceProviderRole(account) {
  const types = collectAccountTypes(account)
  return types.has('service_provider')
}

export function collectAccountTypes(account) {
  const types = new Set()
  const primary = String(account?.accountType || account?.account_type || '').toLowerCase()
  if (primary) types.add(primary)
  const arr = account?.accountTypes || account?.account_types
  if (Array.isArray(arr)) {
    arr.forEach((t) => {
      const id = String(t || '').toLowerCase()
      if (id) types.add(id)
    })
  }
  return types
}

/**
 * Does supplier row match an Intelligent Sourcing category selection?
 * @param {object} supplier sourcing row
 * @param {'product'|'equipment'|'service'} domain
 * @param {string|null} categoryId
 * @param {string|null} subcatId
 */
export function sourcingSupplierMatchesDomainCategory(supplier, domain, categoryId, subcatId = null) {
  if (!supplier) return false
  const types = new Set(
    (Array.isArray(supplier.accountTypes) && supplier.accountTypes.length
      ? supplier.accountTypes
      : [supplier.accountType || 'seller']
    ).map((t) => String(t || '').toLowerCase()).filter(Boolean),
  )

  if (domain === 'service') {
    if (!types.has('service_provider') && !types.has('auditor')) return false
    if (!categoryId) return true
    const serviceIds = [
      ...(supplier.serviceCategoryIds || []),
      ...(supplier.categoryIds || []),
    ].map(String)
    return serviceIds.includes(String(categoryId))
  }

  if (!types.has('seller')) return false

  const domainIds = domain === 'equipment'
    ? (supplier.equipmentCategoryIds || supplier.categoryIds || [])
    : (supplier.productCategoryIds || supplier.categoryIds || [])
  const ids = domainIds.map(String)
  const subs = (supplier.subcategoryIds || []).map(String)

  if (subcatId) {
    if (subs.includes(String(subcatId))) return true
    if (categoryId && (ids.includes(String(categoryId)) || subs.includes(String(categoryId)))) {
      const explicitSubs = subs.filter((id) => (
        id !== String(categoryId) && id !== '*' && id !== '__all__'
      ))
      if (explicitSubs.length === 0 || subs.includes('*') || subs.includes('__all__')) return true
    }
    return false
  }

  if (!categoryId) return true
  if (ids.includes(String(categoryId))) return true
  if (subs.includes(String(categoryId))) return true
  /* Registered seller with no category picks yet: hide from specific category lists */
  if (ids.length === 0 && subs.length === 0) return false
  return false
}
