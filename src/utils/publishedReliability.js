/**
 * Opted-in manufacturer reliability cards for the Network.
 * Intentionally not tenant-scoped — buyers must be able to read the public slice.
 * Never put lots, NCRs, drawings, or other-customer data on this card.
 */
const PUBLISH_KEY = 'strefex-published-reliability'

function namesEqual(a, b) {
  const na = String(a || '').trim().toLowerCase()
  const nb = String(b || '').trim().toLowerCase()
  return Boolean(na && nb && na === nb)
}

function normalizeCompanyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+(gmbh|ltd|llc|inc|co|corp|ag|sa|srl|ooo|plc)\.?$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function readPublishedReliability() {
  try {
    const raw = localStorage.getItem(PUBLISH_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((row) => row && typeof row === 'object') : []
  } catch {
    return []
  }
}

export function writePublishedReliability(card) {
  if (!card || typeof card !== 'object') return []
  const list = readPublishedReliability()
  const next = [card, ...list.filter((row) => {
    if (card.companyId && row.companyId === card.companyId) return false
    if (!card.companyId && namesEqual(row.companyName, card.companyName)) return false
    return true
  })]
  try {
    localStorage.setItem(PUBLISH_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  return next
}

export function matchPublishedReliability(supplier) {
  if (!supplier) return null
  const list = readPublishedReliability()
  const idHints = [
    supplier.company_id,
    supplier.companyId,
    supplier.tenant_id,
    supplier.id,
    supplier.supplier_id,
  ].filter(Boolean).map(String)
  const name = supplier.legal_name || supplier.display_name || supplier.displayName || supplier.name
  const normalized = normalizeCompanyName(name)
  return list.find((card) => {
    if (card.companyId && idHints.includes(String(card.companyId))) return true
    if (namesEqual(card.companyName, name)) return true
    if (normalized && normalizeCompanyName(card.companyName) === normalized) return true
    return false
  }) || null
}

export function attachReliability(supplier) {
  const card = matchPublishedReliability(supplier)
  if (!card) return supplier
  return { ...supplier, reliabilityCard: card }
}
