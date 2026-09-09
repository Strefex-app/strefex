import { describe, expect, it } from 'vitest'
import {
  buildCompanyTaxonomyWrite,
  sourcingNetworkRowToAccount,
} from '../utils/companyTaxonomyPayload'
import {
  expandEquipmentCategoryIds,
  expandProductCategoryIds,
  expandServiceCategoryIds,
  expandSubcategoryIds,
  sourcingSupplierMatchesDomainCategory,
} from '../utils/sourcingCategoryAliases'
import { buildSourcingTaxonomyOverlay } from '../utils/unifiedSourcingTaxonomy'

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

describe('1:1 Profile ↔ sourcing matching', () => {
  it('keeps Profile category/subcategory ids unchanged', () => {
    expect(expandEquipmentCategoryIds(['mold-makers', 'dryer'])).toEqual(['mold-makers', 'dryer'])
    expect(expandProductCategoryIds(['plastic', 'electronics-assembly'])).toEqual([
      'plastic',
      'electronics-assembly',
    ])
    expect(expandSubcategoryIds(['plastic-injection', 'auto-die-making'])).toEqual([
      'plastic-injection',
      'auto-die-making',
    ])
  })

  it('matches sellers on the exact ids they signed up for', () => {
    const seller = {
      accountTypes: ['seller'],
      productCategoryIds: ['plastic'],
      equipmentCategoryIds: ['mold-makers'],
      serviceCategoryIds: [],
      categoryIds: ['plastic', 'mold-makers'],
      subcategoryIds: ['plastic-injection', 'auto-die-making'],
    }
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'plastic-injection')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'pl-exterior')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'mold-makers', 'auto-die-making')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'tooling')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'mold-makers')).toBe(true)
  })

  it('does not treat parent membership as every subcategory', () => {
    const seller = {
      accountTypes: ['seller'],
      equipmentCategoryIds: ['injection-machines', 'cnc'],
      productCategoryIds: ['plastic'],
      serviceCategoryIds: [],
      categoryIds: ['injection-machines', 'cnc', 'plastic'],
      subcategoryIds: ['auto-inj-hydraulic', 'plastic-injection'],
    }
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'injection-machines', 'auto-inj-hydraulic')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'injection-machines', 'auto-inj-electric')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'plastic-injection')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'blow-molding')).toBe(false)
  })

  it('matches service providers on Profile expertise buckets', () => {
    const sp = {
      accountTypes: ['service_provider'],
      serviceCategoryIds: ['quality-services'],
      categoryIds: ['quality-services'],
      subcategoryIds: [],
    }
    expect(sourcingSupplierMatchesDomainCategory(sp, 'service', 'quality-services')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(sp, 'service', 'audit')).toBe(false)
  })

  it('expands audit-services parent to map kinds and matches process-audit', () => {
    expect(expandServiceCategoryIds(['audit-services'])).toEqual(
      expect.arrayContaining(['audit-services', 'process-audit', 'supplier-audit']),
    )
    const auditor = {
      accountTypes: ['auditor'],
      serviceCategoryIds: expandServiceCategoryIds(['process-audit']),
      categoryIds: expandServiceCategoryIds(['process-audit']),
    }
    expect(sourcingSupplierMatchesDomainCategory(auditor, 'service', 'audit-services')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(auditor, 'service', 'audit-services', 'process-audit')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(auditor, 'service', 'audit-services', 'system-audit')).toBe(false)
  })

  it('overlay uses Profile subcategory ids (not plastic-0 style)', () => {
    const { categories, subcats } = buildSourcingTaxonomyOverlay()
    expect(categories['product:automotive']?.some((c) => c.id === 'plastic')).toBe(true)
    expect(categories['equipment:automotive']?.some((c) => c.id === 'mold-makers')).toBe(true)
    expect(categories['service:automotive']?.map((c) => c.id)).toEqual(
      expect.arrayContaining(['project-management', 'supplier-services', 'quality-services', 'audit-services']),
    )
    const auditSubs = subcats['service:automotive:audit-services'] || []
    expect(auditSubs.some((s) => s.id === 'process-audit')).toBe(true)
    expect(auditSubs.some((s) => s.id === 'system-audit')).toBe(true)
    const plasticSubs = subcats['product:automotive:plastic'] || []
    expect(plasticSubs.some((s) => s.id === 'plastic-injection')).toBe(true)
    expect(plasticSubs.some((s) => /^plastic-\d+$/.test(s.id))).toBe(false)
    const moldSubs = subcats['equipment:automotive:mold-makers'] || []
    expect(moldSubs.some((s) => s.id === 'auto-die-making' || s.id === 'auto-mold-standard')).toBe(true)
  })
})
