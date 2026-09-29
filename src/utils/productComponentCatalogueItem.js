/**
 * Catalogue SKU mapping for local persist and `product_component_catalogue_items`.
 * Keep UUID-only company/user ids so local accounts do not fail Postgres.
 */

export const PRODUCT_CATALOGUE_CLOUD_COLUMNS = [
  'id',
  'company_id',
  'created_by',
  'seller_name',
  'industry_id',
  'category_id',
  'subcategory_id',
  'group_id',
  'name',
  'description',
  'material',
  'sku',
  'unit',
  'unit_price',
  'moq',
  'updated_at',
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function asUuid(value) {
  const s = String(value || '').trim()
  return UUID_RE.test(s) ? s : null
}

export function newCatalogueItemId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : ((r & 0x3) | 0x8)
    return v.toString(16)
  })
}

function finiteOrNull(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function normalizeProductCatalogueItem(row = {}) {
  return {
    id: asUuid(row.id) || newCatalogueItemId(),
    companyId: asUuid(row.companyId || row.company_id),
    createdBy: asUuid(row.createdBy || row.created_by),
    sellerName: String(row.sellerName || row.seller_name || '').trim(),
    industryId: String(row.industryId || row.industry_id || ''),
    categoryId: String(row.categoryId || row.category_id || ''),
    subcategoryId: String(row.subcategoryId || row.subcategory_id || ''),
    groupId: String(row.groupId || row.group_id || ''),
    name: String(row.name || '').trim(),
    description: String(row.description || '').trim(),
    material: String(row.material || '').trim(),
    sku: String(row.sku || '').trim(),
    unit: String(row.unit || 'pcs').trim() || 'pcs',
    unitPrice: finiteOrNull(row.unitPrice != null ? row.unitPrice : row.unit_price),
    moq: finiteOrNull(row.moq),
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
  }
}

export function isValidCatalogueItem(item) {
  return Boolean(item?.name && item.industryId && item.subcategoryId)
}

export function toProductCatalogueCloudRow(item) {
  return {
    id: item.id,
    company_id: item.companyId,
    created_by: item.createdBy,
    seller_name: item.sellerName || null,
    industry_id: item.industryId,
    category_id: item.categoryId,
    subcategory_id: item.subcategoryId,
    group_id: item.groupId || null,
    name: item.name,
    description: item.description || null,
    material: item.material || null,
    sku: item.sku || null,
    unit: item.unit,
    unit_price: Number.isFinite(item.unitPrice) ? item.unitPrice : null,
    moq: Number.isFinite(item.moq) ? item.moq : null,
    updated_at: new Date().toISOString(),
  }
}

export function catalogueItemsFingerprint(items = []) {
  if (!Array.isArray(items) || !items.length) return '0'
  return `${items.length}:${items.map((it) => it.id || it.sku || it.name || '').join('|')}`
}

export function canRemoveCatalogueItem(item, { role, userId } = {}) {
  if (role === 'superadmin') return true
  const uid = asUuid(userId)
  return Boolean(uid && item?.createdBy && item.createdBy === uid)
}

export function mergeCatalogueLocalAndRemote(remote = [], local = []) {
  const seen = new Set(remote.map((r) => r.id))
  return [...remote, ...local.filter((l) => !seen.has(l.id))]
}
