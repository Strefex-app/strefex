/**
 * Product & Component catalogue groups. SKUs are empty until sellers or superadmin add them.
 */
import { PRODUCT_CATEGORIES_BY_INDUSTRY, PLATFORM_TO_SOURCING_PRODUCT_INDUSTRY } from './productComponentTaxonomy.js'

export const PRODUCT_CATALOGUE_GROUPS = [
  {
    id: "foodstore",
    name: "Food Storage & Containers",
    description: "Glass and PP containers, canisters, lunch boxes",
    icon: "package",
    categoryId: "kitchenware",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["kw-foodstore", "kw-lunch"]},
  },
  {
    id: "drinkware",
    name: "Drinkware",
    description: "Bottles, tumblers, mugs, jugs",
    icon: "verified",
    categoryId: "kitchenware",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["kw-drinkware", "kw-jug"]},
  },
  {
    id: "cookware",
    name: "Cookware & Bakeware",
    description: "Pans, pots, trays, grills",
    icon: "factory",
    categoryId: "kitchenware",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["kw-cookware", "kw-bakeware"]},
  },
  {
    id: "tools",
    name: "Kitchen Tools & Gadgets",
    description: "Cutlery, boards, utensils, measuring",
    icon: "wrench",
    categoryId: "kitchenware",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["kw-tools"]},
  },
  {
    id: "tabletop",
    name: "Tabletop & Serveware",
    description: "Dinner sets, glasses, trays, cutlery",
    icon: "layers",
    categoryId: "kitchenware",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["kw-cutlery"]},
  },
  {
    id: "organise",
    name: "Home Organisation & Storage",
    description: "Boxes, bins, racks, hangers, vacuum bags",
    icon: "folder",
    categoryId: "storagehome",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["sh-box", "sh-fabric", "sh-shelving", "sh-shoe", "sh-vacbag", "sh-closet"]},
  },
  {
    id: "cleaning",
    name: "Cleaning & Laundry",
    description: "Mops, baskets, brushes, cloths, racks, bins",
    icon: "clipboardCheck",
    categoryId: "cleanhome",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["cl-floorcare", "cl-brush", "cl-cloth", "cl-laundry", "cl-drying", "cl-waste"]},
  },
  {
    id: "bath",
    name: "Bath & Home Accessories",
    description: "Dispensers, holders, hampers, mats, curtains, mirrors",
    icon: "building",
    categoryId: "bathhome",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["bh-dispenser", "bh-hamper", "bh-mat", "bh-holder", "bh-shower", "bh-mirror"]},
  },
  {
    id: "appliance",
    name: "Small Kitchen Appliances",
    description: "Kettles, blenders, fryers — GS/CE electrical",
    icon: "cpu",
    categoryId: "smallappl",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["sa-kettle", "sa-blender", "sa-cooking", "sa-breakfast", "sa-floorcare", "sa-personal"]},
  },
  {
    id: "textiles",
    name: "Home Textiles",
    description: "Bedding, towels, curtains, cushions, throws",
    icon: "ruler",
    categoryId: "textilehome",
    industryIds: ["household-products"],
    subcategoryIdsByIndustry: {"household-products": ["tx-bedding", "tx-towel", "tx-curtain", "tx-cushion", "tx-throw"]},
  },
]

function taxonomyCategoryGroups() {
  const extra = []
  Object.entries(PRODUCT_CATEGORIES_BY_INDUSTRY).forEach(([platformInd, cats]) => {
    if (platformInd === 'household-products') return
    ;(cats || []).forEach((cat) => {
      const subIds = (cat.subcategories || []).map((s) => s.id)
      extra.push({
        id: `tax-${platformInd}-${cat.id}`,
        name: cat.name,
        description: cat.description || cat.name,
        icon: cat.icon || 'package',
        categoryId: cat.id,
        industryIds: [platformInd],
        subcategoryIdsByIndustry: { [platformInd]: subIds },
      })
    })
  })
  return extra
}

PRODUCT_CATALOGUE_GROUPS.push(...taxonomyCategoryGroups())

/** Title an article from its part-family subcategory. */
export function catalogueNameForSubcategory(subName, articleName) {
  const sub = String(subName || '').trim()
  const art = String(articleName || '').trim()
  if (!sub) return art
  if (!art) return sub
  if (art.toLowerCase() === sub.toLowerCase()) return sub
  const tokens = sub.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3)
  const hay = art.toLowerCase()
  if (tokens.some((t) => hay.includes(t))) return art
  return `${sub} — ${art}`
}

function variantCode(subId, suffix) {
  const raw = String(subId || 'ART').toUpperCase().replace(/[^A-Z0-9]+/g, '-')
  return suffix ? `${raw}-${suffix}` : raw
}

function articlesForSubcategory(sub) {
  const name = String(sub.name || sub.id)
  const material = String(sub.typicalMake || (sub.specs && sub.specs[0]) || 'Catalogue article')
  const parts = name.split(/\s*[&,]\s*/).map((p) => p.trim()).filter(Boolean)
  const rows = [{
    name,
    material,
    variants: [{ code: variantCode(sub.id), label: 'Standard', cap: '—', dim: '—', weight: '—', pf: 1 }],
  }]
  parts.slice(0, 2).forEach((part, i) => {
    const titled = part.charAt(0).toUpperCase() + part.slice(1)
    if (titled.toLowerCase() === name.toLowerCase()) return
    rows.push({
      name: catalogueNameForSubcategory(name, titled),
      material,
      variants: [{
        code: variantCode(sub.id, String(i + 1)),
        label: titled,
        cap: '—',
        dim: '—',
        weight: '—',
        pf: 1,
      }],
    })
  })
  return rows
}

/**
 * One catalogue family (plus split-name variants) per product subcategory,
 * keyed to sourcing industry ids used by Intelligent Sourcing.
 */
export function buildCatalogueExtFromTaxonomy(coveredSubIds = []) {
  const covered = new Set((coveredSubIds || []).filter(Boolean))
  const groups = []
  const families = []
  const famSub = {}
  const subLabels = {}
  Object.entries(PRODUCT_CATEGORIES_BY_INDUSTRY).forEach(([platformInd, cats]) => {
    const sourcingInd = PLATFORM_TO_SOURCING_PRODUCT_INDUSTRY[platformInd] || platformInd
    ;(cats || []).forEach((cat) => {
      const subIds = (cat.subcategories || []).map((s) => s.id)
      const groupId = `tax-${sourcingInd}-${cat.id}`
      groups.push({
        id: groupId,
        name: cat.name,
        cat: cat.id,
        icon: cat.icon || 'package',
        desc: cat.description || cat.name,
        dom: 'product',
        inds: [sourcingInd],
        subMap: { [sourcingInd]: subIds },
      })
      ;(cat.subcategories || []).forEach((sub) => {
        subLabels[sub.id] = sub.name
        if (covered.has(sub.id)) return
        articlesForSubcategory(sub).forEach((art, i) => {
          const id = i === 0 ? `art-${sub.id}` : `art-${sub.id}-${i}`
          families.push({
            id,
            group: groupId,
            name: art.name,
            material: art.material,
            desc: String(sub.description || cat.description || ''),
            keywords: [sub.name, cat.name, sourcingInd],
            price: 0,
            moq: 0,
            pack: 12,
            cbm: 0.06,
            variants: art.variants,
            images: [],
            certs: [],
            taxSub: sub.id,
            taxSubName: sub.name,
            taxCat: cat.id,
            taxCatName: cat.name,
          })
          famSub[id] = sub.id
        })
      })
    })
  })
  return { groups, families, famSub, subLabels, orderModeLegacy: [], suppliers: [], cont: {} }
}

export function catalogueGroupsForSubcategory(industryId, categoryId, subcategoryId) {
  return PRODUCT_CATALOGUE_GROUPS.filter((g) => {
    if (g.industryIds?.length && !g.industryIds.includes(industryId)) return false
    const mapped = g.subcategoryIdsByIndustry?.[industryId] || []
    if (mapped.length) return mapped.includes(subcategoryId)
    if (g.categoryId && categoryId) return g.categoryId === categoryId
    return true
  })
}

