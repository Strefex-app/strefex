import { beforeEach, describe, expect, it } from 'vitest'
import { useAccountRegistry } from '../store/accountRegistry'

describe('accountRegistry category matching', () => {
  beforeEach(() => {
    useAccountRegistry.setState({ accounts: [] })
  })

  it('matches equipment and product categories across all selected parents', () => {
    useAccountRegistry.getState().registerAccount({
      id: 's1',
      email: 'plant@maker.de',
      company: 'Maker GmbH',
      accountType: 'seller',
      status: 'active',
      industries: ['automotive'],
      categories: { automotive: ['mold-makers', 'robots'] },
      productCategories: { automotive: ['plastic', 'metal'] },
    })
    const { getSellersByCategory } = useAccountRegistry.getState()
    expect(getSellersByCategory('automotive', 'mold-makers')).toHaveLength(1)
    expect(getSellersByCategory('automotive', 'robots')).toHaveLength(1)
    expect(getSellersByCategory('automotive', 'plastic')).toHaveLength(1)
    expect(getSellersByCategory('automotive', 'metal')).toHaveLength(1)
    expect(getSellersByCategory('automotive', 'dryer')).toHaveLength(0)
  })

  it('treats parent-only selection as all subcategories under that category', () => {
    useAccountRegistry.getState().registerAccount({
      id: 's2',
      email: 'molds@maker.de',
      company: 'Mold Works',
      accountType: 'seller',
      status: 'active',
      industries: ['automotive'],
      categories: { automotive: ['mold-makers'] },
      equipmentSubcategories: {},
    })
    const { getSellersBySubcategory } = useAccountRegistry.getState()
    expect(getSellersBySubcategory('automotive', 'mold-makers', 'auto-die-making')).toHaveLength(1)
    expect(getSellersBySubcategory('automotive', 'mold-makers', 'auto-checking-fixtures')).toHaveLength(1)
  })

  it('honours explicit subcategory picks and wildcard', () => {
    useAccountRegistry.getState().registerAccount({
      id: 's3',
      email: 'die@maker.de',
      company: 'Die Co',
      accountType: 'seller',
      accountTypes: ['buyer', 'seller'],
      status: 'active',
      industries: ['automotive'],
      categories: { automotive: ['mold-makers'] },
      equipmentSubcategories: {
        automotive: { 'mold-makers': ['auto-die-making'] },
      },
    })
    const { getSellersBySubcategory } = useAccountRegistry.getState()
    expect(getSellersBySubcategory('automotive', 'mold-makers', 'auto-die-making')).toHaveLength(1)
    expect(getSellersBySubcategory('automotive', 'mold-makers', 'auto-checking-fixtures')).toHaveLength(0)

    useAccountRegistry.getState().updateAccount('die@maker.de', {
      equipmentSubcategories: {
        automotive: { 'mold-makers': ['*'] },
      },
    })
    expect(getSellersBySubcategory('automotive', 'mold-makers', 'auto-checking-fixtures')).toHaveLength(1)
  })

  it('excludes pure service providers from seller category lists', () => {
    useAccountRegistry.getState().registerAccount({
      id: 'sp1',
      email: 'audit@sp.de',
      company: 'Audit SP',
      accountType: 'service_provider',
      accountTypes: ['service_provider'],
      status: 'active',
      industries: ['automotive'],
      serviceCategories: ['quality-services'],
      categories: { automotive: ['mold-makers'] },
    })
    useAccountRegistry.getState().registerAccount({
      id: 's4',
      email: 'sell@maker.de',
      company: 'Seller Co',
      accountType: 'seller',
      accountTypes: ['seller'],
      status: 'active',
      industries: ['automotive'],
      categories: { automotive: ['mold-makers'] },
    })
    const {
      getSellersByCategory,
      getRegisteredSellers,
      getServiceProvidersByCategory,
      getRegisteredServiceProviders,
    } = useAccountRegistry.getState()
    expect(getSellersByCategory('automotive', 'mold-makers')).toHaveLength(1)
    expect(getRegisteredSellers('automotive')).toHaveLength(1)
    expect(getServiceProvidersByCategory('quality-services')).toHaveLength(1)
    expect(getRegisteredServiceProviders('automotive')).toHaveLength(1)
  })

  it('scopes seller category queries by product vs equipment domain', () => {
    useAccountRegistry.getState().registerAccount({
      id: 's5',
      email: 'domain@maker.de',
      company: 'Domain Co',
      accountType: 'seller',
      accountTypes: ['seller'],
      status: 'active',
      industries: ['automotive'],
      categories: { automotive: ['mold-makers'] },
      productCategories: { automotive: ['plastic'] },
    })
    const { getSellersByCategory } = useAccountRegistry.getState()
    expect(getSellersByCategory('automotive', 'mold-makers', 'equipment')).toHaveLength(1)
    expect(getSellersByCategory('automotive', 'mold-makers', 'product')).toHaveLength(0)
    expect(getSellersByCategory('automotive', 'plastic', 'product')).toHaveLength(1)
    expect(getSellersByCategory('automotive', 'plastic', 'equipment')).toHaveLength(0)
  })

  it('includes dual-role accounts in both seller and service pools', () => {
    useAccountRegistry.getState().registerAccount({
      id: 'dual1',
      email: 'both@co.de',
      company: 'Dual Co',
      accountType: 'seller',
      accountTypes: ['seller', 'service_provider'],
      status: 'active',
      industries: ['automotive'],
      categories: { automotive: ['robots'] },
      serviceCategories: ['project-management'],
    })
    const { getSellersByCategory, getServiceProvidersByCategory } = useAccountRegistry.getState()
    expect(getSellersByCategory('automotive', 'robots')).toHaveLength(1)
    expect(getServiceProvidersByCategory('project-management')).toHaveLength(1)
  })
})
