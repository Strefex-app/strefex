import { getUserId, tenantKey } from './tenantStorage'

const STORAGE_KEY = 'strefex-buyer-ref-seq'

export function normalizeBuyerKey(emailOrUserId) {
  return String(emailOrUserId || '').trim().toLowerCase()
}

function loadMap() {
  try {
    const raw = localStorage.getItem(tenantKey(STORAGE_KEY))
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function saveMap(map) {
  try {
    localStorage.setItem(tenantKey(STORAGE_KEY), JSON.stringify(map))
  } catch {
    /* noop */
  }
}

/**
 * Next sequence number for this buyer (email) — shared across RFQs and service requests.
 */
export function allocateNextBuyerSequence(buyerEmail) {
  const key = normalizeBuyerKey(buyerEmail || getUserId())
  if (!key) return 1
  const map = loadMap()
  const next = (Number(map[key]) || 0) + 1
  map[key] = next
  saveMap(map)
  return next
}

export function formatBuyerRef(seq) {
  const n = Math.max(1, Math.floor(Number(seq) || 1))
  return `B-${String(n).padStart(4, '0')}`
}

/**
 * When one logical RFQ is sent to several suppliers, each seller sees …/01, …/02.
 * Single-supplier sends use the base reference only (no suffix).
 */
export function formatBuyerSplitRef(baseDisplay, index1Based, totalSuppliers) {
  if (!baseDisplay) return ''
  const t = Number(totalSuppliers) || 0
  if (t <= 1) return baseDisplay
  const idx = Math.max(1, Math.min(99, Math.floor(Number(index1Based) || 1)))
  return `${baseDisplay}/${String(idx).padStart(2, '0')}`
}
