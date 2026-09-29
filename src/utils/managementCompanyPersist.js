/**
 * Management tools → company snapshots + Enterprise profile roll-ups
 * (Production equipment → CAPEX, Cost Management products → enterprise products).
 */
import useEnterpriseStore from '../store/enterpriseStore'
import useProductionStore from '../store/productionStore'
import useCostStore from '../store/costStore'
import { devWarn } from './devLog'

/** Workspace keys flushed immediately when a management module writes a record. */
export const MANAGEMENT_IMMEDIATE_KEYS = [
  'programs',
  'projects',
  'vendors',
  'rfqs',
  'contracts',
  'procurement',
  'cost',
  'enterprise',
  'production',
  'quality_excellence',
  'iatf_control',
  'templates',
  'audit_logs',
  'audit_pro',
  'hr_space',
  'account_registry',
  'rfq_intelligence',
  'forum',
]

export const MANAGEMENT_IMMEDIATE_KEY_SET = new Set(MANAGEMENT_IMMEDIATE_KEYS)

function nameKey(value) {
  return String(value || '').trim().toLowerCase()
}

function capexSignature(rows) {
  return JSON.stringify(
    (Array.isArray(rows) ? rows : []).map((r) => [
      r.id,
      r.name,
      r.category,
      Number(r.amount) || 0,
      Number(r.usefulLife) || 0,
      Number(r.yearAcquired) || 0,
    ]),
  )
}

function productSignature(rows) {
  return JSON.stringify(
    (Array.isArray(rows) ? rows : []).map((r) => [
      r.id,
      r.name,
      r.sku,
      Number(r.sellingPrice) || 0,
      Number(r.unitsPerMonth) || 0,
      Number(r.directMaterialCost) || 0,
    ]),
  )
}

export function isRfqIntelligenceSnapshotEmpty(p) {
  return (
    !p ||
    ((!Array.isArray(p.quotes) || p.quotes.length === 0) &&
      !p.lastCalculatorSnapshot &&
      !p.lastEstimateForRfq)
  )
}

/**
 * Floor equipment becomes CAPEX rows; amounts and lives stay on matching assets.
 * Extra CAPEX (buildings, IT, quote tooling) is kept.
 */
export function buildCapexFromEquipment(equipment, existingCapex = []) {
  const list = Array.isArray(equipment) ? equipment : []
  const existing = Array.isArray(existingCapex) ? existingCapex : []
  if (list.length === 0) return existing

  const existingByName = new Map()
  existing.forEach((row) => {
    const key = nameKey(row.name)
    if (key && !existingByName.has(key)) existingByName.set(key, row)
  })

  const fromEq = list.map((eq) => {
    const prev = existingByName.get(nameKey(eq.name))
    return {
      id: prev?.id || `cx-eq-${eq.id}`,
      name: eq.name || prev?.name || 'Equipment',
      category: prev?.category || 'Equipment',
      amount: Number(prev?.amount) || 0,
      usefulLife: Number(prev?.usefulLife) || 10,
      yearAcquired: Number(prev?.yearAcquired) || new Date().getFullYear(),
      description: prev?.description || eq.type || 'From Production Management',
      source: 'production',
      equipmentId: eq.id,
    }
  })

  const used = new Set(fromEq.map((r) => nameKey(r.name)))
  const extras = existing.filter((row) => !used.has(nameKey(row.name)))
  return [...fromEq, ...extras]
}

/**
 * Cost Management products feed Enterprise product-cost rows.
 * Hours, packaging, and volume already on Enterprise are kept.
 */
export function buildEnterpriseProductsFromCostProducts(costProducts, existingProducts = []) {
  const list = Array.isArray(costProducts) ? costProducts : []
  const existing = Array.isArray(existingProducts) ? existingProducts : []
  if (list.length === 0) return existing

  const bySku = new Map()
  const byName = new Map()
  existing.forEach((row) => {
    const sku = nameKey(row.sku)
    if (sku) bySku.set(sku, row)
    const name = nameKey(row.name)
    if (name && !byName.has(name)) byName.set(name, row)
  })

  const usedIds = new Set()
  const fromCost = list.map((cp) => {
    const prev = (cp.sku && bySku.get(nameKey(cp.sku))) || byName.get(nameKey(cp.name))
    if (prev?.id) usedIds.add(prev.id)
    const materials = Number(cp.costBreakdown?.materials)
    const logistics = Number(cp.costBreakdown?.logistics)
    return {
      id: prev?.id || `prd-cost-${cp.id}`,
      name: cp.name || prev?.name || 'Product',
      sku: cp.sku || prev?.sku || '',
      sellingPrice: Number(cp.sellingPrice ?? prev?.sellingPrice) || 0,
      unitsPerMonth: Number(prev?.unitsPerMonth) || 0,
      directMaterialCost: Number.isFinite(materials) ? materials : (Number(prev?.directMaterialCost) || 0),
      directLaborHours: Number(prev?.directLaborHours) || 0,
      machineHours: Number(prev?.machineHours) || 0,
      packagingCost: Number(prev?.packagingCost) || (Number.isFinite(logistics) ? logistics : 0),
      shippingCost: Number(prev?.shippingCost) || 0,
      source: 'cost_management',
      costProductId: cp.id,
    }
  })

  const extras = existing.filter((row) => !usedIds.has(row.id))
  return [...fromCost, ...extras]
}

function notifyEnterprise() {
  if (typeof window === 'undefined') return
  import('../services/workspaceCloudSync')
    .then((m) => {
      if (typeof m.notifyWorkspaceKeyDirty === 'function') {
        m.notifyWorkspaceKeyDirty('enterprise', true)
      }
    })
    .catch((err) => devWarn('enterprise sync skipped', err))
}

export function applyManagementLinksToEnterprise() {
  const ent = useEnterpriseStore.getState()
  const equipment = useProductionStore.getState().equipment
  const costProducts = useCostStore.getState().products
  const capex = buildCapexFromEquipment(equipment, ent.capex)
  const products = buildEnterpriseProductsFromCostProducts(costProducts, ent.products)
  const capexChanged = capexSignature(capex) !== capexSignature(ent.capex)
  const productsChanged = productSignature(products) !== productSignature(ent.products)
  if (!capexChanged && !productsChanged) return false
  const next = {}
  if (capexChanged) next.capex = capex
  if (productsChanged) next.products = products
  useEnterpriseStore.setState(next)
  notifyEnterprise()
  return true
}

let enterpriseLinksBound = false

export function bindManagementEnterpriseLinks() {
  if (typeof window === 'undefined' || import.meta.env?.VITEST) return
  if (enterpriseLinksBound) return
  enterpriseLinksBound = true
  queueMicrotask(() => {
    applyManagementLinksToEnterprise()
    let lastEq = useProductionStore.getState().equipment
    let lastProducts = useCostStore.getState().products
    useProductionStore.subscribe((s) => {
      if (s.equipment === lastEq) return
      lastEq = s.equipment
      applyManagementLinksToEnterprise()
    })
    useCostStore.subscribe((s) => {
      if (s.products === lastProducts) return
      lastProducts = s.products
      applyManagementLinksToEnterprise()
    })
  })
}

if (typeof window !== 'undefined' && !import.meta.env?.VITEST) {
  bindManagementEnterpriseLinks()
}
