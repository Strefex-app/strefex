const rawMergeCache = new Map()
const mergedPoolCache = new Map()
const poolBuildPromises = new Map()
const cardPageCache = new Map()

/** Keep in sync with supplierDatabase INDUSTRY_LABELS — avoids eager import of the full DB module. */
const INDUSTRY_LABELS = {
  automotive: 'Automotive',
  machinery: 'Machinery',
  electronics: 'Electronics',
  medical: 'Medical',
  'raw-materials': 'Raw Materials',
  'oil-gas': 'Oil & Gas',
  nuclear: 'Nuclear',
  'green-energy': 'Green Energy',
  'household-products': 'Household Products',
}

let supplierDbPromise = null

function loadSupplierDatabaseModule() {
  if (!supplierDbPromise) {
    supplierDbPromise = import('../data/supplierDatabase')
  }
  return supplierDbPromise
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function yieldToMain() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 0)
  })
}

async function getMergedPoolAsync(showMarketplaceCatalog) {
  const key = showMarketplaceCatalog ? '1' : '0'
  if (mergedPoolCache.has(key)) return mergedPoolCache.get(key)
  if (!poolBuildPromises.has(key)) {
    poolBuildPromises.set(key, (async () => {
      await yieldToMain()
      await yieldToMain()
      const db = await loadSupplierDatabaseModule()
      await yieldToMain()
      const pool = db.filterSuppliersRespectingCatalogVisibility(
        db.getAllSuppliersIncludingRegistry(),
        showMarketplaceCatalog,
      )
      mergedPoolCache.set(key, pool)
      poolBuildPromises.delete(key)
      return pool
    })())
  }
  return poolBuildPromises.get(key)
}

function registrySellerToExecRow(account) {
  return {
    id: account.id,
    name: account.company,
    country: account.country || '—',
    city: account.city || '—',
    industries: account.industries || [],
    categories: Object.values(account.categories || {}).flat(),
    source: 'registered',
    rating: account.rating ?? 0,
    riskLevel: account.riskLevel ?? 50,
    fitLevel: account.fitLevel ?? 50,
    certifications: account.certifications || [],
    established: account.established ?? null,
    employees: account.employees ?? null,
  }
}

function filterPoolByIndustryAndCategory(pool, industryId, categoryId) {
  return pool.filter((row) => {
    if (!(row.industries || []).includes(industryId)) return false
    if (!categoryId) return true
    return (row.categories || []).includes(categoryId)
  })
}

export function isSupplierUuid(id) {
  return UUID_RE.test(String(id || ''))
}

/** Anonymous label: #01 … #9999, then #10000+ with wider padding. */
export function formatMaskedManufacturerLabel(index) {
  const n = Number(index) + 1
  if (!Number.isFinite(n) || n < 1) return 'Manufacturer #01'
  const pad = n > 9999 ? String(n).length : n > 99 ? 4 : 2
  return `Manufacturer #${String(n).padStart(pad, '0')}`
}

export function canSeeManufacturerDetails({ hasExecutiveSummary, isSuperAdmin, isPreviewSession }) {
  if (isPreviewSession) return false
  return Boolean(hasExecutiveSummary || isSuperAdmin)
}

export function execSummaryRowToCardRow(s, industryId, categoryLabel = '') {
  const id = s.id
  const uuid = isSupplierUuid(id)
  const categoryHint = categoryLabel
    || (Array.isArray(s.categories) && s.categories.length
      ? `Categories: ${s.categories.slice(0, 4).join(', ')}`
      : undefined)
  return {
    supplier_id: uuid ? id : id,
    id,
    display_name: s.name,
    legal_name: s.name,
    country: s.country,
    industry: INDUSTRY_LABELS[industryId] || industryId || 'General',
    industries: s.industries || (industryId ? [industryId] : []),
    categories: s.categories || [],
    description: categoryHint,
    overall_score: s.rating != null ? Math.round(Number(s.rating) * 20) : undefined,
    risk_score: s.riskLevel,
    profile_completeness: s.source === 'registered' ? 78 : 62,
    certifications: s.certifications || [],
    source: s.source || 'directory',
    _canShortlist: uuid,
    _execSummary: true,
  }
}

export function hydrateShortlistEntryToCardRow(entry, bundle) {
  const sid = entry?.supplier_id || entry?.id
  const s = bundle?.supplier
  const scoreRow = bundle?.score
  if (!s) {
    return {
      supplier_id: sid,
      id: sid,
      display_name: String(sid || 'Supplier'),
      _connected: true,
      _canShortlist: isSupplierUuid(sid),
    }
  }
  return {
    supplier_id: s.id,
    id: s.id,
    display_name: s.display_name || s.legal_name || 'Supplier',
    legal_name: s.legal_name,
    country: s.country,
    industry: s.industry,
    categories: s.metadata?.categories || [],
    description: s.metadata?.description || s.metadata?.tagline,
    overall_score: scoreRow?.overall_score,
    risk_score: scoreRow?.risk_score,
    profile_completeness: Number(s.metadata?.profile_completeness || scoreRow?.profile_completeness || 0),
    certifications: s.metadata?.certifications || s.certifications || [],
    source: 'connected',
    _connected: true,
    _canShortlist: true,
  }
}

/**
 * Same merge rules as Executive Summary: supplierDatabase pool + registered sellers,
 * scoped by industry and optional equipment/product category.
 */
async function getRawDirectoryManufacturersAsync(
  industryId,
  categoryId,
  registeredSellers,
  showMarketplaceCatalog,
) {
  if (!industryId) return []
  const cacheKey = `${industryId}|${categoryId || 'all'}|${showMarketplaceCatalog ? '1' : '0'}`
  if (rawMergeCache.has(cacheKey)) return rawMergeCache.get(cacheKey)

  const pool = await getMergedPoolAsync(showMarketplaceCatalog)
  await yieldToMain()

  const staticSuppliers = filterPoolByIndustryAndCategory(pool, industryId, categoryId)
  const staticNames = new Set(staticSuppliers.map((row) => String(row.name || '').toLowerCase()))
  const fromRegistry = (registeredSellers || [])
    .filter((acct) => !staticNames.has(String(acct.company || '').toLowerCase()))
    .map(registrySellerToExecRow)
  const merged = [...staticSuppliers, ...fromRegistry]
  rawMergeCache.set(cacheKey, merged)
  return merged
}

/**
 * Load one page of directory manufacturers (executive summary database).
 */
export async function loadDiscoverDirectoryPage({
  industryId,
  categoryId = '',
  categoryLabel = '',
  registeredSellers,
  showMarketplaceCatalog,
  offset = 0,
  limit = 24,
  signal,
}) {
  if (!industryId) return { total: 0, rows: [] }

  const pageKey = `${industryId}|${categoryId || 'all'}|${showMarketplaceCatalog ? '1' : '0'}|${offset}|${limit}`
  if (cardPageCache.has(pageKey)) return cardPageCache.get(pageKey)

  await yieldToMain()
  if (signal?.cancelled) return { total: 0, rows: [] }

  const raw = await getRawDirectoryManufacturersAsync(
    industryId,
    categoryId,
    registeredSellers,
    showMarketplaceCatalog,
  )
  if (signal?.cancelled) return { total: 0, rows: [] }

  const total = raw.length
  const slice = raw.slice(offset, offset + limit)
  const rows = []

  for (let i = 0; i < slice.length; i += 1) {
    rows.push(execSummaryRowToCardRow(slice[i], industryId, categoryLabel))
    if (i > 0 && i % 6 === 0) {
      await yieldToMain()
      if (signal?.cancelled) return { total, rows: [] }
    }
  }

  const result = { total, rows }
  cardPageCache.set(pageKey, result)
  return result
}

export function filterManufacturersByIndustry(rows, industryId) {
  if (!industryId) return rows || []
  const label = INDUSTRY_LABELS[industryId]
  return (rows || []).filter((row) => {
    if (Array.isArray(row.industries) && row.industries.includes(industryId)) return true
    const ind = String(row.industry || '').toLowerCase()
    if (ind === String(industryId).toLowerCase()) return true
    if (label && ind === label.toLowerCase()) return true
    return row._connected && !row.industry
  })
}

export function filterManufacturersByCategory(rows, categoryId) {
  if (!categoryId) return rows || []
  return (rows || []).filter((row) => {
    if (Array.isArray(row.categories) && row.categories.includes(categoryId)) return true
    return row._connected && (!row.categories || row.categories.length === 0)
  })
}
