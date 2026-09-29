import { getProductCategoriesForIndustry } from '../data/productCategoriesByIndustry'

/**
 * Resolve Product Hub query params to taxonomy ids (category name or id, process name or id).
 */
export function resolveProductCategoryAndSub({ industryId, categoryQuery, processQuery } = {}) {
  const cats = getProductCategoriesForIndustry(industryId)
  const qCat = String(categoryQuery || '').trim()
  const category = cats.find((c) => (
    c.id === qCat || c.name.toLowerCase() === qCat.toLowerCase()
  )) || null
  if (!category) return { categoryId: null, subcategoryId: null, category: null, subcategory: null }

  const qProc = String(processQuery || '').trim()
  const subcategory = qProc
    ? (category.subcategories || []).find((s) => (
      s.id === qProc || s.name.toLowerCase() === qProc.toLowerCase()
    )) || null
    : null
  return {
    categoryId: category.id,
    subcategoryId: subcategory?.id || null,
    category,
    subcategory,
  }
}

/**
 * Persist seller taxonomy so Product Hub matching uses `productCategories`,
 * not equipment `categories`.
 */
export function buildSellerTaxonomyFromAddSupplierContext({
  isProductContext = false,
  isEquipmentContext = false,
  isSparesContext = false,
  industryIds = [],
  resolvedCategoryId = null,
  resolvedSubcategoryId = null,
} = {}) {
  const categories = {}
  const productCategories = {}
  const productSubcategories = {}

  industryIds.forEach((industryId) => {
    if (isSparesContext) {
      categories[industryId] = []
      productCategories[industryId] = ['spare-parts-consumables']
      if (resolvedSubcategoryId) {
        productSubcategories[industryId] = {
          'spare-parts-consumables': [resolvedSubcategoryId],
        }
      }
      return
    }
    if (isProductContext) {
      categories[industryId] = []
      productCategories[industryId] = resolvedCategoryId ? [resolvedCategoryId] : []
      if (resolvedCategoryId && resolvedSubcategoryId) {
        productSubcategories[industryId] = {
          [resolvedCategoryId]: [resolvedSubcategoryId],
        }
      }
      return
    }
    categories[industryId] = resolvedCategoryId ? [resolvedCategoryId] : []
    productCategories[industryId] = []
    if (isEquipmentContext && resolvedCategoryId && resolvedSubcategoryId) {
      // equipment sub map lives on equipmentSubcategories; caller may set that separately
    }
  })

  return { categories, productCategories, productSubcategories }
}
