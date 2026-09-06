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
})
