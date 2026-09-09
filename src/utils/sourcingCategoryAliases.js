/**
 * Profile ↔ Intelligent Sourcing category ids.
 *
 * Matching is 1:1: suppliers keep the same category/subcategory ids they
 * checked in Profile. Canvas taxonomy is overlaid from Profile trees
 * (see unifiedSourcingTaxonomy.js) so browse cards use those ids.
 *
 * Alias maps below are retained for documentation / legacy data only —
 * expand* helpers are identity (no fan-out), except audit service kinds.
 */

import {
  AUDIT_SERVICE_ITEM_IDS,
  AUDIT_SERVICES_CATEGORY_ID,
} from '../data/auditServices'

/** Platform equipment category → primary Intelligent Sourcing equipment category id(s). */
export const EQUIPMENT_PLATFORM_TO_SOURCING = {
  'injection-machines': ['imm'],
  'injection-appliance': ['imm'],
  'mold-makers': ['tooling'],
  tooling: ['tooling'],
  'general-equipment': ['machtool'],
  'other-equipment': ['machtool'],
  robots: ['robot'],
  presses: ['press'],
  automation: ['robot'],
  'automation-general': ['robot'],
  testing: ['metrology'],
  'testing-general': ['metrology'],
  'testing-inspection': ['metrology'],
  'testing-consumer': ['testers'],
  cnc: ['cnc'],
  lathes: ['cnc'],
  mills: ['cnc'],
  grinders: ['cnc'],
  'hot-runner': ['imm'],
  coolers: ['imm'],
  dryer: ['imm'],
  conveyors: ['handling'],
  molding: ['imm'],
  sterilisation: ['sterile'],
  sterilization: ['sterile'],
  packaging: ['packaging'],
  'packaging-lines': ['packline'],
  inspection: ['metrology'],
  'clean-room': ['cleanroom'],
  pcb: ['smtline'],
  smt: ['smtline'],
  test: ['testers'],
  soldering: ['smtline'],
  encapsulation: ['cleanassy'],
  'electronics-consumer': ['smtline'],
  mill5: ['mill5'],
  ndt: ['ndt'],
  autoclave: ['autoclave'],
  am: ['am'],
  plastic: ['silo'],
  metal: ['cutservice'],
  chemical: ['labmat'],
  rubber: ['silo'],
  composites: ['cutservice'],
  ceramics: ['labmat'],
  adhesives: ['labmat'],
  coatings: ['paintline'],
  'other-materials': ['cutservice'],
  cutservice: ['cutservice'],
  silo: ['silo'],
  labmat: ['labmat'],
  drilling: ['weldauto'],
  pumps: ['weldauto'],
  valves: ['weldauto'],
  pipelines: ['weldauto'],
  separators: ['hpTest'],
  wellhead: ['weldauto'],
  refining: ['weldauto'],
  instrumentation: ['hpTest'],
  'safety-systems': ['hpTest'],
  subsea: ['weldauto'],
  'storage-tanks': ['weldauto'],
  weldauto: ['weldauto'],
  hpTest: ['hpTest'],
  ndtog: ['ndtog'],
  'solar-panels': ['laminate'],
  'wind-turbines': ['laminate'],
  inverters: ['formation'],
  'battery-storage': ['packassy'],
  'ev-charging': ['packassy'],
  hydrogen: ['formation'],
  biomass: ['formation'],
  'heat-pumps': ['packassy'],
  'grid-equipment': ['formation'],
  monitoring: ['formation'],
  'cables-connectors': ['packassy'],
  'mounting-structures': ['laminate'],
  laminate: ['laminate'],
  packassy: ['packassy'],
  formation: ['formation'],
  'appliance-assembly': ['assyhouse'],
  'stamping-consumer': ['press'],
  'motor-drives-small': ['assyhouse'],
  'coating-finishing-consumer': ['paintline'],
  packline: ['packline'],
  assyhouse: ['assyhouse'],
  printdeco: ['printdeco'],
  'reactor-pressure': ['remotehand'],
  'fuel-storage': ['remotehand'],
  'radiation-monitoring': ['decontam'],
  'nuclear-welding-nde': ['remotehand'],
  'nuclear-fabrication-assembly': ['remotehand'],
  'pipe-spool-fabrication': ['remotehand'],
  'pressure-leak-test': ['decontam'],
  'nde-test-equipment': ['decontam'],
  'electrical-ica-test': ['decontam'],
  'materials-lab-testers': ['labmat'],
  remotehand: ['remotehand'],
  decontam: ['decontam'],
  machtool: ['machtool'],
  weldcell: ['weldcell'],
  paintline: ['paintline'],
  testrig: ['testrig'],
  handling: ['handling'],
  smtline: ['smtline'],
  testers: ['testers'],
  cleanassy: ['cleanassy'],
  depanel: ['depanel'],
  cleanroom: ['cleanroom'],
  sterile: ['sterile'],
  micro: ['micro'],
  imm: ['imm'],
  robot: ['robot'],
  press: ['press'],
  metrology: ['metrology'],
}

/** Platform product parent → primary IS product parent id(s). */
export const PRODUCT_PLATFORM_TO_SOURCING = {
  plastic: ['plastic'],
  metal: ['metal'],
  rubber: ['rubber'],
  glass: ['glass'],
  composites: ['composite'],
  composite: ['composite'],
  'electronics-assembly': ['electronics'],
  electronics: ['electronics'],
  textile: ['textile'],
  ceramics: ['ceramics'],
  'plastic-resins': ['resins'],
  'metals-alloys': ['steelmat'],
  'rubber-elastomers': ['rubber'],
  chemicals: ['chemicals'],
  'composites-fibers': ['composite'],
  adhesives: ['chemicals'],
  coatings: ['chemicals'],
  'kitchen-appliances': ['smallappl'],
  'home-electronics': ['smallappl'],
  'plastic-housewares': ['kitchenware'],
  'cleaning-care-products': ['packagingcons'],
  'furniture-home-components': ['sheet'],
  'ssc-supply': ['nqasafety'],
  'nuclear-oem-manufacturing': ['nqasafety'],
  'pipes-piping-systems': ['pipefit'],
  'materials-mill-products': ['steelmat'],
  'spare-parts-consumables': ['instrumentation'],
  structural: ['structural'],
  aerocomp: ['aerocomp'],
  fasteners: ['fasteners'],
  harness: ['harness'],
  castings: ['castings'],
  moulded: ['moulded'],
  extruded: ['extruded'],
  implant: ['implant'],
  singleuse: ['singleuse'],
  electmed: ['electmed'],
  weldments: ['weldments'],
  gears: ['gears'],
  hydraulic: ['hydraulic'],
  elecpanel: ['elecpanel'],
  sheet: ['sheet'],
  pcba: ['pcba'],
  cableharness: ['cableharness'],
  displaymod: ['displaymod'],
  sensors: ['sensors'],
  powerelec: ['powerelec'],
  steelmat: ['steelmat'],
  almat: ['almat'],
  resins: ['resins'],
  valves: ['valves'],
  pipefit: ['pipefit'],
  pressvessel: ['pressvessel'],
  subsea: ['subsea'],
  pvmount: ['pvmount'],
  windparts: ['windparts'],
  batterypack: ['batterypack'],
  hydrogen: ['hydrogen'],
  nqasafety: ['nqasafety'],
  shielding: ['shielding'],
  instrumentation: ['instrumentation'],
  smallappl: ['smallappl'],
  kitchenware: ['kitchenware'],
  packagingcons: ['packagingcons'],
  textilehome: ['textilehome'],
}

/**
 * @deprecated Service expertise is 1:1 with Profile buckets (project-management,
 * supplier-services, quality-services). Maps kept for reference only.
 */
export const SERVICE_PLATFORM_TO_SOURCING = {
  'project-management': ['project-management'],
  'supplier-services': ['supplier-services'],
  'quality-services': ['quality-services'],
  'audit-services': ['audit-services'],
  'supplier-audit': ['audit-services', 'supplier-audit'],
  'process-audit': ['audit-services', 'process-audit'],
  'system-audit': ['audit-services', 'system-audit'],
  'product-audit': ['audit-services', 'product-audit'],
  'environmental-audit': ['audit-services', 'environmental-audit'],
  'social-compliance-audit': ['audit-services', 'social-compliance-audit'],
  'pre-shipment-audit': ['audit-services', 'pre-shipment-audit'],
  'special-process-audit': ['audit-services', 'special-process-audit'],
  'supplier-selection': ['project-management'],
  'rfq-management': ['project-management'],
  'production-followup': ['supplier-services'],
  'equipment-acceptance': ['supplier-services'],
  'shipment-acceptance': ['supplier-services'],
}

/** @deprecated Subcategory expand is identity; kept empty for callers that still import it. */
export const PLATFORM_SUBCATEGORY_TO_SOURCING = {}

/** @deprecated retained for callers; parents no longer invent subcategory lists */
export const SOURCING_PARENT_TO_SUBCATS = {
  tooling: ['tool-mould', 'tool-die', 'tool-fixture', 'tool-gauge'],
  'mold-makers': ['tool-mould', 'tool-die', 'tool-fixture', 'tool-gauge'],
  imm: ['imm-hyd', 'imm-elec', 'imm-large', 'imm-multi', 'imm-hotrunner'],
  'injection-machines': ['imm-hyd', 'imm-elec', 'imm-large', 'imm-multi', 'imm-hotrunner'],
  cnc: ['cnc-5ax', 'cnc-hmc', 'cnc-vmc', 'cnc-turn'],
  plastic: ['pl-exterior', 'pl-interior', 'pl-underhood', 'pl-lighting'],
}

/** @deprecated use SOURCING_PARENT_TO_SUBCATS */
export const EQUIPMENT_PARENT_DEFAULT_SUBCATS = SOURCING_PARENT_TO_SUBCATS

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

/** Keep Profile ids as-is (1:1 with sourcing browse cards). */
function identityIds(ids = []) {
  return [...new Set(
    (Array.isArray(ids) ? ids : [])
      .map((raw) => String(raw || '').trim())
      .filter(Boolean),
  )]
}

/**
 * Profile subcategory checkmarks → sourcing subcategory ids (identity).
 */
export function expandSubcategoryIds(subIds = []) {
  return identityIds(subIds)
}

/**
 * @deprecated Prefer expandSubcategoryIds(existingSubs).
 * Parents no longer auto-expand into every child subcategory.
 */
export function expandParentDefaultSubcategoryIds(_parentIds = [], existingSubs = []) {
  return expandSubcategoryIds(existingSubs)
}

/** @deprecated use expandParentDefaultSubcategoryIds / expandSubcategoryIds */
export function expandEquipmentSubcategoryIds(parentIds = [], existingSubs = []) {
  return expandParentDefaultSubcategoryIds(parentIds, existingSubs)
}

export function expandEquipmentCategoryIds(ids = []) {
  return identityIds(ids)
}

export function expandProductCategoryIds(ids = []) {
  return identityIds(ids)
}

function normalizeServiceCategoryId(raw) {
  const id = String(raw || '').trim()
  if (id.startsWith('svc:audit:')) return id.slice('svc:audit:'.length)
  return id
}

export function expandServiceCategoryIds(ids = []) {
  const out = new Set()
  identityIds(ids).forEach((raw) => {
    const id = normalizeServiceCategoryId(raw)
    if (id) out.add(id)
  })
  const hasKind = AUDIT_SERVICE_ITEM_IDS.some((k) => out.has(k))
  const hasParent = out.has(AUDIT_SERVICES_CATEGORY_ID)
  if (hasParent && !hasKind) {
    AUDIT_SERVICE_ITEM_IDS.forEach((k) => out.add(k))
  }
  if (hasKind) out.add(AUDIT_SERVICES_CATEGORY_ID)
  return [...out]
}

export function accountHasSellerRole(account) {
  return collectAccountTypes(account).has('seller')
}

export function accountHasServiceProviderRole(account) {
  return collectAccountTypes(account).has('service_provider')
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
 * Match Intelligent Sourcing category / subcategory to registered account ids.
 * Category (no sub): parent membership is enough.
 * Subcategory: requires an explicit mapped subcategory id (checkmarks only).
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
    ].map((id) => normalizeServiceCategoryId(id)).filter(Boolean)
    if (subcatId) return serviceIds.includes(normalizeServiceCategoryId(subcatId))
    return serviceIds.includes(normalizeServiceCategoryId(categoryId))
  }

  if (!types.has('seller')) return false

  const domainIds = domain === 'equipment'
    ? (supplier.equipmentCategoryIds || supplier.categoryIds || [])
    : (supplier.productCategoryIds || supplier.categoryIds || [])
  const ids = domainIds.map(String)
  const subs = (supplier.subcategoryIds || []).map(String)

  if (subcatId) {
    return subs.includes(String(subcatId))
  }

  if (!categoryId) return true
  if (ids.includes(String(categoryId))) return true
  if (subs.includes(String(categoryId))) return true
  if (ids.length === 0 && subs.length === 0) return false
  return false
}
