import { describe, expect, it } from 'vitest'
import { getProductCategoriesForIndustry } from '../data/productCategoriesByIndustry'
import { PRODUCT_CATEGORIES_BY_INDUSTRY } from '../data/productComponentTaxonomy'
import { catalogueGroupsForSubcategory, PRODUCT_CATALOGUE_GROUPS, buildCatalogueExtFromTaxonomy, catalogueNameForSubcategory } from '../data/productComponentCatalogue'
import { buildSourcingTaxonomyOverlay } from '../utils/unifiedSourcingTaxonomy'

describe('product & component taxonomy', () => {
  it('uses product-first automotive systems instead of process families', () => {
    const auto = getProductCategoriesForIndustry('automotive')
    expect(auto.some((c) => c.id === 'body')).toBe(true)
    expect(auto.some((c) => c.id === 'plastic')).toBe(false)
    const body = auto.find((c) => c.id === 'body')
    expect(body.subcategories.some((s) => s.id === 'body-bumper')).toBe(true)
  })

  it('covers every sourced industry tree', () => {
    const industries = Object.keys(PRODUCT_CATEGORIES_BY_INDUSTRY)
    expect(industries).toEqual(expect.arrayContaining([
      'automotive', 'machinery', 'electronics', 'medical',
      'raw-materials', 'oil-gas', 'green-energy', 'nuclear',
      'household-products', 'aerospace',
    ]))
    for (const id of industries) {
      const cats = PRODUCT_CATEGORIES_BY_INDUSTRY[id]
      expect(cats.length).toBeGreaterThan(0)
      expect(cats.every((c) => (c.subcategories || []).length > 0)).toBe(true)
    }
  })

  it('does not ship demo SKUs in catalogue groups', () => {
    expect(PRODUCT_CATALOGUE_GROUPS.length).toBeGreaterThan(5)
    expect(PRODUCT_CATALOGUE_GROUPS.every((g) => !g.items || g.items.length === 0)).toBe(true)
    const food = catalogueGroupsForSubcategory('household-products', 'kitchenware', 'kw-foodstore')
    expect(food.some((g) => g.id === 'foodstore')).toBe(true)
    const auto = catalogueGroupsForSubcategory('automotive', 'body', 'body-bumper')
    expect(auto.some((g) => g.categoryId === 'body')).toBe(true)
  })

  it('overlays product-first ids onto intelligent sourcing', () => {
    const { categories, subcats, catalogues, catalogExt } = buildSourcingTaxonomyOverlay()
    expect(categories['product:automotive']?.some((c) => c.id === 'body')).toBe(true)
    expect(subcats['product:automotive:body']?.some((s) => s.id === 'body-bumper')).toBe(true)
    expect(Array.isArray(catalogues)).toBe(true)
    expect(catalogues.some((g) => g.id === 'foodstore')).toBe(true)
    expect(catalogExt.famSub['art-body-bumper']).toBe('body-bumper')
    expect(catalogExt.families.find((f) => f.id === 'art-body-bumper').name).toBe('Bumper systems & fascias')
  })

  it('names catalogue articles from the part-family subcategory for every industry', () => {
    expect(catalogueNameForSubcategory('Pads, shoes & linings', 'Brake pad set')).toBe('Pads, shoes & linings — Brake pad set')
    expect(catalogueNameForSubcategory('Food storage containers', 'Borosilicate Glass Food Container')).toBe('Borosilicate Glass Food Container')
    const { families, famSub, subLabels } = buildCatalogueExtFromTaxonomy([])
    for (const [platformInd, cats] of Object.entries(PRODUCT_CATEGORIES_BY_INDUSTRY)) {
      for (const cat of cats) {
        for (const sub of cat.subcategories || []) {
          expect(subLabels[sub.id]).toBe(sub.name)
          const id = `art-${sub.id}`
          expect(famSub[id]).toBe(sub.id)
          const fam = families.find((f) => f.id === id)
          expect(fam?.name).toBe(sub.name)
        }
      }
    }
  })
})
