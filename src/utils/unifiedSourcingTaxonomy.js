/**
 * Unified taxonomy: Profile registration IDs are the Intelligent Sourcing browse/match IDs.
 * Overlay replaces canvas category/subcategory trees for industries that exist in Profile.
 */
import { getProductCategoryTreeForIndustry } from '../data/productCategoriesByIndustry'
import { getEquipmentCategoryTreeForIndustry } from '../data/equipmentByIndustryCategory'
import { AUDIT_SERVICE_ITEMS, AUDIT_SERVICES_CATEGORY_ID } from '../data/auditServices'
import { PLATFORM_TO_SOURCING_INDUSTRY } from './intelligentSourcingIndustryMap'

/** Bump when overlay shape changes so the iframe can skip a repeat taxonomy payload. */
export const SOURCING_TAXONOMY_VERSION = '2026-09-10'

const AUDIT_SERVICE_SUBS = AUDIT_SERVICE_ITEMS.map((i) => ({
  id: i.id,
  name: i.label,
  description: i.label,
}))

export const SERVICE_PROFILE_CATEGORIES = [
  { id: 'project-management', name: 'Project Management', description: 'Programme, APQP and industrialisation support' },
  { id: 'supplier-services', name: 'Supplier Services', description: 'Logistics, install, obsolescence and supplier ops' },
  { id: 'quality-services', name: 'Quality & Compliance', description: 'Validation, certification and inspection' },
  {
    id: AUDIT_SERVICES_CATEGORY_ID,
    name: 'Audit Services',
    description: 'Supplier, process, system, product and compliance audits',
    subcategories: AUDIT_SERVICE_SUBS,
  },
]

const PLATFORM_INDUSTRIES = Object.keys(PLATFORM_TO_SOURCING_INDUSTRY)

function catShape(c, icon) {
  const subs = Array.isArray(c.subcategories) ? c.subcategories : []
  return {
    id: String(c.id),
    name: String(c.name || c.id),
    icon,
    desc: String(c.description || ''),
    procs: subs.map((s) => String(s.name || s.id)),
    suppliers: 0,
    lead: 0,
    price: 0,
    headroom: 0,
    risk: 'low',
    fit: 70,
  }
}

function subShape(parentName, s, icon) {
  return {
    id: String(s.id),
    name: String(s.name || s.id),
    parent: parentName,
    icon,
    spec: [String(s.description || 'Registered capability')].filter(Boolean),
    suppliers: 0,
    lead: 0,
    price: 0,
    headroom: 0,
    fit: 70,
    risk: 'low',
    audited: 0,
    rfqs: 0,
    countries: 0,
    moq: 0,
  }
}

let _cached = null

/** @returns {{ categories: Record<string, object[]>, subcats: Record<string, object[]> }} */
export function buildSourcingTaxonomyOverlay() {
  if (_cached) return _cached
  const categories = {}
  const subcats = {}

  PLATFORM_INDUSTRIES.forEach((platformInd) => {
    const sourcingInd = PLATFORM_TO_SOURCING_INDUSTRY[platformInd]
    if (!sourcingInd) return

    const productKey = `product:${sourcingInd}`
    const productTree = getProductCategoryTreeForIndustry(platformInd)
    if (productTree.length) {
      categories[productKey] = productTree.map((c) => catShape(c, 'package'))
      productTree.forEach((c) => {
        const subs = Array.isArray(c.subcategories) ? c.subcategories : []
        subcats[`${productKey}:${c.id}`] = subs.map((s) => subShape(c.name, s, 'package'))
      })
    }

    const equipmentKey = `equipment:${sourcingInd}`
    const equipmentTree = getEquipmentCategoryTreeForIndustry(platformInd)
    if (equipmentTree.length) {
      categories[equipmentKey] = equipmentTree.map((c) => catShape(c, 'cog'))
      equipmentTree.forEach((c) => {
        const subs = Array.isArray(c.subcategories) ? c.subcategories : []
        subcats[`${equipmentKey}:${c.id}`] = subs.map((s) => subShape(c.name, s, 'cog'))
      })
    }

    const serviceKey = `service:${sourcingInd}`
    categories[serviceKey] = SERVICE_PROFILE_CATEGORIES.map((c) => catShape(c, 'clipboardCheck'))
    SERVICE_PROFILE_CATEGORIES.forEach((c) => {
      const subs = Array.isArray(c.subcategories) ? c.subcategories : []
      subcats[`${serviceKey}:${c.id}`] = subs.map((s) => subShape(c.name, s, 'clipboardCheck'))
    })
  })

  _cached = { categories, subcats }
  return _cached
}

/**
 * All Profile subcategory ids under a parent (optionally scoped to account industries).
 */
export function getProfileSubIdsForParent(domain, parentId, platformIndustryIds = []) {
  const { subcats } = buildSourcingTaxonomyOverlay()
  const parent = String(parentId || '')
  if (!parent) return []
  const domainPrefix = domain === 'equipment' ? 'equipment:' : 'product:'
  const wantedSourcing = new Set(
    (Array.isArray(platformIndustryIds) ? platformIndustryIds : [])
      .map((id) => PLATFORM_TO_SOURCING_INDUSTRY[id] || id)
      .filter(Boolean),
  )
  const out = new Set()
  Object.keys(subcats).forEach((key) => {
    if (!key.startsWith(domainPrefix) || !key.endsWith(`:${parent}`)) return
    const industryPart = key.slice(domainPrefix.length, key.length - parent.length - 1)
    if (wantedSourcing.size && !wantedSourcing.has(industryPart)) return
    ;(subcats[key] || []).forEach((s) => out.add(String(s.id)))
  })
  if (!out.size) {
    Object.keys(subcats).forEach((key) => {
      if (!key.startsWith(domainPrefix) || !key.endsWith(`:${parent}`)) return
      ;(subcats[key] || []).forEach((s) => out.add(String(s.id)))
    })
  }
  return [...out]
}
