import { describe, expect, it } from 'vitest'
import {
  buildCompanyTaxonomyWrite,
  sourcingNetworkRowToAccount,
} from '../utils/companyTaxonomyPayload'
import {
  expandEquipmentCategoryIds,
  expandProductCategoryIds,
  expandSubcategoryIds,
  sourcingSupplierMatchesDomainCategory,
} from '../utils/sourcingCategoryAliases'

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
  it('matches product subcategories only when explicitly mapped', () => {
    const seller = {
      accountTypes: ['seller'],
      productCategoryIds: ['plastic'],
      equipmentCategoryIds: ['imm'],
      serviceCategoryIds: [],
      categoryIds: ['plastic', 'imm'],
      subcategoryIds: ['plastic-injection', 'pl-exterior', 'pl-interior', 'pl-underhood', 'pl-lighting'],
    }
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'plastic-injection')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'pl-exterior')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'imm')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'service', 'audit')).toBe(false)
  })

  it('maps mold-makers registration onto tooling / mould-making cards', () => {
    const seller = {
      accountTypes: ['seller'],
      equipmentCategoryIds: ['mold-makers', 'tooling'],
      productCategoryIds: [],
      serviceCategoryIds: [],
      categoryIds: ['mold-makers', 'tooling'],
      subcategoryIds: ['tool-mould', 'tool-die'],
    }
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'tooling', 'tool-mould')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'tooling')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic')).toBe(false)
  })

  it('does not treat parent membership as every subcategory', () => {
    const seller = {
      accountTypes: ['seller'],
      equipmentCategoryIds: ['imm', 'cnc', 'robot'],
      productCategoryIds: ['plastic', 'metal'],
      serviceCategoryIds: [],
      categoryIds: ['imm', 'cnc', 'robot', 'plastic', 'metal'],
      subcategoryIds: ['imm-hyd', 'cnc-5ax', 'pl-exterior'],
    }
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'imm', 'imm-hyd')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'imm', 'imm-elec')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'cnc', 'cnc-5ax')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'cnc', 'cnc-vmc')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'robot')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'pl-exterior')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic', 'pl-interior')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'metal')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'equipment', 'tooling')).toBe(false)
  })

  it('maps non-automotive platform categories onto IS cards', () => {
    const medical = {
      accountTypes: ['seller'],
      equipmentCategoryIds: expandEquipmentCategoryIds(['molding', 'sterilization']),
      productCategoryIds: expandProductCategoryIds(['plastic']),
      subcategoryIds: [],
    }
    medical.categoryIds = [...medical.equipmentCategoryIds, ...medical.productCategoryIds]
    expect(medical.equipmentCategoryIds).toEqual(expect.arrayContaining(['sterile', 'imm']))
    expect(medical.productCategoryIds).toContain('plastic')
    expect(sourcingSupplierMatchesDomainCategory(medical, 'equipment', 'sterile')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(medical, 'equipment', 'imm')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(medical, 'product', 'plastic')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(medical, 'product', 'moulded')).toBe(false)

    const electronics = {
      accountTypes: ['seller'],
      equipmentCategoryIds: expandEquipmentCategoryIds(['smt', 'pcb']),
      productCategoryIds: expandProductCategoryIds(['electronics-assembly']),
      subcategoryIds: [],
    }
    electronics.categoryIds = [...electronics.equipmentCategoryIds, ...electronics.productCategoryIds]
    expect(sourcingSupplierMatchesDomainCategory(electronics, 'equipment', 'smtline')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(electronics, 'product', 'electronics')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(electronics, 'product', 'pcba')).toBe(false)
  })

  it('maps profile plastic-injection checkmark onto sourcing plastic subcards', () => {
    const ids = expandSubcategoryIds(['plastic-injection'])
    expect(ids).toEqual(expect.arrayContaining(['plastic-injection', 'pl-exterior', 'pl-interior']))
  })
})
