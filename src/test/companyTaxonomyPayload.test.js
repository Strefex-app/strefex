import { describe, expect, it } from 'vitest'
import {
  buildCompanyTaxonomyWrite,
  sourcingNetworkRowToAccount,
} from '../utils/companyTaxonomyPayload'
import { sourcingSupplierMatchesDomainCategory } from '../utils/sourcingCategoryAliases'

describe('companyTaxonomyPayload', () => {
  it('writes industries and categories to company columns and metadata', () => {
    const out = buildCompanyTaxonomyWrite({
      industries: ['automotive'],
      categories: { automotive: ['mold-makers'] },
      productCategories: { automotive: ['plastic'] },
      serviceCategories: ['quality-services'],
      accountType: 'seller',
      accountTypes: ['seller', 'service_provider'],
    })
    expect(out.companyColumns.industries).toEqual(['automotive'])
    expect(out.companyColumns.categories.automotive).toContain('mold-makers')
    expect(out.companyColumns.service_categories).toEqual(['quality-services'])
    expect(out.companyColumns.account_type).toBe('seller')
    expect(out.metadataPatch.product_categories.automotive).toContain('plastic')
    expect(out.metadataPatch.account_types).toEqual(['seller', 'service_provider'])
  })

  it('maps RPC rows into registry account shape', () => {
    const acct = sourcingNetworkRowToAccount({
      id: 'c1',
      email: 'Plant@Maker.de',
      company: 'Maker',
      account_type: 'seller',
      account_types: ['seller'],
      country: 'Germany',
      city: 'Stuttgart',
      industries: ['automotive'],
      categories: { automotive: ['robots'] },
      product_categories: { automotive: ['plastic'] },
      service_categories: [],
      status: 'active',
    })
    expect(acct.email).toBe('plant@maker.de')
    expect(acct.productCategories.automotive).toContain('plastic')
    expect(acct.source).toBe('database')
  })
})

describe('domain category matching', () => {
  it('keeps product sellers out of equipment-only category matches when ids differ by domain maps', () => {
    const seller = {
      accountTypes: ['seller'],
      productCategoryIds: ['plastic'],
      equipmentCategoryIds: ['imm'],
      serviceCategoryIds: [],
      categoryIds: ['plastic', 'imm'],
      subcategoryIds: ['plastic', 'plastic-injection'],
    }
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'plastic-injection')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'pl-exterior')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'imm')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'service', 'audit')).toBe(false)
  })
})
