/**
 * Bridge platform registration / registry category ids ↔ Intelligent Sourcing canvas ids.
 * A registered parent category expands to every related IS category + subcategory so the
 * account appears in each matching product / equipment / service search.
 */

/** Platform equipment category → Intelligent Sourcing equipment category ids (all industries). */
export const EQUIPMENT_PLATFORM_TO_SOURCING = {
  /* shared / automotive / machinery */
  'injection-machines': ['imm', 'micro', 'cleanroom'],
  'injection-appliance': ['imm', 'packline'],
  'mold-makers': ['tooling'],
  tooling: ['tooling'],
  'general-equipment': ['machtool', 'handling'],
  'other-equipment': ['machtool', 'handling'],
  robots: ['robot', 'handling', 'weldcell'],
  presses: ['press'],
  automation: ['robot', 'assembly', 'handling', 'weldcell', 'assyhouse'],
  'automation-general': ['robot', 'assembly', 'handling'],
  testing: ['metrology', 'testrig', 'testers'],
  'testing-general': ['metrology', 'testrig', 'testers'],
  'testing-inspection': ['metrology', 'hpTest', 'ndtog', 'testrig'],
  'testing-consumer': ['testers', 'assyhouse'],
  cnc: ['cnc', 'machtool', 'mill5'],
  lathes: ['cnc', 'machtool'],
  mills: ['cnc', 'machtool', 'mill5'],
  grinders: ['cnc', 'machtool'],
  'hot-runner': ['tooling', 'imm'],
  coolers: ['tooling', 'imm'],
  dryer: ['tooling', 'imm', 'silo'],
  conveyors: ['assembly', 'handling', 'packline'],
  /* medical */
  molding: ['imm', 'cleanroom', 'micro'],
  sterilisation: ['sterile'],
  sterilization: ['sterile'],
  packaging: ['packaging', 'packline'],
  'packaging-lines': ['packline', 'packaging'],
  inspection: ['metrology', 'testers'],
  'clean-room': ['cleanroom', 'cleanassy'],
  /* electronics */
  pcb: ['smtline', 'depanel', 'cleanassy'],
  smt: ['smtline'],
  test: ['testers'],
  soldering: ['smtline', 'cleanassy'],
  encapsulation: ['cleanassy', 'packaging'],
  'electronics-consumer': ['smtline', 'testers', 'assyhouse'],
  /* aerospace-style */
  mill5: ['mill5', 'cnc'],
  ndt: ['ndt', 'ndtog', 'metrology'],
  autoclave: ['autoclave'],
  am: ['am'],
  /* raw materials equipment */
  plastic: ['silo', 'cutservice'],
  metal: ['cutservice'],
  chemical: ['silo', 'labmat'],
  rubber: ['silo'],
  composites: ['cutservice', 'autoclave'],
  ceramics: ['labmat'],
  adhesives: ['labmat'],
  coatings: ['paintline', 'labmat'],
  'other-materials': ['cutservice', 'labmat'],
  cutservice: ['cutservice'],
  silo: ['silo'],
  labmat: ['labmat'],
  /* oil & gas */
  drilling: ['weldauto', 'hpTest'],
  pumps: ['weldauto', 'hpTest'],
  valves: ['weldauto', 'hpTest'],
  pipelines: ['weldauto'],
  separators: ['hpTest'],
  wellhead: ['weldauto', 'hpTest'],
  refining: ['weldauto', 'hpTest'],
  instrumentation: ['hpTest', 'ndtog'],
  'safety-systems': ['hpTest'],
  subsea: ['weldauto', 'ndtog'],
  'storage-tanks': ['weldauto', 'hpTest'],
  weldauto: ['weldauto', 'weldcell'],
  hpTest: ['hpTest'],
  ndtog: ['ndtog', 'ndt'],
  /* green energy */
  'solar-panels': ['laminate', 'formation'],
  'wind-turbines': ['laminate', 'packassy'],
  inverters: ['formation', 'packassy'],
  'battery-storage': ['packassy', 'formation'],
  'ev-charging': ['packassy', 'formation'],
  hydrogen: ['formation', 'packassy'],
  biomass: ['formation'],
  'heat-pumps': ['packassy'],
  'grid-equipment': ['formation'],
  monitoring: ['formation', 'testers'],
  'cables-connectors': ['packassy'],
  'mounting-structures': ['laminate'],
  laminate: ['laminate'],
  packassy: ['packassy'],
  formation: ['formation'],
  /* household */
  'appliance-assembly': ['assyhouse', 'packline'],
  'stamping-consumer': ['press', 'assyhouse'],
  'motor-drives-small': ['assyhouse'],
  'coating-finishing-consumer': ['paintline', 'printdeco'],
  packline: ['packline'],
  assyhouse: ['assyhouse'],
  printdeco: ['printdeco'],
  /* nuclear */
  'reactor-pressure': ['remotehand', 'decontam'],
  'fuel-storage': ['remotehand'],
  'radiation-monitoring': ['decontam'],
  'nuclear-welding-nde': ['remotehand', 'decontam'],
  'nuclear-fabrication-assembly': ['remotehand'],
  'pipe-spool-fabrication': ['remotehand', 'weldauto'],
  'pressure-leak-test': ['decontam', 'hpTest'],
  'nde-test-equipment': ['decontam', 'ndt'],
  'electrical-ica-test': ['decontam', 'testers'],
  'materials-lab-testers': ['labmat', 'decontam'],
  remotehand: ['remotehand'],
  decontam: ['decontam'],
  /* machinery IS-native */
  machtool: ['machtool', 'cnc'],
  weldcell: ['weldcell', 'weldauto'],
  paintline: ['paintline'],
  testrig: ['testrig', 'metrology'],
  handling: ['handling', 'assembly', 'robot'],
  /* electronics IS-native */
  smtline: ['smtline'],
  testers: ['testers'],
  cleanassy: ['cleanassy', 'cleanroom'],
  depanel: ['depanel'],
  /* medical IS-native */
  cleanroom: ['cleanroom'],
  sterile: ['sterile'],
  micro: ['micro', 'imm'],
}

/** Platform product parent → IS product parent ids (all industries). */
export const PRODUCT_PLATFORM_TO_SOURCING = {
  plastic: ['plastic', 'moulded', 'extruded', 'smallappl', 'packagingcons', 'kitchenware'],
  metal: ['metal', 'structural', 'weldments', 'sheet', 'gears', 'fasteners', 'castings', 'valves', 'pipefit', 'pressvessel'],
  rubber: ['rubber'],
  glass: ['glass'],
  composites: ['composite', 'aerocomp'],
  composite: ['composite', 'aerocomp'],
  'electronics-assembly': ['electronics', 'pcba', 'cableharness', 'sensors', 'powerelec', 'electmed', 'harness'],
  electronics: ['electronics', 'pcba', 'cableharness', 'sensors', 'powerelec'],
  textile: ['textile', 'textilehome'],
  ceramics: ['ceramics'],
  'plastic-resins': ['resins', 'plastic'],
  'metals-alloys': ['steelmat', 'almat', 'metal'],
  'rubber-elastomers': ['rubber'],
  chemicals: ['chemicals'],
  'composites-fibers': ['composite', 'aerocomp'],
  adhesives: ['chemicals'],
  coatings: ['chemicals'],
  'kitchen-appliances': ['smallappl', 'kitchenware'],
  'home-electronics': ['smallappl', 'displaymod', 'pcba'],
  'plastic-housewares': ['kitchenware', 'packagingcons', 'plastic'],
  'cleaning-care-products': ['packagingcons', 'chemicals'],
  'furniture-home-components': ['sheet', 'weldments', 'textilehome'],
  'ssc-supply': ['nqasafety', 'shielding', 'instrumentation'],
  'nuclear-oem-manufacturing': ['nqasafety', 'shielding', 'instrumentation'],
  'pipes-piping-systems': ['pipefit', 'pressvessel', 'valves'],
  'materials-mill-products': ['steelmat', 'almat', 'shielding'],
  'spare-parts-consumables': ['instrumentation', 'nqasafety'],
  /* IS-native product ids (passthrough) */
  structural: ['structural'],
  aerocomp: ['aerocomp'],
  fasteners: ['fasteners'],
  harness: ['harness', 'cableharness'],
  castings: ['castings'],
  moulded: ['moulded', 'plastic'],
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
 * Parent category → all Intelligent Sourcing subcategory ids under that parent.
 * Selecting a parent (or any of its platform aliases) makes the account visible on every sub search.
 */
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

/**
 * Expand registered parents into every IS subcategory they own so each sub-search finds them.
 */
export function expandParentDefaultSubcategoryIds(parentIds = [], existingSubs = []) {
  const out = new Set((Array.isArray(existingSubs) ? existingSubs : []).map(String).filter(Boolean))
  ;(Array.isArray(parentIds) ? parentIds : []).forEach((raw) => {
    const id = String(raw || '').trim()
    if (!id) return
    out.add(id)
    const defaults = SOURCING_PARENT_TO_SUBCATS[id]
    if (Array.isArray(defaults)) defaults.forEach((s) => out.add(String(s)))
  })
  return [...out]
}

/** @deprecated use expandParentDefaultSubcategoryIds */
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
 * Does supplier row match an Intelligent Sourcing category selection?
 * Parent membership ⇒ visible on every subcategory under that parent.
 * Multiple registered categories ⇒ visible on each of those searches.
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
      return true
    }
    /* Explicit sub without parent id still matches when parent defaults were expanded */
    return false
  }

  if (!categoryId) return true
  if (ids.includes(String(categoryId))) return true
  if (subs.includes(String(categoryId))) return true
  if (ids.length === 0 && subs.length === 0) return false
  return false
}
