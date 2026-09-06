/**
 * Profile fields required for Network map / compare / RFQ visibility.
 * Also maintains a device-wide manufacturer directory so buyers see sellers
 * registered in other scoped registry slices on the same browser.
 */

import { getApproximateLngLat } from './accountApproximateLocation'

export const SOURCING_VISIBILITY_FIELDS = [
  { key: 'country', label: 'Country', requiredFor: ['seller', 'service_provider', 'buyer'] },
  { key: 'city', label: 'City', requiredFor: ['seller', 'service_provider', 'buyer'] },
  { key: 'address', label: 'Plant / site address', requiredFor: ['seller', 'service_provider'] },
  { key: 'industries', label: 'Industry', requiredFor: ['seller', 'service_provider', 'buyer'], isArray: true },
]

/** Shared manufacturer index — readable by every account type on this device. */
export const NETWORK_MANUFACTURERS_KEY = 'strefex-network-manufacturers'

function hasValue(account, field) {
  if (field.isArray) {
    return Array.isArray(account?.[field.key]) && account[field.key].length > 0
  }
  const v = account?.[field.key]
  return typeof v === 'string' ? v.trim().length > 0 : v != null && v !== ''
}

function isSellerLike(account) {
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
  return types.has('seller') || types.has('service_provider')
}

function hasUsableCoordinates(coords) {
  return Array.isArray(coords)
    && coords.length === 2
    && Number.isFinite(Number(coords[0]))
    && Number.isFinite(Number(coords[1]))
    && !(Number(coords[0]) === 0 && Number(coords[1]) === 0)
}

/**
 * Attach map coordinates when country (or resolvable geo) is known.
 * Does not invent ocean-fallback pins into persisted registry data.
 */
export function ensureAccountMapCoordinates(account) {
  if (!account || typeof account !== 'object') return account
  if (hasUsableCoordinates(account.coordinates)) return account
  if (!String(account.country || '').trim() && !String(account.city || '').trim()) return account
  const coords = getApproximateLngLat({
    country: account.country,
    city: account.city,
    address: account.address,
    seed: String(account.id || account.email || account.company || ''),
  })
  if (!coords) return account
  return {
    ...account,
    coordinates: coords,
    mapRegisteredAt: account.mapRegisteredAt || new Date().toISOString(),
  }
}

/**
 * Ensure registry accounts have sourcing fields + map coordinates when possible.
 */
export function ensureSourcingFieldPlaceholders(account) {
  if (!account || typeof account !== 'object') return account
  let next = { ...account }
  let changed = false
  if (!('country' in next) || next.country == null) { next.country = ''; changed = true }
  if (!('city' in next) || next.city == null) { next.city = ''; changed = true }
  if (!('address' in next) || next.address == null) { next.address = ''; changed = true }
  if (!Array.isArray(next.industries)) { next.industries = []; changed = true }
  if (!next.categories || typeof next.categories !== 'object') { next.categories = {}; changed = true }
  if (!Array.isArray(next.serviceCategories)) { next.serviceCategories = []; changed = true }
  const withCoords = ensureAccountMapCoordinates(next)
  if (withCoords !== next) {
    next = withCoords
    changed = true
  }
  return changed ? next : account
}

export function getAccountSourcingGaps(account) {
  if (!account) return SOURCING_VISIBILITY_FIELDS.map((f) => f.key)
  const type = String(account.accountType || 'seller').toLowerCase()
  return SOURCING_VISIBILITY_FIELDS
    .filter((f) => f.requiredFor.includes(type))
    .filter((f) => !hasValue(account, f))
    .map((f) => f.key)
}

export function accountVisibleOnSourcingMap(account) {
  if (!account || account.status === 'canceled') return false
  if (!isSellerLike(account)) return false
  return Boolean(String(account.country || '').trim()) || Boolean(String(account.city || '').trim())
}

export function describeSourcingGaps(gaps) {
  const labels = {
    country: 'country',
    city: 'city',
    address: 'plant address',
    industries: 'industry',
  }
  return gaps.map((g) => labels[g] || g)
}

function manufacturerDirectoryRow(account) {
  const ensured = ensureSourcingFieldPlaceholders(account)
  const accountType = (() => {
    const types = Array.isArray(ensured.accountTypes) ? ensured.accountTypes : []
    if (types.includes('seller')) return 'seller'
    if (types.includes('service_provider')) return 'service_provider'
    return ensured.accountType || 'seller'
  })()
  return {
    id: ensured.id,
    email: ensured.email || '',
    company: ensured.company || ensured.name || '',
    contactName: ensured.contactName || '',
    accountType,
    accountTypes: Array.isArray(ensured.accountTypes) ? ensured.accountTypes : [accountType],
    status: ensured.status || 'active',
    country: ensured.country || '',
    city: ensured.city || '',
    address: ensured.address || '',
    industries: Array.isArray(ensured.industries) ? ensured.industries : [],
    categories: ensured.categories && typeof ensured.categories === 'object' ? ensured.categories : {},
    productCategories: ensured.productCategories && typeof ensured.productCategories === 'object' ? ensured.productCategories : {},
    equipmentSubcategories: ensured.equipmentSubcategories && typeof ensured.equipmentSubcategories === 'object' ? ensured.equipmentSubcategories : {},
    productSubcategories: ensured.productSubcategories && typeof ensured.productSubcategories === 'object' ? ensured.productSubcategories : {},
    serviceCategories: Array.isArray(ensured.serviceCategories) ? ensured.serviceCategories : [],
    coordinates: hasUsableCoordinates(ensured.coordinates) ? ensured.coordinates : null,
    certifications: Array.isArray(ensured.certifications) ? ensured.certifications : [],
    plan: ensured.plan || null,
    registeredAt: ensured.registeredAt || null,
    mapRegisteredAt: ensured.mapRegisteredAt || null,
    updatedAt: ensured.updatedAt || new Date().toISOString(),
    source: 'network_directory',
  }
}

export function loadNetworkManufacturers() {
  try {
    const raw = localStorage.getItem(NETWORK_MANUFACTURERS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveNetworkManufacturers(rows) {
  try {
    localStorage.setItem(NETWORK_MANUFACTURERS_KEY, JSON.stringify(rows))
  } catch { /* quota */ }
}

/**
 * Upsert seller / service_provider accounts into the shared manufacturer directory
 * when they have enough geo to appear on the map.
 * @returns {number} rows written (visible manufacturers after merge)
 */
export function publishAccountsToNetworkDirectory(accounts = []) {
  const existing = loadNetworkManufacturers()
  const byKey = new Map()
  existing.forEach((row) => {
    const key = String(row.email || row.id || '').toLowerCase()
    if (key) byKey.set(key, row)
  })

  let published = 0
  ;(Array.isArray(accounts) ? accounts : []).forEach((account) => {
    if (!isSellerLike(account) || account.status === 'canceled') return
    if (!accountVisibleOnSourcingMap(account)) return
    const row = manufacturerDirectoryRow(account)
    const key = String(row.email || row.id || '').toLowerCase()
    if (!key) return
    byKey.set(key, row)
    published += 1
  })

  const next = [...byKey.values()].filter((row) => row.status !== 'canceled')
  saveNetworkManufacturers(next)
  return published
}

/**
 * Harvest every local registry slice + publish sellers with geo onto the network directory.
 * Call after login / on Home & Intelligent Sourcing mount.
 * @returns {{ ensured: number, published: number, visible: number }}
 */
export function registerExistingAccountsOntoSourcingNetwork() {
  const byEmail = new Map()
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key || (!key.startsWith('strefex-account-registry') && key !== 'strefex-account-registry')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) continue
      arr.forEach((a) => {
        const em = String(a?.email || '').trim().toLowerCase()
        if (!em) return
        const prev = byEmail.get(em)
        const t = new Date(a?.updatedAt || a?.registeredAt || 0).getTime()
        const pt = prev ? new Date(prev?.updatedAt || prev?.registeredAt || 0).getTime() : -1
        if (!prev || t >= pt) byEmail.set(em, a)
      })
    }
  } catch { /* */ }

  const harvested = [...byEmail.values()].map(ensureSourcingFieldPlaceholders)
  let ensured = 0
  harvested.forEach((a) => {
    if (isSellerLike(a) && accountVisibleOnSourcingMap(a)) ensured += 1
  })
  const published = publishAccountsToNetworkDirectory(harvested)
  const visible = loadNetworkManufacturers().filter(accountVisibleOnSourcingMap).length
  return { ensured, published, visible }
}

/**
 * Manufacturers for map / sourcing list: scoped session accounts + shared directory.
 */
export function mergeNetworkManufacturersWithAccounts(accounts = []) {
  const scoped = (Array.isArray(accounts) ? accounts : [])
    .filter((a) => isSellerLike(a) && a.status !== 'canceled')
    .map(ensureSourcingFieldPlaceholders)
  const directory = loadNetworkManufacturers().map(ensureSourcingFieldPlaceholders)
  const byKey = new Map()
  ;[...directory, ...scoped].forEach((a) => {
    const key = String(a.email || a.id || '').toLowerCase()
    if (!key) return
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, a)
      return
    }
    const t = new Date(a.updatedAt || a.registeredAt || 0).getTime()
    const pt = new Date(prev.updatedAt || prev.registeredAt || 0).getTime()
    byKey.set(key, t >= pt ? { ...prev, ...a } : { ...a, ...prev })
  })
  return [...byKey.values()].filter(
    (a) => a.status !== 'canceled' && accountVisibleOnSourcingMap(a),
  )
}
