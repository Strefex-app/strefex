/**
 * Map STREFEX registry + supplier DB into Intelligent Sourcing SOURCING_DATA shapes.
 */
import { getApproximateLngLatOrFallback } from './accountApproximateLocation'
import { INDUSTRY_LABELS, SUPPLIER_DATABASE } from '../data/supplierDatabase'
import { isSeededSupplierDirectoryEnabled } from '../config/supplierDataMode'
import { serviceEngagementDays } from './serviceDurationEstimates'
import { readReceivingPlantsFromAccount } from './receivingPlantsPersist'

/** Design-canvas industry id → platform slug */
export const SOURCING_INDUSTRY_TO_PLATFORM = {
  automotive: 'automotive',
  aerospace: 'machinery',
  medical: 'medical',
  machinery: 'machinery',
  electronics: 'electronics',
  rawmat: 'raw-materials',
  oilgas: 'oil-gas',
  energy: 'green-energy',
  nuclear: 'nuclear',
  household: 'household-products',
}

/** Platform slug → design-canvas industry id */
export const PLATFORM_TO_SOURCING_INDUSTRY = {
  automotive: 'automotive',
  machinery: 'machinery',
  electronics: 'electronics',
  medical: 'medical',
  'raw-materials': 'rawmat',
  'oil-gas': 'oilgas',
  'green-energy': 'energy',
  nuclear: 'nuclear',
  'household-products': 'household',
}

const CONT_BY_CC = {
  DE: 'EU', CZ: 'EU', SE: 'EU', PL: 'EU', PT: 'EU', TR: 'EU', FR: 'EU', IE: 'EU',
  LT: 'EU', ES: 'EU', GB: 'EU', UK: 'EU', UA: 'EU', MA: 'EU', DK: 'EU', IT: 'EU',
  NL: 'EU', BE: 'EU', AT: 'EU', CH: 'EU', HU: 'EU', RO: 'EU', SK: 'EU', SI: 'EU',
  HR: 'EU', FI: 'EU', NO: 'EU', US: 'NA', MX: 'NA', CA: 'NA', CN: 'APAC', JP: 'APAC',
  IN: 'APAC', KR: 'APAC', MY: 'APAC', TW: 'APAC', TH: 'APAC', SG: 'APAC', AU: 'APAC',
}

function hash01(seed) {
  let h = 2166136261
  const s = String(seed || '')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function metricFromAccount(a, key, fallback) {
  const v = a?.[key]
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  const h = hash01(`${a?.id || a?.email || a?.company}|${key}`)
  return fallback(h)
}

function industryLabelsForAccount(a) {
  const ids = Array.isArray(a?.industries) ? a.industries : []
  return ids.map((id) => INDUSTRY_LABELS[id] || id).filter(Boolean)
}

function countryCodeFromName(country) {
  const c = String(country || '').trim()
  if (!c || c === '—') return 'XX'
  if (/^[A-Za-z]{2}$/.test(c)) return c.toUpperCase() === 'UK' ? 'GB' : c.toUpperCase()
  const map = {
    germany: 'DE', france: 'FR', italy: 'IT', spain: 'ES', poland: 'PL',
    'united states': 'US', usa: 'US', mexico: 'MX', china: 'CN', japan: 'JP',
    india: 'IN', 'south korea': 'KR', 'united kingdom': 'GB', uk: 'GB',
    czechia: 'CZ', 'czech republic': 'CZ', sweden: 'SE', portugal: 'PT',
    turkey: 'TR', türkiye: 'TR', canada: 'CA', austria: 'AT', switzerland: 'CH',
    netherlands: 'NL', belgium: 'BE', romania: 'RO', hungary: 'HU',
  }
  return map[c.toLowerCase()] || 'XX'
}

function flattenCategoryIds(map) {
  if (!map || typeof map !== 'object') return []
  return [...new Set(Object.values(map).flat().filter(Boolean).map(String))]
}

function flattenSubcategoryIds(nested) {
  if (!nested || typeof nested !== 'object') return []
  const out = []
  Object.values(nested).forEach((byParent) => {
    if (!byParent || typeof byParent !== 'object') return
    Object.entries(byParent).forEach(([parentId, list]) => {
      if (parentId) out.push(String(parentId))
      if (!Array.isArray(list)) return
      list.forEach((id) => {
        if (id && id !== '*') out.push(String(id))
      })
    })
  })
  return [...new Set(out)]
}

/**
 * @param {object} account registry seller / service provider
 */
export function accountToSourcingSupplier(account) {
  const name = account.company || account.name || account.email || 'Supplier'
  const [lon, lat] = getApproximateLngLatOrFallback({
    country: account.country,
    city: account.city,
    address: account.address,
    seed: String(account.id || account.email || name),
  })
  const cc = countryCodeFromName(account.country)
  const certs = Array.isArray(account.certifications) ? account.certifications : []
  const incomplete = !account.country || !account.city || !(account.industries || []).length
  const isService = account.accountType === 'service_provider'
    || (Array.isArray(account.accountTypes) && account.accountTypes.includes('service_provider')
      && !account.accountTypes.includes('seller'))
  const serviceCat = Array.isArray(account.serviceCategories) ? account.serviceCategories[0] : ''
  const lead = isService
    ? (account.leadTimeDays || serviceEngagementDays(serviceCat || 'audit', name))
    : (account.leadTimeDays || Math.round(20 + hash01(`${name}|lead`) * 50))
  const categoryIds = [
    ...flattenCategoryIds(account.categories),
    ...flattenCategoryIds(account.productCategories || account.product_categories),
    ...(Array.isArray(account.serviceCategories) ? account.serviceCategories.map(String) : []),
  ]
  const subcategoryIds = [
    ...flattenSubcategoryIds(account.equipmentSubcategories || account.equipment_subcategories),
    ...flattenSubcategoryIds(account.productSubcategories || account.product_subcategories),
  ]
  /* stage 5+ is buyer-visible on the Intelligent Sourcing map; mirror mock dataset rule */
  const stage = incomplete ? 4 : 6
  const published = account.published === true || stage >= 5
  return {
    name,
    city: account.city || '—',
    cc,
    lat,
    lon,
    fit: metricFromAccount(account, 'fitLevel', (h) => 55 + Math.round(h * 40)),
    risk: metricFromAccount(account, 'riskLevel', (h) => 20 + Math.round(h * 50)),
    cap: metricFromAccount(account, 'capacityLevel', (h) => 60 + Math.round(h * 35)),
    onTime: metricFromAccount(account, 'onTimePct', (h) => 80 + Math.round(h * 19)),
    ppm: metricFromAccount(account, 'qualityPpm', (h) => Math.round(80 + h * 900)),
    lead,
    delta: Number((hash01(`${name}|delta`) * 20 - 10).toFixed(1)),
    spend: Number((1.5 + hash01(`${name}|spend`) * 10).toFixed(1)),
    certs: certs.length ? certs.slice(0, 4) : incomplete ? [] : ['ISO 9001'],
    audit: incomplete ? 'Due' : 'Passed',
    auditIn: incomplete ? 14 : 180,
    fin: incomplete ? 'B-' : 'B+',
    tariff: 'None',
    tier2: incomplete ? 'Unknown' : 'Partial',
    industries: industryLabelsForAccount(account),
    categoryIds,
    subcategoryIds,
    stage,
    published,
    platformId: account.id || null,
    source: 'registered',
    incomplete: !!incomplete,
    accountType: account.accountType || 'seller',
  }
}

/**
 * @param {object} row static SUPPLIER_DATABASE entry
 */
export function dbSupplierToSourcing(row) {
  const coords = row.coordinates
    || getApproximateLngLatOrFallback({
      country: row.country,
      city: row.city,
      seed: String(row.id || row.name),
    })
  const lon = coords[0]
  const lat = coords[1]
  const cc = countryCodeFromName(row.country)
  return {
    name: row.name,
    city: row.city || '—',
    cc,
    lat,
    lon,
    fit: row.fitLevel ?? 70,
    risk: row.riskLevel ?? 40,
    cap: row.capacityLevel ?? 70,
    onTime: row.onTimePct ?? row.onTime ?? 90,
    ppm: row.qualityPpm ?? row.ppm ?? 300,
    lead: row.leadTimeDays ?? 35,
    delta: 0,
    spend: 4,
    certs: row.certifications || [],
    audit: 'Passed',
    auditIn: 120,
    fin: 'B+',
    tariff: 'None',
    tier2: 'Partial',
    industries: (row.industries || []).map((id) => INDUSTRY_LABELS[id] || id),
    stage: 6,
    platformId: row.id || null,
    source: 'database',
  }
}

export function buildSourcingSuppliers({ registrySellers = [], includeSeeded = true } = {}) {
  const fromRegistry = registrySellers
    .filter((a) => a && a.status !== 'canceled')
    .map(accountToSourcingSupplier)

  const names = new Set(fromRegistry.map((s) => s.name.toLowerCase()))
  const seeded = (includeSeeded && isSeededSupplierDirectoryEnabled()
    ? SUPPLIER_DATABASE
    : []
  )
    .filter((s) => !names.has(String(s.name || '').toLowerCase()))
    .map(dbSupplierToSourcing)

  return [...fromRegistry, ...seeded]
}

export function buildBuyerPlants({ tenant, user, account } = {}) {
  const saved = readReceivingPlantsFromAccount(account, tenant)
  if (saved.length) return saved

  const country = account?.country || tenant?.country || user?.country || ''
  const city = account?.city || tenant?.city || user?.city || ''
  const address = account?.address || tenant?.address || ''
  const company = account?.company || tenant?.name || user?.companyName || 'Receiving plant'
  if (!country && !city) {
    return [
      { id: 'muc', name: 'Munich plant', cc: 'DE', lat: 48.14, lon: 11.58, cont: 'EU' },
      { id: 'det', name: 'Detroit plant', cc: 'US', lat: 42.33, lon: -83.05, cont: 'NA' },
      { id: 'qro', name: 'Querétaro plant', cc: 'MX', lat: 20.59, lon: -100.39, cont: 'NA' },
      { id: 'sha', name: 'Shanghai plant', cc: 'CN', lat: 31.23, lon: 121.47, cont: 'APAC' },
    ]
  }
  const [lon, lat] = getApproximateLngLatOrFallback({
    country,
    city,
    address,
    seed: String(account?.id || user?.email || company),
  })
  const cc = countryCodeFromName(country)
  return [{
    id: 'home',
    name: city ? `${city} plant` : `${company} plant`,
    cc,
    lat,
    lon,
    cont: CONT_BY_CC[cc] || 'EU',
    platform: true,
  }]
}

export function registeredIndustryIdsFromAccounts(accounts = []) {
  const set = new Set()
  accounts.forEach((a) => {
    (a.industries || []).forEach((id) => {
      const sid = PLATFORM_TO_SOURCING_INDUSTRY[id]
      if (sid) set.add(sid)
    })
  })
  return [...set]
}

export function platformIndustryFromSourcing(industryId) {
  return SOURCING_INDUSTRY_TO_PLATFORM[industryId] || industryId || null
}

export function buildPlatformSourcingPayload({
  registrySellers = [],
  tenant,
  user,
  account,
  buyerIndustries = [],
} = {}) {
  const suppliers = buildSourcingSuppliers({ registrySellers, includeSeeded: true })
  const buyers = buildBuyerPlants({ tenant, user, account })
  const registeredIndustryIds = [
    ...new Set([
      ...registeredIndustryIdsFromAccounts(registrySellers),
      ...buyerIndustries.map((id) => PLATFORM_TO_SOURCING_INDUSTRY[id]).filter(Boolean),
    ]),
  ]
  return { suppliers, buyers, registeredIndustryIds, userInitials: initialsFromUser(user, account) }
}

function initialsFromUser(user, account) {
  const name = String(
    user?.fullName || user?.name || account?.company || user?.companyName || user?.email || 'U',
  ).trim()
  const parts = name.split(/[\s@._-]+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/** Serialize buyer RFQs for the Intelligent Sourcing home list. */
export function serializeSourcingRfqList(rfqs = [], { limit = 12 } = {}) {
  return (Array.isArray(rfqs) ? rfqs : [])
    .filter((r) => r && (r.status === 'sent' || r.status === 'active' || r.status === 'draft' || r.buyerRefDisplay))
    .slice()
    .sort((a, b) => String(b.sentAt || b.createdAt || '').localeCompare(String(a.sentAt || a.createdAt || '')))
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      ref: r.buyerRefDisplay || r.id,
      title: r.title || 'Network RFQ',
      status: r.status || 'sent',
      invited: Array.isArray(r.suppliers) ? r.suppliers.length : 0,
      responses: Number(r.responses || r.sellerResponses?.length || 0),
      deadline: r.dueDate || r.deadline || '',
      industryId: r.industryId || '',
    }))
}
