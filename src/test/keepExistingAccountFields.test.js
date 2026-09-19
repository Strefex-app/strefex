import { describe, expect, it } from 'vitest'
import {
  mergeAccountsPreferFilled,
  omitEmptyCompanyScalars,
} from '../utils/keepExistingAccountFields'
import { mergeSourcingNetworkIntoRegistry } from '../services/sourcingNetworkService'
import { commitIndustryChecklist } from '../utils/companyTaxonomyPayload'

describe('keepExistingAccountFields', () => {
  it('does not replace a filled company name with empty or placeholder remote', () => {
    const merged = mergeAccountsPreferFilled(
      { company: '', name: 'Company', email: 'a@x.com', country: '' },
      { company: 'Acme Tools', email: 'a@x.com', country: 'Germany', city: 'Stuttgart' },
    )
    expect(merged.company).toBe('Acme Tools')
    expect(merged.country).toBe('Germany')
    expect(merged.city).toBe('Stuttgart')
  })

  it('omits empty company scalars so cloud update cannot null existing columns', () => {
    const payload = omitEmptyCompanyScalars(
      { name: '', email: null, phone: null, country: '', city: '', industries: [] },
      { name: 'Acme Tools', email: 'a@x.com', phone: '+49', country: 'Germany', industries: ['automotive'] },
    )
    expect(payload.name).toBe('Acme Tools')
    expect(payload.email).toBeUndefined()
    expect(payload.phone).toBeUndefined()
    expect(payload.country).toBeUndefined()
    expect(payload.industries).toEqual(['automotive'])
  })

  it('does not restore identified seller fields from local cache when the network RPC redacts them', () => {
    const merged = mergeSourcingNetworkIntoRegistry(
      [{
        id: '1',
        email: 'plant@maker.de',
        company: 'Maker GmbH',
        contactName: 'Anna Schmidt',
        phone: '+49170',
        address: 'Königstraße 1',
        country: 'Germany',
        city: 'Stuttgart',
      }],
      [{
        id: '1',
        email: '',
        company: 'Maker GmbH',
        contactName: '',
        phone: '',
        address: '',
        country: 'Germany',
        city: 'Stuttgart',
      }],
    )
    expect(merged[0].company).toBe('Maker GmbH')
    expect(merged[0].country).toBe('Germany')
    expect(merged[0].email).toBe('')
    expect(merged[0].address).toBe('')
    expect(merged[0].contactName).toBe('')
    expect(merged[0].phone).toBe('')
  })

  it('keeps identified fields on a partial admin patch that omitted those keys', () => {
    const merged = mergeAccountsPreferFilled(
      { company: 'Acme Tools', country: 'Germany' },
      { email: 'a@x.com', phone: '+49', address: 'Street 1', contactName: 'Ada' },
    )
    expect(merged.email).toBe('a@x.com')
    expect(merged.phone).toBe('+49')
    expect(merged.address).toBe('Street 1')
    expect(merged.contactName).toBe('Ada')
  })
})

describe('commitIndustryChecklist', () => {
  it('keeps the first industry when a second industry path is saved', () => {
    const first = commitIndustryChecklist({
      industryId: 'automotive',
      equipmentSubs: { 'mold-makers': ['auto-die-making'] },
    })
    const second = commitIndustryChecklist({
      industryId: 'machinery',
      equipmentSubs: { robots: ['industrial-robots'] },
      categories: first.categories,
      equipmentSubcategories: first.equipmentSubcategories,
    })
    expect(second.industries.sort()).toEqual(['automotive', 'machinery'])
    expect(second.categories.automotive).toContain('mold-makers')
    expect(second.categories.machinery).toContain('robots')
    expect(second.equipmentSubcategories.automotive['mold-makers']).toContain('auto-die-making')
  })
})
