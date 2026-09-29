import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRODUCT_CATEGORIES_BY_INDUSTRY } from '../data/productComponentTaxonomy'
import { getProductCategoriesForIndustry } from '../data/productCategoriesByIndustry'
import { SPARE_PARTS_PRODUCT_CATEGORY_ID } from '../data/sparePartsCatalogue'
import { catalogueGroupsForSubcategory, PRODUCT_CATALOGUE_GROUPS } from '../data/productComponentCatalogue'
import { buildSourcingTaxonomyOverlay } from '../utils/unifiedSourcingTaxonomy'
import { PLATFORM_TO_SOURCING_INDUSTRY } from '../utils/intelligentSourcingIndustryMap'
import { PLATFORM_TO_SOURCING_PRODUCT_INDUSTRY } from '../data/productComponentTaxonomy'
import {
  asUuid,
  canRemoveCatalogueItem,
  catalogueItemsFingerprint,
  isValidCatalogueItem,
  mergeCatalogueLocalAndRemote,
  normalizeProductCatalogueItem,
  PRODUCT_CATALOGUE_CLOUD_COLUMNS,
  toProductCatalogueCloudRow,
} from '../utils/productComponentCatalogueItem'
import {
  buildSellerTaxonomyFromAddSupplierContext,
  resolveProductCategoryAndSub,
} from '../utils/addSupplierProductTaxonomy'
import { getSuppliersByIndustryAndCategory } from '../data/supplierDatabase'
import { useAccountRegistry } from '../store/accountRegistry'
import { useAuthStore } from '../store/authStore'
import { useProductComponentCatalogueStore } from '../store/productComponentCatalogueStore'

vi.mock('../config/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

describe('product taxonomy connectivity', () => {
  it('keeps subcategory ids unique inside each industry', () => {
    for (const [industryId, cats] of Object.entries(PRODUCT_CATEGORIES_BY_INDUSTRY)) {
      const ids = []
      for (const cat of cats) {
        for (const sub of cat.subcategories || []) ids.push(sub.id)
      }
      expect(new Set(ids).size, industryId).toBe(ids.length)
    }
  })

  it('overlays every platform industry product tree onto sourcing keys', () => {
    const { categories, subcats, spareParts, catalogues } = buildSourcingTaxonomyOverlay()
    for (const [platformInd, sourcingInd] of Object.entries(PLATFORM_TO_SOURCING_INDUSTRY)) {
      const tree = getProductCategoriesForIndustry(platformInd)
      expect(tree.length).toBeGreaterThan(0)
      const overlay = categories[`product:${sourcingInd}`] || []
      expect(overlay.map((c) => c.id)).toEqual(tree.map((c) => c.id))
      for (const cat of tree) {
        const subs = subcats[`product:${sourcingInd}:${cat.id}`] || []
        expect(subs.map((s) => s.id)).toEqual((cat.subcategories || []).map((s) => s.id))
      }
      if (platformInd !== 'raw-materials') {
        expect(spareParts[sourcingInd]).toBeUndefined()
      }
    }
    expect(catalogues.every((g) => Array.isArray(g.items) && g.items.length === 0)).toBe(true)
    expect(PLATFORM_TO_SOURCING_PRODUCT_INDUSTRY.automotive).toBe('automotive')
    expect(PLATFORM_TO_SOURCING_PRODUCT_INDUSTRY['household-products']).toBe('household')
  })

  it('has a catalogue group for every non-household product category', () => {
    for (const [industryId, cats] of Object.entries(PRODUCT_CATEGORIES_BY_INDUSTRY)) {
      if (industryId === 'household-products') continue
      for (const cat of cats) {
        const groups = catalogueGroupsForSubcategory(
          industryId,
          cat.id,
          cat.subcategories[0].id,
        )
        expect(groups.some((g) => g.categoryId === cat.id), `${industryId}/${cat.id}`).toBe(true)
      }
    }
    expect(PRODUCT_CATALOGUE_GROUPS.some((g) => g.id === 'foodstore')).toBe(true)
  })
})

describe('add-supplier product taxonomy', () => {
  it('resolves category and process from either id or display name', () => {
    const byId = resolveProductCategoryAndSub({
      industryId: 'automotive',
      categoryQuery: 'body',
      processQuery: 'body-bumper',
    })
    expect(byId.categoryId).toBe('body')
    expect(byId.subcategoryId).toBe('body-bumper')
    const byName = resolveProductCategoryAndSub({
      industryId: 'automotive',
      categoryQuery: 'Body & Exterior',
      processQuery: 'Bumper systems & fascias',
    })
    expect(byName.categoryId).toBe('body')
    expect(byName.subcategoryId).toBe('body-bumper')
  })

  it('writes productCategories — not equipment categories — for product context', () => {
    const maps = buildSellerTaxonomyFromAddSupplierContext({
      isProductContext: true,
      industryIds: ['automotive'],
      resolvedCategoryId: 'body',
      resolvedSubcategoryId: 'body-bumper',
    })
    expect(maps.categories.automotive).toEqual([])
    expect(maps.productCategories.automotive).toEqual(['body'])
    expect(maps.productSubcategories.automotive.body).toEqual(['body-bumper'])
  })

  it('writes spare-parts onto productCategories', () => {
    const maps = buildSellerTaxonomyFromAddSupplierContext({
      isSparesContext: true,
      industryIds: ['automotive'],
      resolvedCategoryId: SPARE_PARTS_PRODUCT_CATEGORY_ID,
      resolvedSubcategoryId: 'mechanical-spares',
    })
    expect(maps.productCategories.automotive).toEqual([SPARE_PARTS_PRODUCT_CATEGORY_ID])
    expect(maps.categories.automotive).toEqual([])
  })
})

describe('catalogue item mapping and store', () => {
  beforeEach(() => {
    localStorage.clear()
    useProductComponentCatalogueStore.setState({ items: [], hydratedFromCloud: false })
    useAuthStore.getState().logout()
  })

  it('maps cloud rows, drops illegal UUIDs, and rejects empty names', () => {
    const row = normalizeProductCatalogueItem({
      id: 'not-a-uuid',
      company_id: 'local-tenant',
      created_by: '11111111-1111-4111-8111-111111111111',
      industry_id: 'automotive',
      category_id: 'body',
      subcategory_id: 'body-bumper',
      name: '  Fascia  ',
      unit_price: '12.5',
      moq: 'abc',
    })
    expect(asUuid(row.id)).toBe(row.id)
    expect(row.companyId).toBe(null)
    expect(row.createdBy).toBe('11111111-1111-4111-8111-111111111111')
    expect(row.name).toBe('Fascia')
    expect(row.unitPrice).toBe(12.5)
    expect(row.moq).toBe(null)
    expect(isValidCatalogueItem(row)).toBe(true)
    expect(isValidCatalogueItem({ ...row, name: '' })).toBe(false)

    const cloud = toProductCatalogueCloudRow(row)
    expect(Object.keys(cloud).sort()).toEqual([...PRODUCT_CATALOGUE_CLOUD_COLUMNS].sort())
    expect(cloud.company_id).toBe(null)
    expect(cloud.unit_price).toBe(12.5)
  })

  it('adds locally without supabase and keeps items scoped to the part family', () => {
    const added = useProductComponentCatalogueStore.getState().addItem({
      name: 'Front bumper fascia',
      industryId: 'automotive',
      categoryId: 'body',
      subcategoryId: 'body-bumper',
      sku: 'BB-1',
    })
    expect(added?.sku).toBe('BB-1')
    expect(useProductComponentCatalogueStore.getState().addItem({
      name: '',
      industryId: 'automotive',
      subcategoryId: 'body-bumper',
    })).toBe(null)
    const scoped = useProductComponentCatalogueStore.getState().itemsForSubcategory(
      'automotive',
      'body',
      'body-bumper',
    )
    expect(scoped).toHaveLength(1)
    expect(useProductComponentCatalogueStore.getState().itemsForSubcategory(
      'automotive',
      'body',
      'body-fender',
    )).toHaveLength(0)
  })

  it('merges remote SKUs with local-only drafts and fingerprints sourcing sync', () => {
    const local = [{ id: 'local-1', name: 'Draft' }]
    const remote = [{ id: 'remote-1', name: 'Cloud' }, { id: 'local-1', name: 'Cloud wins' }]
    const merged = mergeCatalogueLocalAndRemote(remote, local)
    expect(merged.map((r) => r.id)).toEqual(['remote-1', 'local-1'])
    expect(catalogueItemsFingerprint([])).toBe('0')
    expect(catalogueItemsFingerprint(merged)).toContain('remote-1')
  })

  it('only lets the author or superadmin remove a SKU', () => {
    const item = { createdBy: '11111111-1111-4111-8111-111111111111' }
    expect(canRemoveCatalogueItem(item, { role: 'superadmin' })).toBe(true)
    expect(canRemoveCatalogueItem(item, { userId: '11111111-1111-4111-8111-111111111111' })).toBe(true)
    expect(canRemoveCatalogueItem(item, { userId: '22222222-2222-4222-8222-222222222222' })).toBe(false)
    expect(canRemoveCatalogueItem(item, { userId: 'not-uuid' })).toBe(false)
  })
})

describe('registered sellers on product catalogues', () => {
  beforeEach(() => {
    useAccountRegistry.setState({ accounts: [] })
  })

  it('counts a product-context seller on the category and subcategory surfaces', () => {
    const maps = buildSellerTaxonomyFromAddSupplierContext({
      isProductContext: true,
      industryIds: ['automotive'],
      resolvedCategoryId: 'body',
      resolvedSubcategoryId: 'body-bumper',
    })
    useAccountRegistry.getState().registerAccount({
      id: 'seller-body',
      email: 'body@maker.de',
      company: 'Fascia GmbH',
      accountType: 'seller',
      status: 'active',
      country: 'DE',
      city: 'Stuttgart',
      industries: ['automotive'],
      ...maps,
    })
    const { getSellersBySubcategory, getSellersByCategory } = useAccountRegistry.getState()
    expect(getSellersByCategory('automotive', 'body', 'product')).toHaveLength(1)
    expect(getSellersBySubcategory('automotive', 'body', 'body-bumper', 'product')).toHaveLength(1)
    expect(getSellersBySubcategory('automotive', 'body', 'body-fender', 'product')).toHaveLength(0)
    expect(getSuppliersByIndustryAndCategory('automotive', 'body').some((s) => s.email === 'body@maker.de')).toBe(true)
  })
})
