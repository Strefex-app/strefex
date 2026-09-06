import { describe, it, expect } from 'vitest'
import {
  accountToSourcingSupplier,
  platformIndustryFromSourcing,
  buildBuyerPlants,
} from '../utils/intelligentSourcingData'
import { sourcingSupplierMatchesDomainCategory } from '../utils/sourcingCategoryAliases'
import {
  ensureSourcingFieldPlaceholders,
  getAccountSourcingGaps,
  accountVisibleOnSourcingMap,
  publishAccountsToNetworkDirectory,
  loadNetworkManufacturers,
  mergeNetworkManufacturersWithAccounts,
  NETWORK_MANUFACTURERS_KEY,
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
      categories: { automotive: ['mold-makers'] },
    })
    expect(row.name).toBe('Test Forge')
    expect(row.cc).toBe('DE')
    expect(typeof row.lat).toBe('number')
    expect(typeof row.lon).toBe('number')
    expect(row.platformId).toBe('a1')
    expect(row.published).toBe(true)
    expect(row.stage).toBe(6)
    expect(row.industries).toContain('Automotive')
    expect(row.categoryIds).toContain('mold-makers')
    expect(row.equipmentCategoryIds).toContain('tooling')
    expect(row.subcategoryIds).toContain('tool-mould')
    expect(row.accountTypes).toContain('seller')
  })

  it('publishes with country alone when industry is set', () => {
    const row = accountToSourcingSupplier({
      id: 'a1b',
      company: 'Country Only',
      country: 'Russia',
      industries: ['automotive'],
      accountType: 'seller',
      categories: { automotive: ['mold-makers'] },
    })
    expect(row.published).toBe(true)
    expect(row.incomplete).toBe(false)
  })

  it('keeps sellers out of service domain and service providers out of product', () => {
    const seller = accountToSourcingSupplier({
      id: 's1',
      company: 'Parts Co',
      country: 'Germany',
      city: 'Stuttgart',
      industries: ['automotive'],
      accountType: 'seller',
      accountTypes: ['seller'],
      productCategories: { automotive: ['plastic'] },
    })
    const provider = accountToSourcingSupplier({
      id: 'sp1',
      company: 'Audit Co',
      country: 'Germany',
      city: 'Munich',
      industries: ['automotive'],
      accountType: 'service_provider',
      accountTypes: ['service_provider'],
      serviceCategories: ['quality-services'],
    })
    expect(sourcingSupplierMatchesDomainCategory(seller, 'service', 'audit')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(provider, 'product', 'plastic')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(provider, 'service', 'audit')).toBe(true)
    expect(provider.industries).toEqual(expect.arrayContaining(['Automotive']))
  })

  it('keeps incomplete profiles unpublished until geo + industry are set', () => {
    const row = accountToSourcingSupplier({
      id: 'a2',
      company: 'Bare Co',
      accountType: 'seller',
      industries: [],
    })
    expect(row.published).toBe(false)
    expect(row.stage).toBe(4)
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
    expect(ensured.coordinates).toBeUndefined()
  })

  it('backfills map coordinates when country is present', () => {
    const ensured = ensureSourcingFieldPlaceholders({
      id: 'y',
      email: 'forge@acme.de',
      accountType: 'seller',
      country: 'Germany',
      city: 'Stuttgart',
      industries: ['automotive'],
    })
    expect(ensured.coordinates).toHaveLength(2)
    expect(Number.isFinite(ensured.coordinates[0])).toBe(true)
    expect(Number.isFinite(ensured.coordinates[1])).toBe(true)
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

  it('treats dual-role accounts with seller as map-eligible', () => {
    expect(accountVisibleOnSourcingMap({
      accountType: 'buyer',
      accountTypes: ['buyer', 'seller'],
      country: 'Germany',
    })).toBe(true)
  })

  it('publishes visible sellers into the shared manufacturer directory', () => {
    localStorage.removeItem(NETWORK_MANUFACTURERS_KEY)
    publishAccountsToNetworkDirectory([
      {
        id: 'm1',
        email: 'plant@maker.de',
        company: 'Maker GmbH',
        accountType: 'seller',
        status: 'active',
        country: 'Germany',
        city: 'Munich',
        industries: ['automotive'],
      },
    ])
    const dir = loadNetworkManufacturers()
    expect(dir.some((r) => r.email === 'plant@maker.de')).toBe(true)
    const merged = mergeNetworkManufacturersWithAccounts([])
    expect(merged.some((r) => r.company === 'Maker GmbH')).toBe(true)
  })
})
