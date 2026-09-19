import { describe, it, expect } from 'vitest'
import {
  accountToSourcingSupplier,
  platformIndustryFromSourcing,
  buildBuyerPlants,
  slimSourcingSupplier,
  buildPlatformSourcingPayload,
  buildSourcingHomeWidgets,
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
      equipmentSubcategories: { automotive: { 'mold-makers': ['auto-mold-standard'] } },
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
    expect(row.equipmentCategoryIds).toContain('mold-makers')
    expect(row.equipmentCategoryIds).not.toContain('tooling')
    expect(row.subcategoryIds).toContain('auto-mold-standard')
    expect(row.subcategoryIds).not.toContain('tool-mould')
    expect(row.subcategoryIds).not.toContain('tool-die')
    expect(row.accountTypes).toContain('seller')
  })

  it('maps only checked equipment subcategories onto sourcing cards', () => {
    const row = accountToSourcingSupplier({
      id: 'die-only',
      company: 'Die Co',
      country: 'Germany',
      city: 'Munich',
      industries: ['automotive'],
      accountType: 'seller',
      categories: { automotive: ['mold-makers'] },
      equipmentSubcategories: { automotive: { 'mold-makers': ['auto-die-making'] } },
    })
    expect(row.equipmentCategoryIds).toContain('mold-makers')
    expect(row.subcategoryIds).toEqual(['auto-die-making'])
    expect(sourcingSupplierMatchesDomainCategory(row, 'equipment', 'mold-makers', 'auto-die-making')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(row, 'equipment', 'mold-makers', 'auto-mold-standard')).toBe(false)
  })

  it('does not invent subcategory ids from parent-only checkmarks', () => {
    const row = accountToSourcingSupplier({
      id: 'parent-only',
      company: 'Parent Only Co',
      country: 'Germany',
      city: 'Berlin',
      industries: ['automotive'],
      accountType: 'seller',
      categories: { automotive: ['mold-makers'] },
      productCategories: { automotive: ['plastic'] },
    })
    expect(row.equipmentCategoryIds).toContain('mold-makers')
    expect(row.productCategoryIds).toContain('plastic')
    expect(row.subcategoryIds).toEqual([])
    expect(sourcingSupplierMatchesDomainCategory(row, 'equipment', 'mold-makers', 'auto-die-making')).toBe(true)
  })

  it('reads subcategory ids from nested or flat account maps', () => {
    const nested = accountToSourcingSupplier({
      id: 'flat-subs',
      company: 'Flat Co',
      country: 'Germany',
      city: 'Cologne',
      industries: ['automotive'],
      accountType: 'seller',
      productCategories: { automotive: ['plastic'] },
      productSubcategories: { automotive: ['auto-injection'] },
    })
    expect(nested.subcategoryIds).toContain('auto-injection')
    expect(sourcingSupplierMatchesDomainCategory(nested, 'product', 'plastic', 'auto-injection')).toBe(true)
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
    expect(sourcingSupplierMatchesDomainCategory(seller, 'service', 'quality-services')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(seller, 'product', 'plastic')).toBe(true)
    expect(sourcingSupplierMatchesDomainCategory(provider, 'product', 'plastic')).toBe(false)
    expect(sourcingSupplierMatchesDomainCategory(provider, 'service', 'quality-services')).toBe(true)
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

  it('does not invent fit/risk/spend metrics when account fields are missing', () => {
    const row = accountToSourcingSupplier({
      id: 'bare-metrics',
      company: 'Bare Metrics Co',
      country: 'Germany',
      city: 'Berlin',
      industries: ['automotive'],
      accountType: 'seller',
      productCategories: { automotive: ['plastic'] },
    })
    expect(row.fit).toBeNull()
    expect(row.risk).toBeNull()
    expect(row.cap).toBeNull()
    expect(row.onTime).toBeNull()
    expect(row.ppm).toBeNull()
    expect(row.lead).toBeNull()
    expect(row.spend).toBeNull()
    expect(row.delta).toBeNull()
    expect(row.certs).toEqual([])
    expect(row.source).toBe('registered')
  })

  it('passes through declared account metrics only', () => {
    const row = accountToSourcingSupplier({
      id: 'scored',
      company: 'Scored Co',
      country: 'Germany',
      city: 'Munich',
      industries: ['automotive'],
      accountType: 'seller',
      fitLevel: 77,
      riskLevel: 22,
      capacityLevel: 65,
      leadTimeDays: 28,
      certifications: ['IATF 16949'],
      priceIndex: 103,
    })
    expect(row.fit).toBe(77)
    expect(row.risk).toBe(22)
    expect(row.cap).toBe(65)
    expect(row.lead).toBe(28)
    expect(row.delta).toBe(3)
    expect(row.certs).toEqual(['IATF 16949'])
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
        profileAttachments: [{ slot: 'catalogue', name: 'Jane-passport.pdf' }],
      },
    ])
    const dir = loadNetworkManufacturers()
    expect(dir.some((r) => r.id === 'm1' && r.company === 'Maker GmbH')).toBe(true)
    expect(dir.some((r) => r.email === 'plant@maker.de')).toBe(false)
    expect(dir.every((r) => r.profileAttachments == null)).toBe(true)
    const merged = mergeNetworkManufacturersWithAccounts([])
    expect(merged.some((r) => r.company === 'Maker GmbH')).toBe(true)
  })

  it('slims empty supplier fields and can omit taxonomy from the iframe payload', () => {
    const slim = slimSourcingSupplier({
      name: 'Forge',
      city: '',
      fin: '—',
      certs: [],
      lead: 0,
      incomplete: false,
    })
    expect(slim.name).toBe('Forge')
    expect(slim.lead).toBe(0)
    expect(slim.incomplete).toBe(false)
    expect(slim.city).toBeUndefined()
    expect(slim.fin).toBeUndefined()
    expect(slim.certs).toBeUndefined()

    const withTax = buildPlatformSourcingPayload({ registrySellers: [] })
    const withoutTax = buildPlatformSourcingPayload({ registrySellers: [], includeTaxonomy: false })
    expect(withTax.taxonomy).toBeTruthy()
    expect(withTax.taxonomyVersion).toBeTruthy()
    expect(withoutTax.taxonomy).toBeUndefined()
    expect(withoutTax.taxonomyVersion).toBe(withTax.taxonomyVersion)
    expect(withTax.homeWidgets.funnelTotal).toBe(0)
    expect(withTax.homeWidgets.gapHeadline).toMatch(/live issue/i)
  })

  it('builds home widgets from registered accounts, not canvas seed counts', () => {
    const listed = accountToSourcingSupplier({
      id: 'a1',
      company: 'Listed Forge',
      accountType: 'seller',
      status: 'active',
      country: 'Germany',
      city: 'Munich',
      industries: ['automotive'],
    })
    const incomplete = accountToSourcingSupplier({
      id: 'a2',
      company: 'Incomplete Plant',
      accountType: 'seller',
      status: 'active',
    })
    const widgets = buildSourcingHomeWidgets({
      suppliers: [listed, incomplete],
      rfqs: [],
      buyers: [],
    })
    expect(widgets.funnelTotal).toBe(2)
    expect(widgets.mapVisible).toBe(1)
    expect(widgets.alertsCount).toBeGreaterThan(0)
    expect(widgets.alerts.some((a) => /registered supplier/i.test(a.text))).toBe(true)
    expect(widgets.gaps.some((g) => g.area === 'Registration path')).toBe(true)
    expect(widgets.gaps.some((g) => g.area === 'RFQs')).toBe(true)
    expect(widgets.gaps.some((g) => g.area === 'Logistics')).toBe(true)
    expect(widgets.gapHeadline).not.toMatch(/16/)
    expect(String(widgets.mapVisible)).not.toBe('412')
  })

  it('does not use seller email as the sourcing plant name or iframe field', () => {
    const row = accountToSourcingSupplier({
      id: 'a-email',
      email: 'secret@maker.de',
      contactName: 'Jane Doe',
      accountType: 'seller',
      country: 'Germany',
      city: 'Munich',
      industries: ['automotive'],
    })
    expect(row.name).toBe('Registered supplier')
    expect(row.name).not.toContain('@')
    expect(accountToSourcingSupplier({
      id: 'a-person',
      company: 'Jane Doe',
      contactName: 'Jane Doe',
      accountType: 'seller',
      country: 'Germany',
      city: 'Munich',
      industries: ['automotive'],
    }).name).toBe('Registered supplier')
    const slim = slimSourcingSupplier({ ...row, email: 'secret@maker.de', address: 'Street 1' })
    expect(slim.email).toBeUndefined()
    expect(slim.address).toBeUndefined()
  })
})
