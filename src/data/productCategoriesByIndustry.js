/**
 * Product & Component categories — product-first tree plus spare-parts append.
 */
import { SPARE_PARTS_PRODUCT_CATEGORY } from './sparePartsCatalogue'
import { PRODUCT_CATEGORIES_BY_INDUSTRY as PRODUCT_FIRST_BY_INDUSTRY } from './productComponentTaxonomy'

export { PRODUCT_CATEGORIES_BY_INDUSTRY } from './productComponentTaxonomy'

export function getProductCategoriesForIndustry(industryId) {
  const base = PRODUCT_FIRST_BY_INDUSTRY[industryId] || []
  if (!industryId || !base.length) return base
  if (base.some((c) => c.id === SPARE_PARTS_PRODUCT_CATEGORY.id)) return base
  if (industryId === 'raw-materials') return base
  return [...base, SPARE_PARTS_PRODUCT_CATEGORY]
}

export function getProductCategoryTreeForIndustry(industryId) {
  return getProductCategoriesForIndustry(industryId).map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    icon: cat.icon,
    subcategories: (cat.subcategories || []).map((sub) => ({
      id: sub.id,
      name: sub.name,
      description: sub.description,
      typicalMake: sub.typicalMake,
      specs: sub.specs,
    })),
  }))
}

export function getProductCategoryCheckboxOptionsForIndustry(industryId) {
  const top = getProductCategoriesForIndustry(industryId)
  const out = []
  for (const cat of top) {
    out.push({ id: cat.id, name: cat.name, kind: 'family', parentLabel: cat.name })
    for (const sub of cat.subcategories || []) {
      out.push({
        id: `${cat.id}::${sub.id}`,
        name: sub.name,
        kind: 'sub',
        parentLabel: cat.name,
        description: sub.description,
      })
    }
  }
  return out
}

export function getManufacturingCategory(categoryId, industryId) {
  const industryCategories = getProductCategoriesForIndustry(industryId)
  return industryCategories.find((c) => c.id === categoryId) || null
}

export function getSubcategories(categoryId, industryId) {
  const cat = getManufacturingCategory(categoryId, industryId)
  return cat ? cat.subcategories : []
}
