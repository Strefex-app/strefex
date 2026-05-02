/**
 * Maps supplychainAutomotiveIntel.json into STREFEX data shapes (no UI changes).
 * Consumed by supplierDatabase.js, suppliersByEquipment.js, suppliersByMaterial.js.
 */
import supplychainIntel from './supplychainAutomotiveIntel.json'

const SOURCE_TAG = 'database'

function primaryCountry(cc) {
  if (!cc) return 'EU'
  const raw = String(cc).trim().split(/\s*[/,]\s*/)[0].trim().toUpperCase()
  const two = raw.match(/^[A-Z]{2}/)
  return two ? two[0] : raw.slice(0, 2) || 'EU'
}

/** Stable key so "CATL (…) / Panasonic" does not collide with existing "CATL". */
function nameDedupKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split('/')[0]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48)
}

function revenueToRatingBn(revenueBn) {
  const n = typeof revenueBn === 'number' ? revenueBn : Number.NaN
  if (Number.isNaN(n)) return 4.35
  if (n >= 40) return 4.72
  if (n >= 15) return 4.65
  if (n >= 5) return 4.58
  if (n >= 1) return 4.48
  if (n >= 0.2) return 4.38
  return 4.3
}

const EXTRA_COORDS = {
  BE: [4.4699, 50.5039],
  IE: [-8.2439, 53.4129],
  CA: [-106.3468, 56.1304],
  ES: [-3.7492, 40.4637],
  LU: [6.1296, 49.8153],
  SE: [18.0686, 59.6749],
  FI: [25.7482, 61.9241],
  CH: [8.2275, 46.8182],
  IT: [12.5674, 41.8719],
  TH: [100.9925, 15.87],
  MY: [101.9758, 4.2105],
  IN: [78.9629, 20.5937],
  AT: [14.5501, 47.5162],
  DK: [9.5018, 56.2639],
  TW: [121.5654, 23.6978],
  HU: [19.5033, 47.1625],
  PL: [19.1451, 51.9194],
  NO: [8.4689, 60.472],
}

function coordsFor(cc, countryMap) {
  const code = primaryCountry(cc)
  if (countryMap[code]?.coordinates) return countryMap[code].coordinates
  if (EXTRA_COORDS[code]) return EXTRA_COORDS[code]
  return countryMap.US?.coordinates || [0, 0]
}

/** Intel equipment_suppliers.category → equipment ids in equipmentByIndustryCategory */
export function intelEquipmentCategoryToEquipmentIds(category) {
  const s = String(category || '').toLowerCase()
  const ids = new Set()

  if (/\binjection|^\s*imm\b/i.test(String(category || '')))
    ['auto-inj-electric', 'auto-inj-hybrid', 'mach-inj-electric'].forEach((id) => ids.add(id))
  if (s.includes('cnc') && !s.includes('cmm'))
    ['mach-cnc-vertical', 'mach-cnc-horizontal'].forEach((id) => ids.add(id))
  if (s.includes('edm')) ['auto-mold-tooling', 'mach-mold-cavity'].forEach((id) => ids.add(id))
  if (s.includes('die casting')) ids.add('auto-press-forming')
  if (s.includes('stamping')) ids.add('auto-press-stamping')
  if (s.includes('robotics') || (s.includes('robot') && s.includes('spray'))) ids.add('auto-robot-articulated')
  if (s.includes('cobot')) ids.add('auto-robot-collab')
  if (s.includes('plc') || (s.includes('automation') && s.includes('controller'))) ids.add('auto-auto-conveyor')
  if (s.includes('vision') || s.includes('sensor')) ids.add('auto-auto-vision')
  if (s.includes('hot runner')) ids.add('auto-hot-manifold')
  if (s.includes('temperature')) ids.add('auto-temp-unit')
  if (s.includes('chiller') || (s.includes('climate') && s.includes('hvac'))) ids.add('auto-chiller')
  if (s.includes('dryer') || s.includes('conveying')) ids.add('auto-dryer-desiccant')
  if (s.includes('part removal') || s.includes('iml')) {
    ids.add('auto-robot-scara')
    ids.add('auto-inj-electric')
  }
  if (s.includes('gripper') || s.includes('eoat')) ids.add('auto-auto-gripper')
  if (s.includes('conveyor') && !s.includes('plastic')) ids.add('auto-conv-belt')
  if (s.includes('spot welding')) ids.add('auto-robot-articulated')
  if (s.includes('pallet automation') || s.includes('fms')) ids.add('mach-cnc-vertical')
  if (s.includes('cmm') || s.includes('metrology')) ids.add('auto-test-cmm')
  if (s.includes('vacuum degassing') || s.includes('dosing furnace') || s.includes('auxiliary'))
    ids.add('auto-press-forming')
  if (s.includes('force sensor') || s.includes('tool changer')) ids.add('auto-auto-gripper')
  if (s.includes('safety')) ids.add('auto-auto-vision')
  if (s.includes('leak')) ids.add('auto-test-cmm')
  if (s.includes('ultrasonic welding')) ids.add('auto-auto-gripper')
  if (s.includes('oven') || s.includes('thermal equipment')) ids.add('auto-chiller')
  if (s.includes('dispensing')) ids.add('auto-auto-conveyor')
  if (s.includes('fastening') || (s.includes('screw') && s.includes('driving'))) ids.add('auto-robot-collab')
  if (s.includes('tyre') || s.includes('tire')) ids.add('auto-press-forming')
  if (s.includes('smt') || s.includes('electronics mfg')) ids.add('elec-smt-place')
  if (s.includes('composite') && !s.includes('plastic')) ids.add('auto-mold-tooling')

  return [...ids]
}

export function intelRawCategoryToMaterialIds(category) {
  const s = String(category || '').toLowerCase()
  const ids = new Set()
  if (s.includes('plastic') || s.includes('polyolefin') || s.includes('engineering'))
    ['pp', 'pa', 'pc', 'pe', 'pvc'].forEach((id) => ids.add(id))
  if (s.includes('steel') || s.includes('silicon steel')) ['steel-carbon', 'steel-stainless'].forEach((id) => ids.add(id))
  if (s.includes('alumin')) ids.add('aluminum')
  if (s.includes('rubber') || s.includes('elastomer') || s.includes('natural rubber')) ids.add('rubber')
  if (s.includes('glass') || s.includes('flat glass')) ids.add('glass')
  if (s.includes('battery') || s.includes('cell')) ids.add('nickel-alloy')
  if (s.includes('carbon fibre') || s.includes('carbon fiber') || s.includes('prepreg')) ids.add('carbon-fiber')
  if (s.includes('lft') || s.includes('smc') || s.includes('compound')) {
    ids.add('pp')
    ids.add('composites')
  }
  if (s.includes('thermal') || s.includes('adhesive') || s.includes('silicone')) ids.add('ceramics')
  if (s.includes('acoustic') || s.includes('textile') || s.includes('felt')) ids.add('textiles-tech')
  if (s.includes('pcb') || s.includes('laminate')) ids.add('composites')
  if (s.includes('copper')) ids.add('copper')
  if (ids.size === 0) ids.add('composites')
  return [...ids]
}

function jsonProductCategoryToSupplychainCats(pCat) {
  const m = {
    Exterior: ['plastic', 'metal'],
    'Body Structure': ['metal'],
    Interior: ['plastic', 'textile'],
    Powertrain: ['metal', 'electronics-assembly'],
    Chassis: ['metal', 'rubber'],
    Glazing: ['glass'],
    Sealing: ['rubber'],
    Electrical: ['electronics-assembly'],
    Composites: ['composites'],
    Electronics: ['electronics-assembly'],
    Textile: ['textile'],
    'Battery Chemistry': ['electronics-assembly', 'metal'],
    Specialty: ['electronics-assembly', 'metal'],
    Rubber: ['rubber'],
    Plastic: ['plastic'],
    Metal: ['metal'],
    Glass: ['glass'],
  }
  return m[pCat] || ['plastic', 'metal']
}

/**
 * Build executive-summary rows (manufacturers + raw material suppliers).
 * @param {{ name: string }[]} coreSuppliers
 * @param {Record<string, { coordinates: number[] }>} countryMap
 */
export function buildSupplychainIntelSuppliers(coreSuppliers, countryMap) {
  const taken = new Set(coreSuppliers.map((s) => nameDedupKey(s.name)).filter(Boolean))
  const db = supplychainIntel
  const out = []

  const manufacturers = Array.isArray(db.manufacturers) ? db.manufacturers : []
  const productsById = new Map((db.products || []).map((p) => [p.id, p]))

  for (const mfg of manufacturers) {
    const key = nameDedupKey(mfg.name)
    if (!key || taken.has(key)) continue
    taken.add(key)

    const prodCats = new Set()
    for (const pid of mfg.product_ids || []) {
      const p = productsById.get(pid)
      if (p?.category) jsonProductCategoryToSupplychainCats(p.category).forEach((c) => prodCats.add(c))
    }
    if (typeof mfg.category === 'string') {
      if (/composite|carbon|cfrp|smc/i.test(mfg.category)) prodCats.add('composites')
      if (/plastic|polymer/i.test(mfg.category)) prodCats.add('plastic')
      if (/metal|steel|alumin/i.test(mfg.category)) prodCats.add('metal')
    }
    for (const c of mfg.categories || []) {
      if (typeof c === 'string') {
        if (/plastic|bumper|interior|fuel system|module/i.test(c)) prodCats.add('plastic')
        if (/steel|metal|stamp|wheel|motor|exhaust|fuel|powertrain|body|forging|hot stamp/i.test(c)) prodCats.add('metal')
        if (/composite|battery|carbon|smc|acoustic|SMC/i.test(c)) prodCats.add('composites')
        if (/glass|HUD|windshield/i.test(c)) prodCats.add('glass')
        if (/seal|hose|rubber|tyre|tire/i.test(c)) prodCats.add('rubber')
        if (/electron|sensor|motor|hv|wire|pcb|adas|domain/i.test(c)) prodCats.add('electronics-assembly')
        if (/textile|carpet|headliner/i.test(c)) prodCats.add('textile')
        if (/wiring|cable/i.test(c)) prodCats.add('electronics-assembly')
      }
    }

    const categories = [...prodCats].length ? [...prodCats] : ['plastic', 'metal']

    out.push({
      id: `sci-mfg-${mfg.id}`,
      name: mfg.name,
      country: primaryCountry(mfg.country),
      city: mfg.hq || '—',
      coordinates: coordsFor(mfg.country, countryMap),
      industries: ['automotive'],
      categories,
      source: SOURCE_TAG,
      rating: revenueToRatingBn(mfg.revenue_bn),
      riskLevel: 18,
      fitLevel: 88,
      capacityLevel: 85,
      certifications: Array.isArray(mfg.certifications) ? mfg.certifications : [],
      leadTimeDays: 90,
      deliveryTimeDays: 21,
      priceIndex: 102,
      established: null,
      employees: typeof mfg.employees === 'number' ? mfg.employees : 0,
    })
  }

  const rawList = Array.isArray(db.raw_material_suppliers) ? db.raw_material_suppliers : []

  for (const rms of rawList) {
    const key = nameDedupKey(rms.name)
    if (!key || taken.has(key)) continue
    taken.add(key)

    const materialIds = intelRawCategoryToMaterialIds(rms.category)
    const execCats = new Set()

    materialIds.forEach((mid) => {
      if (['pp', 'pa', 'pc', 'pe', 'pvc'].includes(mid)) execCats.add('plastic')
      if (['steel-carbon', 'steel-stainless', 'aluminum', 'copper', 'nickel-alloy'].includes(mid)) execCats.add('metal')
      if (mid === 'rubber') execCats.add('rubber')
      if (['carbon-fiber', 'composites', 'ceramics'].includes(mid)) execCats.add('composites')
      if (mid === 'glass') execCats.add('glass')
      if (mid === 'textiles-tech') execCats.add('textile')
    })
    if (execCats.size === 0) execCats.add('plastic')

    out.push({
      id: `sci-rms-${rms.id}`,
      name: rms.name,
      country: primaryCountry(rms.country),
      city: '—',
      coordinates: coordsFor(rms.country, countryMap),
      industries: ['raw-materials', 'automotive'],
      categories: [...execCats],
      source: SOURCE_TAG,
      rating: revenueToRatingBn(rms.revenue_bn),
      riskLevel: 15,
      fitLevel: 90,
      capacityLevel: 88,
      certifications: Array.isArray(rms.certifications) ? rms.certifications : [],
      leadTimeDays: 30,
      deliveryTimeDays: 14,
      priceIndex: 100,
      established: null,
      employees: 0,
    })
  }

  return out
}

/** equipmentId → extra supplier rows */
export function buildSupplychainEquipmentAugment(coreSuppliers) {
  const takenNames = new Set(coreSuppliers.map((s) => nameDedupKey(s.name)))
  const eqs = Array.isArray(supplychainIntel.equipment_suppliers) ? supplychainIntel.equipment_suppliers : []
  const byEquip = {}

  let idx = 0
  for (const eq of eqs) {
    const nk = nameDedupKey(eq.name)
    if (nk && takenNames.has(nk)) continue

    const rating = revenueToRatingBn(eq.revenue_bn)

    intelEquipmentCategoryToEquipmentIds(eq.category).forEach((equipId) => {
      if (!byEquip[equipId]) byEquip[equipId] = []
      idx += 1
      const idSuffix = nk ? nk.replace(/\W+/g, '-').slice(0, 32) : `x${idx}`
      const rowId = `sci-eq-${eq.id}-${idSuffix}-${equipId}-${idx}`
      byEquip[equipId].push({
        id: rowId.slice(0, 96),
        name: eq.name,
        source: SOURCE_TAG,
        country: primaryCountry(eq.country),
        rating,
      })
    })
    if (nk) takenNames.add(nk)
  }

  return byEquip
}

/** materialId (materialsByCategory ids) → extra supplier rows */
export function buildSupplychainMaterialAugment(coreSuppliers) {
  const takenNames = new Set(coreSuppliers.map((s) => nameDedupKey(s.name)))
  const rawList = Array.isArray(supplychainIntel.raw_material_suppliers) ? supplychainIntel.raw_material_suppliers : []
  const byMat = {}

  let idx = 0
  for (const rms of rawList) {
    const nk = nameDedupKey(rms.name)
    if (nk && takenNames.has(nk)) continue

    const rating = revenueToRatingBn(rms.revenue_bn)

    intelRawCategoryToMaterialIds(rms.category).forEach((matId) => {
      if (!byMat[matId]) byMat[matId] = []
      idx += 1
      byMat[matId].push({
        id: `sci-rms-${rms.id}-${matId}-${idx}`,
        name: rms.name,
        source: SOURCE_TAG,
        country: primaryCountry(rms.country),
        rating,
      })
    })
    if (nk) takenNames.add(nk)
  }

  return byMat
}
