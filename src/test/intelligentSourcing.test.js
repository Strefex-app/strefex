import { describe, it, expect } from 'vitest'
import {
  accountToSourcingSupplier,
  platformIndustryFromSourcing,
  buildBuyerPlants,
} from '../utils/intelligentSourcingData'
import {
  ensureSourcingFieldPlaceholders,
  getAccountSourcingGaps,
  accountVisibleOnSourcingMap,
} from '../utils/accountSourcingCompleteness'

describe('intelligentSourcingData', () => {
  it('maps design industry ids to platform slugs', () => {
    expect(platformIndustryFromSourcing('automotive')).toBe('automotive')
    expect(platformIndustryFromSourcing('rawmat')).toBe('raw-materials')
    expect(platformIndustryFromSourcing('oilgas')).toBe('oil-gas')
  })

  it('builds map pins from registry accounts with country/city', () => {
    const row = accountToSourcingSupplier({
      id: 'a1',
      company: 'Test Forge',
      country: 'Germany',
      city: 'Stuttgart',
      industries: ['automotive'],
      accountType: 'seller',
    })
    expect(row.name).toBe('Test Forge')
    expect(row.cc).toBe('DE')
    expect(typeof row.lat).toBe('number')
    expect(typeof row.lon).toBe('number')
    expect(row.platformId).toBe('a1')
  })

  it('uses buyer account location as receiving plant when present', () => {
    const plants = buildBuyerPlants({
      account: { country: 'United States', city: 'Detroit', company: 'OEM Co', id: 'b1' },
    })
    expect(plants).toHaveLength(1)
    expect(plants[0].cc).toBe('US')
    expect(plants[0].platform).toBe(true)
  })
})

describe('accountSourcingCompleteness', () => {
  it('adds empty placeholders without inventing location values', () => {
    const ensured = ensureSourcingFieldPlaceholders({ id: 'x', email: 'a@b.com', accountType: 'seller' })
    expect(ensured.country).toBe('')
    expect(ensured.city).toBe('')
    expect(ensured.address).toBe('')
    expect(ensured.industries).toEqual([])
  })

  it('reports gaps for sellers missing map fields', () => {
    const gaps = getAccountSourcingGaps({
      accountType: 'seller',
      country: '',
      city: '',
      industries: [],
    })
    expect(gaps).toEqual(expect.arrayContaining(['country', 'city', 'address', 'industries']))
    expect(accountVisibleOnSourcingMap({ accountType: 'seller', country: '' })).toBe(false)
    expect(accountVisibleOnSourcingMap({ accountType: 'seller', country: 'DE' })).toBe(true)
  })
})
