import { describe, expect, it } from 'vitest'
import {
  mergeAccountsPreferFilled,
  omitEmptyCompanyScalars,
} from '../utils/keepExistingAccountFields'
import { mergeSourcingNetworkIntoRegistry } from '../services/sourcingNetworkService'

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

  it('keeps local supplier name when network RPC row is empty', () => {
    const merged = mergeSourcingNetworkIntoRegistry(
      [{ id: '1', email: 'plant@maker.de', company: 'Maker GmbH', country: 'Germany', city: 'Stuttgart' }],
      [{ id: '1', email: 'plant@maker.de', company: '', country: '', city: '', industries: ['automotive'] }],
    )
    expect(merged[0].company).toBe('Maker GmbH')
    expect(merged[0].country).toBe('Germany')
    expect(merged[0].city).toBe('Stuttgart')
    expect(merged[0].industries).toEqual(['automotive'])
  })
})
