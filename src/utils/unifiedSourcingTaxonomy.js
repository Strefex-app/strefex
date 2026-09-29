/**
 * Unified taxonomy: Profile registration IDs are the Intelligent Sourcing browse/match IDs.
 * Overlay replaces canvas category/subcategory trees for industries that exist in Profile.
 */
import { getProductCategoryTreeForIndustry } from '../data/productCategoriesByIndustry'
import { getEquipmentCategoryTreeForIndustry } from '../data/equipmentByIndustryCategory'
import { PRODUCT_CATALOGUE_GROUPS, buildCatalogueExtFromTaxonomy } from '../data/productComponentCatalogue'
import { PRODUCT_CATEGORIES_BY_INDUSTRY } from '../data/productComponentTaxonomy'
import { AUDIT_SERVICE_ITEMS, AUDIT_SERVICES_CATEGORY_ID } from '../data/auditServices'
import { PLATFORM_TO_SOURCING_INDUSTRY } from './intelligentSourcingIndustryMap'

/** Bump when overlay shape changes so the iframe can skip a repeat taxonomy payload. */
export const SOURCING_TAXONOMY_VERSION = '2026-09-27-no-equipment-spares'

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
    icon: c.icon || icon,
    desc: String(c.description || ''),
    procs: subs.map((s) => String(s.name || s.id)),
    suppliers: 0,
    lead: 0,
    price: 0,
    headroom: 0,
    risk: 'low',
    fit: 70,
    partFirst: true,
  }
}

function subShape(parentName, s, icon) {
  const spec = Array.isArray(s.specs) && s.specs.length
    ? s.specs
    : [String(s.description || s.typicalMake || 'Part family')].filter(Boolean)
  return {
    id: String(s.id),
    name: String(s.name || s.id),
    parent: parentName,
    icon,
    spec,
    desc: String(s.description || ''),
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

/** @returns {{ categories: Record<string, object[]>, subcats: Record<string, object[]>, spareParts: Record<string, object>, catalogues: object[] }} */
export function buildSourcingTaxonomyOverlay() {
  if (_cached) return _cached
  const categories = {}
  const subcats = {}
  const spareParts = {}

  PLATFORM_INDUSTRIES.forEach((platformInd) => {
    const sourcingInd = PLATFORM_TO_SOURCING_INDUSTRY[platformInd]
    if (!sourcingInd) return

    const productKey = `product:${sourcingInd}`
    const productTree = getProductCategoryTreeForIndustry(platformInd)
    if (productTree.length) {
      categories[productKey] = productTree.map((c) => catShape(c, c.icon || 'package'))
      productTree.forEach((c) => {
        const subs = Array.isArray(c.subcategories) ? c.subcategories : []
        subcats[`${productKey}:${c.id}`] = subs.map((s) => subShape(c.name, s, c.icon || 'package'))
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

    /* Equipment sellers already cover wear parts — do not overlay a spare-parts catalogue on equipment. */
  })

  const householdSubs = []
  ;(PRODUCT_CATEGORIES_BY_INDUSTRY['household-products'] || []).forEach((c) => {
    (c.subcategories || []).forEach((s) => householdSubs.push(s.id))
  })
  const catalogues = PRODUCT_CATALOGUE_GROUPS.map((g) => ({
    id: g.id,
    name: g.name,
    desc: g.description,
    categoryId: g.categoryId,
    industryIds: g.industryIds,
    subcategoryIdsByIndustry: g.subcategoryIdsByIndustry,
    items: [],
  }))
  const catalogExt = buildCatalogueExtFromTaxonomy(householdSubs)

  _cached = { categories, subcats, spareParts, catalogues, catalogExt }
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
