/**
 * Spare-parts product catalogue linked to industry equipment lists.
 * Each equipment item gets a kit of replaceable parts; sellers are compared
 * as OEM machine makers vs aftermarket / registered spare manufacturers.
 */
import { getEquipmentCategoriesForIndustry } from './equipmentCategoriesByIndustry'
import { getEquipmentForIndustryCategory } from './equipmentByIndustryCategory'
import { getSuppliersForEquipment } from './suppliersByEquipment'
import { COUNTRY_COORDINATES } from './supplierDatabase'

export const SPARE_PARTS_PRODUCT_CATEGORY_ID = 'spare-parts-consumables'

export const SPARE_PARTS_PRODUCT_CATEGORY = {
  id: SPARE_PARTS_PRODUCT_CATEGORY_ID,
  name: 'Spare parts & shop consumables',
  description: 'Wear parts, seals, tooling inserts and MRO consumables matched to plant equipment in this industry',
  color: '#c62828',
  subcategories: [
    { id: 'mechanical-spares', name: 'Mechanical spares', description: 'Bearings, bushings, couplings, belts, and replaceable wear components' },
    { id: 'seals-gaskets-packing', name: 'Seals, gaskets & packing', description: 'O-rings, mechanical seals, valve packing, hydraulic seals' },
    { id: 'electrical-spares', name: 'Electrical & drive spares', description: 'Heaters, sensors, drives, contactors, and servo parts' },
    { id: 'filters-strainers', name: 'Filters & strainers', description: 'Process, hydraulic, and HVAC filter elements' },
    { id: 'mro-consumables', name: 'MRO & industrial consumables', description: 'Abrasives, cutting tools, lubricants, and maintenance supplies' },
  ],
}

const AFTERMARKET = {
  mechanical: [
    { id: 'am-skf', name: 'SKF', country: 'SE', rating: 4.6 },
    { id: 'am-nsk', name: 'NSK', country: 'JP', rating: 4.5 },
    { id: 'am-schaeffler', name: 'Schaeffler', country: 'DE', rating: 4.6 },
  ],
  seals: [
    { id: 'am-parker', name: 'Parker', country: 'US', rating: 4.5 },
    { id: 'am-freudenberg', name: 'Freudenberg Sealing', country: 'DE', rating: 4.6 },
    { id: 'am-trelleborg', name: 'Trelleborg', country: 'SE', rating: 4.4 },
  ],
  electrical: [
    { id: 'am-siemens', name: 'Siemens', country: 'DE', rating: 4.6 },
    { id: 'am-abb', name: 'ABB', country: 'CH', rating: 4.5 },
    { id: 'am-omron', name: 'Omron', country: 'JP', rating: 4.5 },
  ],
  filters: [
    { id: 'am-pall', name: 'Pall', country: 'US', rating: 4.4 },
    { id: 'am-donaldson', name: 'Donaldson', country: 'US', rating: 4.4 },
    { id: 'am-mann', name: 'MANN+HUMMEL', country: 'DE', rating: 4.3 },
  ],
  tooling: [
    { id: 'am-sandvik', name: 'Sandvik Coromant', country: 'SE', rating: 4.6 },
    { id: 'am-kennametal', name: 'Kennametal', country: 'US', rating: 4.5 },
    { id: 'am-hasco', name: 'HASCO', country: 'DE', rating: 4.5 },
  ],
  robots: [
    { id: 'am-fanuc-parts', name: 'FANUC Parts', country: 'JP', rating: 4.6 },
    { id: 'am-kuka-parts', name: 'KUKA Spare Parts', country: 'DE', rating: 4.5 },
    { id: 'am-igm', name: 'igus', country: 'DE', rating: 4.4 },
  ],
  nuclear: [
    { id: 'am-flowserve', name: 'Flowserve', country: 'US', rating: 4.5 },
    { id: 'am-johncrane', name: 'John Crane', country: 'GB', rating: 4.5 },
    { id: 'am-swagelok', name: 'Swagelok', country: 'US', rating: 4.6 },
  ],
}

function part(id, sku, name, family, life) {
  return { id, sku, name, family, typicalLife: life }
}

const COUNTRY_NAME_TO_CC = {
  germany: 'DE', usa: 'US', 'united states': 'US', japan: 'JP', china: 'CN', italy: 'IT',
  france: 'FR', sweden: 'SE', austria: 'AT', switzerland: 'CH', netherlands: 'NL',
  'united kingdom': 'UK', uk: 'UK', britain: 'UK', india: 'IN', brazil: 'BR', russia: 'RU',
  uae: 'AE', 'united arab emirates': 'AE', spain: 'ES', poland: 'PL', turkey: 'TR',
  korea: 'KR', 'south korea': 'KR', taiwan: 'TW', mexico: 'MX', canada: 'CA',
  australia: 'AU', singapore: 'SG', belgium: 'BE', czech: 'CZ', 'czech republic': 'CZ',
}

const CITY_COORDS = {
  Frankfurt: [8.6821, 50.1109], Hanover: [9.732, 52.3759], Chicago: [-87.6298, 41.8781],
  Dubai: [55.2708, 25.2048], Shanghai: [121.4737, 31.2304], Stuttgart: [9.1829, 48.7758],
  Milan: [9.19, 45.4642], Paris: [2.3522, 48.8566], Tokyo: [139.6917, 35.6895],
  Guangzhou: [113.2644, 23.1291], Moscow: [37.6173, 55.7558], Nuremberg: [11.0767, 49.4521],
  Detroit: [-83.0458, 42.3314], Barcelona: [2.1734, 41.3851], Birmingham: [-1.8904, 52.4862],
}

const EXTRA_COORDS = {
  AE: [54.3773, 24.4539],
  GB: COUNTRY_COORDINATES.UK?.coordinates || [-3.436, 55.3781],
}

const FAIR_INDUSTRY = {
  automotive: 'Automotive',
  machinery: 'Manufacturing',
  electronics: 'Electronics',
  medical: 'Medical',
  'oil-gas': 'Oil & Gas',
  nuclear: 'Energy',
  'green-energy': 'Energy',
  'household-products': 'Manufacturing',
  'raw-materials': 'Materials',
}

function hashStr(str) {
  let h = 0
  const s = String(str || '')
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000
  return h
}

export function countryCodeOf(country) {
  const raw = String(country || '').trim()
  if (!raw || raw === '—') return ''
  if (raw.length <= 3) {
    const up = raw.toUpperCase()
    if (up === 'GB') return 'UK'
    return up
  }
  return COUNTRY_NAME_TO_CC[raw.toLowerCase()] || ''
}

export function coordinatesForSeller(s = {}) {
  if (Array.isArray(s.coordinates) && s.coordinates.length >= 2) {
    const lon = Number(s.coordinates[0])
    const lat = Number(s.coordinates[1])
    if (Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat]
  }
  const city = String(s.city || '').trim()
  if (CITY_COORDS[city]) return CITY_COORDS[city]
  const cc = countryCodeOf(s.country)
  return COUNTRY_COORDINATES[cc]?.coordinates || EXTRA_COORDS[cc] || null
}

export function indicativePriceIndex(s = {}, seed = '') {
  const n = Number(s.priceIndex)
  if (Number.isFinite(n) && n > 0) return Math.round(n)
  return 86 + (hashStr(s.id || s.name || seed) % 32)
}

const KITS = [
  {
    id: 'injection-cell',
    match: /inj|mold|mould|hot.?runner|chiller|dryer|hopper|temp.?control|tcu/i,
    parts: [
      part('hr-tip', 'HR-TIP-16', 'Hot-runner nozzle tips', 'tooling', '6–14 months'),
      part('hr-heater', 'HR-HTR-240', 'Nozzle / manifold heaters', 'electrical', '12–24 months'),
      part('hr-t/c', 'HR-TC-J', 'Thermocouples (Type J/K)', 'electrical', '12 months'),
      part('seal-kit', 'IMM-SK-80', 'Tie-bar and cylinder seal kit', 'seals', '18–36 months'),
      part('filter-hyd', 'HYD-F10', 'Hydraulic return filter', 'filters', '6 months'),
    ],
  },
  {
    id: 'machine-tools',
    match: /cnc|lathe|mill|grind|vmc|hmc|turning|boring|machining/i,
    parts: [
      part('spindle-brg', 'SPB-7014', 'Spindle bearing set', 'mechanical', '18–36 months'),
      part('way-wiper', 'WW-400', 'Way covers & wipers', 'mechanical', '12 months'),
      part('tool-insert', 'CNMG-1204', 'Carbide inserts (CNMG)', 'tooling', 'per job'),
      part('coolant-flt', 'CL-F25', 'Coolant filter cartridges', 'filters', '3–6 months'),
      part('encoder', 'ENC-1024', 'Axis encoder / scale', 'electrical', '36–60 months'),
    ],
  },
  {
    id: 'robots-auto',
    match: /robot|cobot|gripper|eoat|conveyor|automation|agv|amr/i,
    parts: [
      part('rv-reducer', 'RV-40E', 'RV / harmonic reducer', 'robots', '24–48 months'),
      part('teach-cable', 'TC-5M', 'Teach-pendant cable', 'electrical', '12–24 months'),
      part('eoat-pad', 'EOAT-PAD', 'Gripper pads / vacuum cups', 'mechanical', '3–9 months'),
      part('energy-chain', 'EC-R28', 'Energy-chain links', 'robots', '18 months'),
    ],
  },
  {
    id: 'press-form',
    match: /press|stamping|die|blank|hydroform|brake|forming/i,
    parts: [
      part('die-spring', 'DS-ISO', 'Die springs (ISO 10243)', 'mechanical', '12–24 months'),
      part('punch-insert', 'PN-H13', 'Punch / die inserts', 'tooling', 'per campaign'),
      part('clutch-pad', 'CLP-1600', 'Clutch / brake friction pads', 'mechanical', '18 months'),
    ],
  },
  {
    id: 'smt-elec',
    match: /smt|reflow|pcb|pick.?and.?place|solder|aoi|depanel/i,
    parts: [
      part('nozzle-smt', 'NZ-503', 'Placement nozzles', 'tooling', '6–12 months'),
      part('feeder-belt', 'FD-B8', 'Feeder belts', 'mechanical', '12 months'),
      part('solder-filter', 'RF-F', 'Reflow flux filters', 'filters', '3 months'),
    ],
  },
  {
    id: 'process-fluid',
    match: /pump|valve|chiller|cooler|compressor|separator|filter|pipe|hydro|leak/i,
    parts: [
      part('mech-seal', 'MS-25', 'Mechanical seal cartridge', 'seals', '12–24 months'),
      part('impeller', 'IMP-80', 'Impeller / wear ring', 'mechanical', '24 months'),
      part('gasket-set', 'GS-ANSI', 'Flange gasket set', 'seals', 'per outage'),
      part('strainer', 'ST-Y2', 'Y-strainer baskets', 'filters', '6 months'),
    ],
  },
  {
    id: 'sterile-med',
    match: /steril|autoclave|clean.?room|blister|seal|packaging/i,
    parts: [
      part('door-gasket', 'AG-DOOR', 'Chamber door gasket', 'seals', '12 months'),
      part('hepa', 'HEPA-H14', 'HEPA / ULPA filters', 'filters', '12–24 months'),
      part('seal-jaw', 'SJ-PTFE', 'Heat-seal jaws / PTFE tape', 'tooling', '6–12 months'),
    ],
  },
  {
    id: 'energy',
    match: /solar|wind|inverter|battery|hydrogen|heat.?pump|turbine|charging/i,
    parts: [
      part('igbt', 'IGBT-1200', 'Power module / IGBT', 'electrical', '60 months'),
      part('cool-fan', 'CF-120', 'Cooling fans', 'mechanical', '24 months'),
      part('dc-fuse', 'FUSE-1500', 'DC fuses & contactors', 'electrical', '36 months'),
    ],
  },
  {
    id: 'nuclear-qa',
    match: /nuclear|reactor|cask|orbital|nde|ut|hipot|spectro|fuel/i,
    parts: [
      part('weld-torch', 'GTAW-HD', 'Orbital weld head seals & tungsten', 'nuclear', 'per campaign'),
      part('probe-wedge', 'PAUT-W', 'PAUT wedges & cables', 'nuclear', '12 months'),
      part('cal-gas', 'He-99', 'Helium / calibration gas', 'nuclear', 'as consumed'),
    ],
  },
  {
    id: 'generic-mro',
    match: /.*/,
    parts: [
      part('bearing-std', '6205-2RS', 'Deep-groove bearings', 'mechanical', '18–36 months'),
      part('v-belt', 'SPA-1250', 'V-belts / timing belts', 'mechanical', '12 months'),
      part('oring-kit', 'NBR-70', 'O-ring kit (NBR / FKM)', 'seals', 'as consumed'),
      part('lube', 'ISO-VG46', 'Hydraulic oil / grease', 'filters', 'as consumed'),
    ],
  },
]

function kitForEquipment(item = {}) {
  const hay = `${item.id || ''} ${item.name || ''} ${item.description || ''}`
  return KITS.find((k) => k.match.test(hay)) || KITS[KITS.length - 1]
}

function aftermarketForFamily(family) {
  if (family === 'seals') return AFTERMARKET.seals
  if (family === 'electrical') return AFTERMARKET.electrical
  if (family === 'filters') return AFTERMARKET.filters
  if (family === 'tooling') return AFTERMARKET.tooling
  if (family === 'robots') return AFTERMARKET.robots
  if (family === 'nuclear') return AFTERMARKET.nuclear
  return AFTERMARKET.mechanical
}

function sellerRow(s, role) {
  const priceIndex = indicativePriceIndex(s, `${role}-${s.id || s.name}`)
  return {
    id: s.id || `sp-${String(s.name || 'seller').toLowerCase().replace(/\s+/g, '-')}`,
    name: s.name,
    country: s.country || '—',
    city: s.city || '',
    rating: Number(s.rating) || 0,
    role,
    source: s.source || (role === 'registered' ? 'database' : role === 'expo' ? 'expo' : 'open'),
    priceIndex,
    leadTimeDays: Number(s.leadTimeDays) || (role === 'expo' ? 21 : role === 'oem' ? 28 : 14),
    coordinates: coordinatesForSeller(s),
    expoName: s.expoName || '',
    email: s.email || '',
  }
}

function mergeSellers(...lists) {
  const seen = new Set()
  const out = []
  lists.flat().forEach((s) => {
    if (!s?.name) return
    const key = String(s.name).toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(s)
  })
  return out
}

export function sellerMatchesSpareParts(s, equipment = {}, categoryId = '') {
  const cat = String(categoryId || equipment.categoryId || '')
  const cats = s.categories || s.categoryIds || []
  const products = s.productCategoryIds || []
  const byIndustry = s.productCategories
  const productFromMap = byIndustry && typeof byIndustry === 'object'
    ? Object.values(byIndustry).flat()
    : []
  if (products.includes(SPARE_PARTS_PRODUCT_CATEGORY_ID) || productFromMap.includes(SPARE_PARTS_PRODUCT_CATEGORY_ID)) {
    return true
  }
  if (cat && (Array.isArray(cats) ? cats : []).includes(cat)) return true
  const hay = `${s.name || ''} ${(Array.isArray(cats) ? cats : []).join(' ')} ${s.expoName || ''}`.toLowerCase()
  return hay.includes('spare') || hay.includes(String(equipment.name || '').toLowerCase().slice(0, 8))
}

function registeredForEquipment(equipment, categoryId, extraSellers = []) {
  return (extraSellers || []).filter((s) => sellerMatchesSpareParts(s, equipment, categoryId))
}

export function expoSellersForIndustry(industryId, exhibitions = []) {
  const fairIndustry = FAIR_INDUSTRY[industryId]
  const list = Array.isArray(exhibitions) ? exhibitions : []
  return list
    .filter((e) => {
      if (fairIndustry && e.industry === fairIndustry) return true
      const eq = (e.equipment || []).join(' ').toLowerCase()
      return /part|spare|aftermarket|mould|mold|tool|pump|valve|filter|seal/.test(eq)
    })
    .slice(0, 14)
    .map((e) =>
      sellerRow(
        {
          id: `expo-${e.id}`,
          name: `${e.name} · spare-parts booth`,
          country: e.country,
          city: e.city,
          rating: 4.1,
          priceIndex: 90 + (hashStr(e.id) % 22),
          leadTimeDays: 18,
          expoName: e.name,
          source: 'expo',
        },
        'expo',
      ),
    )
}

export function compareSparePartMakers(makers = []) {
  return [...makers].sort((a, b) => (a.priceIndex || 999) - (b.priceIndex || 999))
}

export function mapLocationsForMakers(makers = []) {
  return makers
    .map((m) => {
      const coordinates = coordinatesForSeller(m)
      if (!coordinates) return null
      return {
        id: m.id,
        name: m.name,
        city: m.city || m.expoName || '',
        country: m.country,
        coordinates,
        riskLevel: m.role === 'oem' ? 18 : m.role === 'expo' ? 36 : 24,
        fitLevel: Math.max(50, 100 - Math.abs((m.priceIndex || 100) - 100)),
        relationLabel: `${m.role === 'expo' ? 'Expo' : m.role === 'oem' ? 'OEM' : m.role === 'registered' ? 'Registered' : 'Parts maker'} · price ${m.priceIndex}`,
      }
    })
    .filter(Boolean)
}

export function listIndustryEquipment(industryId, categoryId = null) {
  const cats = getEquipmentCategoriesForIndustry(industryId)
  const wanted = categoryId ? cats.filter((c) => c.id === categoryId) : cats
  return wanted.flatMap((cat) =>
    getEquipmentForIndustryCategory(industryId, cat.id).map((item) => ({
      ...item,
      categoryId: cat.id,
      categoryName: cat.name,
    })),
  )
}

/**
 * Build a product catalogue: spare parts for each related equipment item,
 * with OEM vs aftermarket vs registered manufacturer comparison.
 */
export function buildSparePartsCatalogue({
  industryId,
  categoryId = null,
  equipmentId = null,
  extraSellers = [],
} = {}) {
  const equipment = listIndustryEquipment(industryId, categoryId).filter((item) =>
    equipmentId ? item.id === equipmentId : true,
  )
  const products = []
  equipment.forEach((item) => {
    const kit = kitForEquipment(item)
    const oem = getSuppliersForEquipment(item.id).map((s) => sellerRow(s, 'oem'))
    const registered = registeredForEquipment(item, item.categoryId, extraSellers).map((s) =>
      sellerRow(s, 'registered'),
    )
    kit.parts.forEach((p) => {
      const aftermarket = aftermarketForFamily(p.family).map((s) => sellerRow(s, 'aftermarket'))
      products.push({
        id: `${item.id}::${p.id}`,
        sku: p.sku,
        name: p.name,
        family: p.family,
        typicalLife: p.typicalLife,
        kitId: kit.id,
        equipmentId: item.id,
        equipmentName: item.name,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        makers: mergeSellers(oem, aftermarket, registered),
      })
    })
  })
  return {
    industryId,
    categoryId,
    equipmentId,
    equipment,
    products,
    productCount: products.length,
    equipmentCount: equipment.length,
    makerCount: new Set(products.flatMap((p) => p.makers.map((m) => m.name))).size,
  }
}

/** Compact payload for the Intelligent Sourcing deep-dive overlay. */
export function sparePartsTaxonomyForSourcing(sourcingIndustryId, platformIndustryId) {
  const cat = buildSparePartsCatalogue({ industryId: platformIndustryId })
  return {
    industry: sourcingIndustryId,
    equipmentCount: cat.equipmentCount,
    productCount: cat.productCount,
    makerCount: cat.makerCount,
    equipment: cat.equipment.map((e) => ({
      id: e.id,
      name: e.name,
      categoryId: e.categoryId,
      categoryName: e.categoryName,
    })),
    products: cat.products.slice(0, 80).map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      family: p.family,
      typicalLife: p.typicalLife,
      equipmentName: p.equipmentName,
      categoryId: p.categoryId,
      categoryName: p.categoryName,
        makers: p.makers.slice(0, 5).map((m) => ({
        name: m.name,
        country: m.country,
        role: m.role,
        rating: m.rating,
        priceIndex: m.priceIndex,
      })),
    })),
  }
}

export function kitIdForEquipment(item) {
  return kitForEquipment(item).id
}
