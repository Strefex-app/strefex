/**
 * Bridge platform Profile checkmarks ↔ Intelligent Sourcing canvas ids.
 *
 * Rule: only map what the supplier selected. Parent checkmarks unlock the
 * matching parent card(s). Subcategory checkmarks unlock only the mapped
 * subcategory cards — never invent siblings the user did not tick.
 */

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
 * Registration / Service ES expertise buckets → Intelligent Sourcing service category ids.
 * Expertise buckets remain multi-map (one checkbox covers a service family).
 */
export const SERVICE_PLATFORM_TO_SOURCING = {
  'project-management': [
    'apqp', 'engineering', 'industrialisation', 'mechdesign', 'install', 'retrofit',
    'as9100', 'airworthy', 'epc', 'dfmelec', 'packdesign',
  ],
  'supplier-services': [
    'logistics', 'industrialisation', 'install', 'obsolescence', 'rework', 'hedging',
    'packdesign',
  ],
  'quality-services': [
    'audit', 'testing', 'as9100', 'ndtserv', 'val', 'qms13485', 'ce', 'bio', 'mdr',
    'itar', 'emc', 'reachsvc', 'mattest', 'apiqual', 'weldeng', 'iecqual', 'gridcode',
    'nqasvc', 'qualtest', 'consumercert', 'qcinsp', 'inspection', 'wastesvc',
  ],
  'supplier-audit': ['audit', 'as9100', 'qms13485', 'val', 'qcinsp'],
  'supplier-selection': ['apqp', 'engineering', 'audit'],
  'rfq-management': ['apqp', 'logistics'],
  'production-followup': ['industrialisation', 'install', 'qcinsp', 'inspection'],
  'equipment-acceptance': ['install', 'testing', 'val'],
  'shipment-acceptance': ['logistics', 'qcinsp', 'inspection'],
}

/**
 * Profile subcategory checkmark → Intelligent Sourcing subcategory id(s).
 * Only these explicit mappings unlock sub-cards — never invent from the parent alone.
 */
export const PLATFORM_SUBCATEGORY_TO_SOURCING = {
  /* tooling / mold-makers */
  'auto-mold-standard': ['tool-mould'],
  'auto-mold-multi': ['tool-mould'],
  'auto-mold-tooling': ['tool-mould'],
  'auto-die-making': ['tool-die'],
  'auto-checking-fixtures': ['tool-gauge', 'tool-fixture'],
  'mach-mold-cavity': ['tool-mould'],
  'mach-die-making': ['tool-die'],
  'mach-checking-fixtures': ['tool-gauge', 'tool-fixture'],
  'mach-mold-hotrunner': ['imm-hotrunner'],
  /* injection machines */
  'auto-inj-hydraulic': ['imm-hyd'],
  'auto-inj-electric': ['imm-elec'],
  'auto-inj-hybrid': ['imm-elec', 'imm-hyd'],
  'mach-inj-hydraulic': ['imm-hyd'],
  'mach-inj-electric': ['imm-elec'],
  /* hot runner / auxiliaries */
  'auto-hot-manifold': ['imm-hotrunner'],
  'auto-hot-nozzles': ['imm-hotrunner'],
  'auto-hot-controller': ['imm-hotrunner'],
  'auto-chiller': ['imm-hotrunner'],
  'auto-cooling-tower': ['imm-hotrunner'],
  'auto-temp-unit': ['imm-hotrunner'],
  'auto-dryer-hopper': ['imm-hotrunner'],
  'auto-dryer-desiccant': ['imm-hotrunner'],
  'mach-chiller': ['imm-hotrunner'],
  'mach-tcu': ['imm-hotrunner'],
  /* CNC */
  'mach-cnc-vertical': ['cnc-vmc'],
  'mach-cnc-horizontal': ['cnc-hmc'],
  'mach-cnc-turning': ['cnc-turn'],
  /* product — plastic process → matching IS plastic part families */
  'plastic-injection': ['pl-exterior', 'pl-interior', 'pl-underhood', 'pl-lighting'],
  'blow-molding': ['pl-underhood'],
  'blow-molded-bottles': ['pl-underhood'],
  thermoforming: ['pl-exterior', 'pl-interior'],
  compression: ['pl-exterior'],
  /* IS-native passthroughs */
  'tool-mould': ['tool-mould'],
  'tool-die': ['tool-die'],
  'tool-fixture': ['tool-fixture'],
  'tool-gauge': ['tool-gauge'],
  'imm-hyd': ['imm-hyd'],
  'imm-elec': ['imm-elec'],
  'imm-large': ['imm-large'],
  'imm-multi': ['imm-multi'],
  'imm-hotrunner': ['imm-hotrunner'],
  'cnc-5ax': ['cnc-5ax'],
  'cnc-hmc': ['cnc-hmc'],
  'cnc-vmc': ['cnc-vmc'],
  'cnc-turn': ['cnc-turn'],
  'pl-exterior': ['pl-exterior'],
  'pl-interior': ['pl-interior'],
  'pl-underhood': ['pl-underhood'],
  'pl-lighting': ['pl-lighting'],
}

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

/**
 * Map Profile subcategory checkmarks to IS subcategory ids.
 * Does not invent siblings from the parent — only expands what was checked.
 */
export function expandSubcategoryIds(subIds = []) {
  return expandIds(subIds, PLATFORM_SUBCATEGORY_TO_SOURCING)
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
  return expandIds(ids, EQUIPMENT_PLATFORM_TO_SOURCING)
}

export function expandProductCategoryIds(ids = []) {
  return expandIds(ids, PRODUCT_PLATFORM_TO_SOURCING)
}

export function expandServiceCategoryIds(ids = []) {
  return expandIds(ids, SERVICE_PLATFORM_TO_SOURCING)
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
    return subs.includes(String(subcatId))
  }

  if (!categoryId) return true
  if (ids.includes(String(categoryId))) return true
  if (subs.includes(String(categoryId))) return true
  if (ids.length === 0 && subs.length === 0) return false
  return false
}
