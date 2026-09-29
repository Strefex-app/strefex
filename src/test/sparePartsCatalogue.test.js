import { describe, expect, it } from 'vitest'
import {
  SPARE_PARTS_PRODUCT_CATEGORY_ID,
  buildSparePartsCatalogue,
  compareSparePartMakers,
  coordinatesForSeller,
  expoSellersForIndustry,
  kitIdForEquipment,
  mapLocationsForMakers,
  sellerMatchesSpareParts,
} from '../data/sparePartsCatalogue'
import { getProductCategoriesForIndustry } from '../data/productCategoriesByIndustry'
import { buildSourcingTaxonomyOverlay } from '../utils/unifiedSourcingTaxonomy'

describe('spare parts catalogue', () => {
  it('maps injection equipment to a hot-runner / hydraulic kit', () => {
    expect(kitIdForEquipment({ id: 'auto-inj-hydraulic', name: 'Hydraulic injection machines' })).toBe('injection-cell')
  })

  it('builds seller comparison rows for automotive equipment', () => {
    const cat = buildSparePartsCatalogue({ industryId: 'automotive', categoryId: 'injection-machines' })
    expect(cat.equipmentCount).toBeGreaterThan(0)
    expect(cat.productCount).toBeGreaterThan(0)
    const first = cat.products[0]
    expect(first.sku).toBeTruthy()
    expect(first.equipmentName).toBeTruthy()
    expect(first.makers.length).toBeGreaterThan(1)
    expect(first.makers.some((m) => m.role === 'aftermarket')).toBe(true)
  })

  it('includes registered spare manufacturers when they match', () => {
    const cat = buildSparePartsCatalogue({
      industryId: 'automotive',
      categoryId: 'injection-machines',
      extraSellers: [
        {
          id: 'reg-1',
          name: 'Plant Spares GmbH',
          country: 'DE',
          rating: 4.2,
          categories: ['injection-machines'],
          productCategoryIds: [SPARE_PARTS_PRODUCT_CATEGORY_ID],
        },
      ],
    })
    const names = cat.products.flatMap((p) => p.makers.map((m) => m.name))
    expect(names).toContain('Plant Spares GmbH')
  })

  it('adds spare-parts product category on related industries', () => {
    const auto = getProductCategoriesForIndustry('automotive')
    expect(auto.some((c) => c.id === SPARE_PARTS_PRODUCT_CATEGORY_ID)).toBe(true)
    const nuclear = getProductCategoriesForIndustry('nuclear')
    expect(nuclear.filter((c) => c.id === SPARE_PARTS_PRODUCT_CATEGORY_ID)).toHaveLength(1)
  })

  it('puts spare-parts product category on product overlay, not a spare SKU list on equipment', () => {
    const { spareParts, categories } = buildSourcingTaxonomyOverlay()
    expect(categories['product:automotive']?.some((c) => c.id === SPARE_PARTS_PRODUCT_CATEGORY_ID)).toBe(true)
    expect(spareParts.automotive).toBeUndefined()
  })

  it('attaches coordinates and a price index for mapping and compare', () => {
    const cat = buildSparePartsCatalogue({ industryId: 'automotive', categoryId: 'injection-machines' })
    const maker = cat.products[0].makers[0]
    expect(maker.priceIndex).toBeGreaterThan(70)
    expect(coordinatesForSeller({ country: 'DE' })).toEqual(expect.arrayContaining([expect.any(Number), expect.any(Number)]))
    const ranked = compareSparePartMakers([
      { id: 'a', priceIndex: 112 },
      { id: 'b', priceIndex: 94 },
    ])
    expect(ranked.map((m) => m.id)).toEqual(['b', 'a'])
  })

  it('turns exhibition fairs into expo sellers that can join compare', () => {
    const expo = expoSellersForIndustry('automotive', [
      {
        id: 'fair-1',
        name: 'Automechanika Test',
        industry: 'Automotive',
        country: 'Germany',
        city: 'Frankfurt',
        equipment: ['Automotive Parts'],
      },
    ])
    expect(expo[0].role).toBe('expo')
    expect(expo[0].city).toBe('Frankfurt')
    expect(expo[0].coordinates?.[0]).toBeCloseTo(8.6821, 2)
    const pins = mapLocationsForMakers(expo)
    expect(pins[0].id).toBe(expo[0].id)
    expect(pins[0].relationLabel).toMatch(/Expo/)
  })

  it('matches a registered spare manufacturer via productCategories map', () => {
    expect(sellerMatchesSpareParts({
      name: 'Plant Spares GmbH',
      productCategories: { automotive: [SPARE_PARTS_PRODUCT_CATEGORY_ID] },
    }, { categoryId: 'injection-machines' }, 'injection-machines')).toBe(true)
    expect(sellerMatchesSpareParts({
      name: 'Unrelated Co',
      categories: ['mold-makers'],
    }, { name: 'Hydraulic injection machines', categoryId: 'injection-machines' }, 'injection-machines')).toBe(false)
  })

  it('does not render the spare-parts catalogue on equipment industry pages', async () => {
    const { readFile } = await import('node:fs/promises')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const dir = join(dirname(fileURLToPath(import.meta.url)), '../pages')
    const files = [
      'IndustryEquipmentLanding.jsx',
      'IndustryEquipmentCategory.jsx',
      'IndustryEquipmentSuppliers.jsx',
    ]
    for (const name of files) {
      const src = await readFile(join(dir, name), 'utf8')
      expect(src, name).not.toMatch(/SparePartsCatalogue/)
    }
    const sourcing = await readFile(join(dir, '../../public/intelligent-sourcing/index.html'), 'utf8')
    expect(sourcing).toMatch(/const showSpareCatalogue = false/)
    expect(sourcing).toMatch(/x\.showCatalogue = domain === "product"/)
    expect(sourcing).not.toMatch(/structure ready · 0 offers/)
    expect(sourcing).toMatch(/class="stx-sourcing-scroll"/)
    expect(sourcing).toMatch(/overflow-x:clip;overflow-y:visible/)
  })
})
