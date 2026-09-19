/**
 * Map STREFEX registry + supplier DB into Intelligent Sourcing SOURCING_DATA shapes.
 */
import { getApproximateLngLatOrFallback } from './accountApproximateLocation'
import { INDUSTRY_LABELS, SUPPLIER_DATABASE } from '../data/supplierDatabase'
import { isSeededSupplierDirectoryEnabled } from '../config/supplierDataMode'
import { readReceivingPlantsFromAccount } from './receivingPlantsPersist'
import {
  SOURCING_INDUSTRY_LABELS,
  collectAccountTypes,
  expandEquipmentCategoryIds,
  expandProductCategoryIds,
  expandServiceCategoryIds,
  expandSubcategoryIds,
} from './sourcingCategoryAliases'
import {
  PLATFORM_TO_SOURCING_INDUSTRY as PLATFORM_TO_SOURCING_INDUSTRY_MAP,
  SOURCING_INDUSTRY_TO_PLATFORM as SOURCING_INDUSTRY_TO_PLATFORM_MAP,
} from './intelligentSourcingIndustryMap'
import {
  SOURCING_TAXONOMY_VERSION,
  buildSourcingTaxonomyOverlay,
  getProfileSubIdsForParent,
} from './unifiedSourcingTaxonomy'
import { IDENTIFIED_ACCOUNT_FIELDS, publicCompanyDisplayName } from './accountPrivacy'
import { flattenSourcingMetricsFromAccount } from './sourcingMetrics'
import { companyPackSummary } from './companyProfilePack'

/** Design-canvas industry id → platform slug */
export const SOURCING_INDUSTRY_TO_PLATFORM = SOURCING_INDUSTRY_TO_PLATFORM_MAP

/** Platform slug → design-canvas industry id */
export const PLATFORM_TO_SOURCING_INDUSTRY = PLATFORM_TO_SOURCING_INDUSTRY_MAP

const CONT_BY_CC = {
  DE: 'EU', CZ: 'EU', SE: 'EU', PL: 'EU', PT: 'EU', TR: 'EU', FR: 'EU', IE: 'EU',
  LT: 'EU', ES: 'EU', GB: 'EU', UK: 'EU', UA: 'EU', MA: 'EU', DK: 'EU', IT: 'EU',
  NL: 'EU', BE: 'EU', AT: 'EU', CH: 'EU', HU: 'EU', RO: 'EU', SK: 'EU', SI: 'EU',
  HR: 'EU', FI: 'EU', NO: 'EU', US: 'NA', MX: 'NA', CA: 'NA', CN: 'APAC', JP: 'APAC',
  IN: 'APAC', KR: 'APAC', MY: 'APAC', TW: 'APAC', TH: 'APAC', SG: 'APAC', AU: 'APAC',
}

/** Read a numeric account field; never invent demo values. */
function optionalNumber(a, ...keys) {
  for (const key of keys) {
    const v = a?.[key]
    if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
      return Math.round(Number(v))
    }
  }
  return null
}

function daysSince(iso) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.max(0, Math.round((Date.now() - t) / 86400000))
}

function daysUntil(iso) {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return Math.round((t - Date.now()) / 86400000)
}

/** Profile completeness from account fields or stored score — no hash filler. */
function profileFromAccount(account) {
  const stored = optionalNumber(account, 'profileCompleteness', 'profile_completeness', 'profile')
  if (stored != null) return Math.min(100, Math.max(0, stored))
  const checks = [
    Boolean(String(account?.country || '').trim()),
    Boolean(String(account?.city || '').trim()),
    Boolean(String(account?.address || '').trim()),
    Array.isArray(account?.industries) && account.industries.length > 0,
    (account?.categories && Object.keys(account.categories).length > 0)
      || (account?.productCategories && Object.keys(account.productCategories).length > 0)
      || (Array.isArray(account?.serviceCategories) && account.serviceCategories.length > 0),
    Array.isArray(account?.certifications) && account.certifications.length > 0,
    Boolean(String(account?.contactName || account?.email || '').trim()),
  ]
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

function industryLabelsForAccount(a) {
  const ids = Array.isArray(a?.industries) ? a.industries : []
  const labels = new Set()
  ids.forEach((raw) => {
    const id = String(raw || '')
    if (!id) return
    if (INDUSTRY_LABELS[id]) labels.add(INDUSTRY_LABELS[id])
    const sourcingId = PLATFORM_TO_SOURCING_INDUSTRY[id] || id
    if (SOURCING_INDUSTRY_LABELS[sourcingId]) labels.add(SOURCING_INDUSTRY_LABELS[sourcingId])
    else if (!INDUSTRY_LABELS[id]) labels.add(id)
  })
  return [...labels]
}

function industryIdsForAccount(a) {
  const ids = Array.isArray(a?.industries) ? a.industries : []
  const out = new Set()
  ids.forEach((raw) => {
    const id = String(raw || '')
    if (!id) return
    out.add(id)
    const sourcingId = PLATFORM_TO_SOURCING_INDUSTRY[id]
    if (sourcingId) out.add(sourcingId)
  })
  return [...out]
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

/**
 * Flatten industry → parent → sub[] maps into Profile subcategory ids.
 * `*` / `__all__` expands to every Profile child under that parent (1:1 taxonomy).
 */
function collectSubcategoryIds(value, { domain, industries } = {}, parentId = '') {
  if (value == null) return []
  if (Array.isArray(value)) {
    const wantsAll = value.includes('*') || value.includes('__all__')
    if (wantsAll && domain && parentId) {
      return getProfileSubIdsForParent(domain, parentId, industries).map(String)
    }
    return value.filter((id) => id && id !== '*' && id !== '__all__').map(String)
  }
  if (typeof value === 'object') {
    const out = []
    Object.entries(value).forEach(([key, child]) => {
      collectSubcategoryIds(child, { domain, industries }, key).forEach((id) => out.push(id))
    })
    return out
  }
  const id = String(value || '').trim()
  return id && id !== '*' && id !== '__all__' ? [id] : []
}

function flattenSubcategoryIds(nested, opts = {}) {
  return [...new Set(collectSubcategoryIds(nested, opts))]
}

/**
 * @param {object} account registry seller / service provider
 */
export function accountToSourcingSupplier(account) {
  account = flattenSourcingMetricsFromAccount(account) || account
  const name = publicCompanyDisplayName(account, 'Registered supplier')
  const [lon, lat] = getApproximateLngLatOrFallback({
    country: account.country,
    city: account.city,
    address: account.address,
    seed: String(account.id || name),
  })
  const cc = countryCodeFromName(account.country)
  const certs = Array.isArray(account.certifications)
    ? account.certifications.map(String).filter(Boolean).slice(0, 8)
    : []
  const hasGeo = Boolean(String(account.country || '').trim() || String(account.city || '').trim())
  const hasIndustry = Array.isArray(account.industries) && account.industries.length > 0
  const incomplete = !hasGeo || !hasIndustry
  const accountTypes = [...collectAccountTypes(account)]
  if (!accountTypes.length) accountTypes.push('seller')
  const lead = optionalNumber(account, 'leadTimeDays', 'lead_time_days', 'engagementDays', 'deliveryTimeDays')
  const platformIndustries = Array.isArray(account.industries) ? account.industries.map(String) : []
  const equipmentCategoryIds = expandEquipmentCategoryIds(flattenCategoryIds(account.categories))
  const productCategoryIds = expandProductCategoryIds(
    flattenCategoryIds(account.productCategories || account.product_categories),
  )
  const serviceCategoryIds = expandServiceCategoryIds(
    Array.isArray(account.serviceCategories) ? account.serviceCategories.map(String) : [],
  )
  if (accountTypes.includes('auditor')) {
    if (!serviceCategoryIds.includes('audit-services')) {
      serviceCategoryIds.push('audit-services')
    }
    if (!serviceCategoryIds.includes('supplier-audit')) {
      serviceCategoryIds.push('supplier-audit')
    }
  }
  const categoryIds = [...new Set([
    ...equipmentCategoryIds,
    ...productCategoryIds,
    ...serviceCategoryIds,
  ])]
  /* Profile ids only — same ids as sourcing browse cards after taxonomy overlay. */
  const subcategoryIds = expandSubcategoryIds([
    ...flattenSubcategoryIds(account.equipmentSubcategories || account.equipment_subcategories, {
      domain: 'equipment',
      industries: platformIndustries,
    }),
    ...flattenSubcategoryIds(account.productSubcategories || account.product_subcategories, {
      domain: 'product',
      industries: platformIndustries,
    }),
  ])
  const storedStage = optionalNumber(account, 'stage', 'sourcingStage')
  const stage = storedStage != null ? storedStage : (incomplete ? 4 : 6)
  const published = account.published === true
    || (account.published !== false && !incomplete && stage >= 5)
  const priceIndex = optionalNumber(account, 'priceIndex', 'price_index')
  const delta = priceIndex != null
    ? priceIndex - 100
    : optionalNumber(account, 'delta', 'priceDelta')
  const auditIn = optionalNumber(account, 'auditIn', 'auditDueDays')
    ?? daysUntil(account.nextAuditAt || account.auditDueAt || account.auditExpiry)
  const certExpiry = optionalNumber(account, 'certExpiry', 'certExpiryDays')
    ?? daysUntil(account.certExpiryAt || account.certificateExpiry)
  const fin = account.financialGrade || account.fin || account.creditGrade || null
  const tariff = account.tariffRegime || account.tariff || 'None'
  const tier2 = account.tier2 || account.subTierStatus || account.tier2Status || 'Unknown'
  const auditLabel = account.auditStatus
    || (auditIn == null ? '—' : auditIn < 0 ? 'Overdue' : auditIn < 45 ? 'Due' : 'Passed')
  return {
    name,
    city: account.city || '—',
    cc,
    lat,
    lon,
    fit: optionalNumber(account, 'fitLevel', 'fit'),
    risk: optionalNumber(account, 'riskLevel', 'risk'),
    cap: optionalNumber(account, 'capacityLevel', 'capacity', 'utilisation', 'utilization'),
    onTime: optionalNumber(account, 'onTimePct', 'onTime', 'otd'),
    ppm: optionalNumber(account, 'qualityPpm', 'ppm'),
    lead,
    delta,
    spend: optionalNumber(account, 'annualSpend', 'spend', 'spendM'),
    quoteTurn: optionalNumber(account, 'quoteTurnDays', 'quoteTurn'),
    employees: optionalNumber(account, 'employees', 'employeeCount'),
    machines: optionalNumber(account, 'machines', 'machineCount'),
    shifts: optionalNumber(account, 'shifts'),
    respRate: optionalNumber(account, 'respRate', 'responseRate'),
    langs: (() => {
      const langs = account.langs || account.languages
      if (Array.isArray(langs)) return langs.map(String).filter(Boolean).join(' · ') || null
      const s = String(langs || '').trim()
      return s || null
    })(),
    profile: profileFromAccount(account),
    updatedDays: daysSince(account.updatedAt || account.registeredAt),
    certExpiry,
    certs,
    audit: auditLabel,
    auditIn,
    fin: fin || '—',
    tariff,
    tier2,
    industries: industryLabelsForAccount(account),
    industryIds: industryIdsForAccount(account),
    categoryIds,
    equipmentCategoryIds,
    productCategoryIds,
    serviceCategoryIds: [...new Set(serviceCategoryIds)],
    subcategoryIds,
    stage,
    published,
    platformId: account.id || null,
    source: 'registered',
    incomplete: !!incomplete,
    accountType: account.accountType || accountTypes[0] || 'seller',
    accountTypes,
    companyPack: companyPackSummary(account.profileAttachments || account.profile_attachments),
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
    accountType: 'seller',
    accountTypes: ['seller'],
    equipmentCategoryIds: Array.isArray(row.categories) ? row.categories.map(String) : [],
    productCategoryIds: Array.isArray(row.categories) ? row.categories.map(String) : [],
    serviceCategoryIds: [],
    categoryIds: Array.isArray(row.categories) ? row.categories.map(String) : [],
    industryIds: Array.isArray(row.industries) ? row.industries.map(String) : [],
  }
}

export function buildSourcingSuppliers({ registrySellers = [], includeSeeded = false } = {}) {
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
    return []
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

/** Drop empty compare/map fields so postMessage stays small. Keep 0 / false. */
export function slimSourcingSupplier(row) {
  if (!row || typeof row !== 'object') return row
  const out = {}
  Object.keys(row).forEach((key) => {
    const v = row[key]
    if (v == null || v === '') return
    if (v === '—') return
    if (Array.isArray(v) && v.length === 0) return
    out[key] = v
  })
  ;['lat', 'lon', 'risk', 'fit', 'cap', 'lead', 'name', 'platformId', 'source'].forEach((key) => {
    if (row[key] == null || row[key] === '') return
    out[key] = row[key]
  })
  IDENTIFIED_ACCOUNT_FIELDS.forEach((key) => {
    delete out[key]
  })
  delete out.profileAttachments
  delete out.profile_attachments
  return out
}

/**
 * Home-rail widgets: alerts, registration funnel, live network issues.
 * Registered platform accounts only — never design-canvas REG_STAGES / GAPS counts.
 */
export function sourcingAccountListed(x) {
  if (!x || !(x.source === 'registered' || x.platformId)) return false
  if (x.published === true) return true
  if (x.published === false) return false
  if (typeof x.stage === 'number') return x.stage >= 5
  return true
}

export function buildSourcingHomeWidgets({ suppliers = [], rfqs = [], buyers = [] } = {}) {
  const registered = (Array.isArray(suppliers) ? suppliers : []).filter(
    (s) => s && (s.source === 'registered' || s.platformId),
  )
  const listed = registered.filter(sourcingAccountListed)
  const stale = listed.filter((x) => Number(x.updatedDays) > 120).length
  const expiring = listed.filter(
    (x) => Number(x.certExpiry) < 90 || Number(x.auditIn) < 90,
  ).length
  const alerts = []
  if (expiring) {
    alerts.push({
      tone: 'amber',
      text: `${expiring} registered supplier${expiring === 1 ? '' : 's'} have certificates or audits due within 90 days.`,
      meta: 'Document-verified · live registry',
    })
  }
  if (stale) {
    alerts.push({
      tone: 'cyan',
      text: `${stale} supplier account${stale === 1 ? '' : 's'} not updated in 120 days.`,
      meta: 'Supplier-declared · live registry',
    })
  }
  if (!alerts.length && listed.length) {
    alerts.push({
      tone: 'green',
      text: `${listed.length} registered supplier${listed.length === 1 ? '' : 's'} on the platform — no open compliance alerts.`,
      meta: 'Live registry',
    })
  }
  if (!alerts.length) {
    alerts.push({
      tone: 'cyan',
      text: registered.length
        ? `${registered.length} registered account${registered.length === 1 ? '' : 's'} — none are map-visible yet.`
        : 'No registered suppliers on the platform yet.',
      meta: 'Live registry',
    })
  }

  const funnelTotal = registered.length
  const mapVisible = listed.length
  const incomplete = Math.max(0, funnelTotal - mapVisible)
  const rfqCount = Array.isArray(rfqs) ? rfqs.length : 0
  const plantCount = Array.isArray(buyers) ? buyers.length : 0

  const byCc = {}
  listed.forEach((s) => {
    const cc = String(s.cc || 'XX')
    byCc[cc] = (byCc[cc] || 0) + 1
  })
  const topShare = listed.length
    ? Math.max(0, ...Object.values(byCc)) / listed.length
    : 0

  const gaps = []
  if (!funnelTotal) {
    gaps.push({
      area: 'Coverage',
      sev: 'high',
      gap: 'No registered seller accounts are in this workspace network yet.',
      fix: 'Invite manufacturers or wait for sellers to complete registration so they appear on the map and RFQ lists.',
    })
  }
  if (incomplete > 0) {
    gaps.push({
      area: 'Registration path',
      sev: 'high',
      gap: `${incomplete} of ${funnelTotal} registered accounts are not map-visible (missing country/city or industry).`,
      fix: 'Sellers complete Profile geography and industry. Stage 5+ is when a pin is published to buyers.',
    })
  }
  if (expiring) {
    gaps.push({
      area: 'Certificates',
      sev: 'medium',
      gap: `${expiring} map-visible supplier${expiring === 1 ? '' : 's'} have a certificate or audit due within 90 days.`,
      fix: 'Ask those sellers to upload a current certificate, or filter RFQs to in-date plants.',
    })
  }
  if (stale) {
    gaps.push({
      area: 'Freshness',
      sev: 'medium',
      gap: `${stale} supplier profile${stale === 1 ? '' : 's'} have not been updated in 120 days.`,
      fix: 'Nudge sellers to refresh Profile. Stale records stay on the map but should not be treated as current.',
    })
  }
  if (!rfqCount) {
    gaps.push({
      area: 'RFQs',
      sev: 'low',
      gap: 'No network RFQs are on this home list yet.',
      fix: 'Create a Network RFQ from Sourcing to track quotes against registered plants.',
    })
  }
  if (!plantCount) {
    gaps.push({
      area: 'Logistics',
      sev: 'medium',
      gap: 'No receiving plant is set, so transit and map lanes cannot be calculated.',
      fix: 'Add country and city on your company Profile (or a receiving plant) so routes can be estimated.',
    })
  }
  if (listed.length >= 4 && topShare >= 0.7) {
    gaps.push({
      area: 'Concentration',
      sev: 'high',
      gap: `About ${Math.round(topShare * 100)}% of map-visible suppliers sit in one country — regional concentration is high.`,
      fix: 'Widen the RFQ or invite plants in other regions before awarding a single-source package.',
    })
  }

  const gapHeadline = gaps.length
    ? `${gaps.length} live issue${gaps.length === 1 ? '' : 's'} in your sourcing network`
    : 'No open network issues'
  const gapSub = funnelTotal
    ? 'From registered accounts, RFQs and receiving plants on this workspace — not the design-canvas sample.'
    : 'Live registry is empty. Invite sellers or complete profiles to populate this list.'

  return {
    alerts,
    alertsCount: alerts.length,
    mapVisible,
    funnelTotal,
    gaps,
    gapHeadline,
    gapSub,
  }
}

export function buildPlatformSourcingPayload({
  registrySellers = [],
  tenant,
  user,
  account,
  buyerIndustries = [],
  includeTaxonomy = true,
  rfqs = [],
} = {}) {
  /* Intelligent Sourcing lists/indicators use registered accounts only — never static seed. */
  const suppliers = buildSourcingSuppliers({
    registrySellers,
    includeSeeded: false,
  }).map(slimSourcingSupplier)
  const buyers = buildBuyerPlants({ tenant, user, account })
  const registeredIndustryIds = [
    ...new Set([
      ...registeredIndustryIdsFromAccounts(registrySellers),
      ...buyerIndustries.map((id) => PLATFORM_TO_SOURCING_INDUSTRY[id]).filter(Boolean),
    ]),
  ]
  const payload = {
    suppliers,
    buyers,
    registeredIndustryIds,
    taxonomyVersion: SOURCING_TAXONOMY_VERSION,
    userInitials: initialsFromUser(user, account),
    allowDemoSeed: false,
    homeWidgets: buildSourcingHomeWidgets({ suppliers, rfqs, buyers }),
  }
  if (includeTaxonomy) payload.taxonomy = buildSourcingTaxonomyOverlay()
  return payload
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
