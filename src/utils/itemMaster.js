/**
 * Shared item master: IATF part numbers ↔ Cost BOM product SKUs.
 */

export function itemMasterKey(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function buildItemMasterIndex({ parts = [], products = [] } = {}) {
  const byKey = new Map()

  ;(parts || []).forEach((part) => {
    const key = itemMasterKey(part.partNumber || part.sku)
    if (!key) return
    const cur = byKey.get(key) || {
      key,
      partNumber: part.partNumber || part.sku,
      name: part.name || '',
      part: null,
      product: null,
    }
    cur.part = part
    cur.name = part.name || cur.name
    byKey.set(key, cur)
  })

  ;(products || []).forEach((product) => {
    const key = itemMasterKey(product.sku || product.partNumber)
    if (!key) return
    const cur = byKey.get(key) || {
      key,
      partNumber: product.sku || product.partNumber,
      name: product.name || '',
      part: null,
      product: null,
    }
    cur.product = product
    cur.name = product.name || cur.name
    byKey.set(key, cur)
  })

  return [...byKey.values()].sort((a, b) => a.partNumber.localeCompare(b.partNumber))
}

export function findCostProductForPart(part, products = []) {
  const key = itemMasterKey(part?.partNumber || part?.sku)
  if (!key) return null
  return (products || []).find((p) => itemMasterKey(p.sku || p.partNumber) === key) || null
}

export const findCostProductForPartAlias = findCostProductForPart

export function findIatfPartForProduct(product, parts = []) {
  const key = itemMasterKey(product?.sku || product?.partNumber)
  if (!key) return null
  return (parts || []).find((p) => itemMasterKey(p.partNumber || p.sku) === key) || null
}

export function costProductDraftFromPart(part) {
  return {
    name: part.name || part.partNumber || 'New product',
    sku: part.partNumber || '',
    category: 'Manufactured',
    targetCost: 0,
    currentCost: 0,
    sellingPrice: 0,
    currency: 'USD',
    status: 'active',
    version: part.revision || 'A',
    costBreakdown: { materials: 0, labor: 0, overhead: 0, tooling: 0, logistics: 0 },
    bom: [],
    iatfPartId: part.id || '',
  }
}
