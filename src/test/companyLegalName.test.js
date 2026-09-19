import { describe, expect, it } from 'vitest'
import {
  applyCompanyNamingStandard,
  companyLegalNameError,
  pickLegalCompanyName,
} from '../utils/companyLegalName'

describe('companyLegalName', () => {
  it('rejects contact name, email, and empty legal names', () => {
    expect(companyLegalNameError('', { contactName: 'Ada Lovelace' })).toMatch(/legal name/i)
    expect(companyLegalNameError('Ada Lovelace', { contactName: 'Ada Lovelace' })).toMatch(/different/i)
    expect(companyLegalNameError('ada@forge.de', { email: 'ada@forge.de' })).toMatch(/email/i)
    expect(companyLegalNameError('ada', { email: 'ada@forge.de' })).toMatch(/different/i)
  })

  it('accepts a registered company name even when it contains the contact surname', () => {
    expect(companyLegalNameError('Lovelace Tools GmbH', { contactName: 'Ada Lovelace' })).toBeNull()
  })

  it('keeps company and contact on separate fields', () => {
    const next = applyCompanyNamingStandard({
      company: 'Ada Lovelace',
      name: 'Ada Lovelace',
      contactName: 'Ada Lovelace',
      email: 'ada@forge.de',
    })
    expect(next.company).toBe('')
    expect(next.name).toBe('')
    expect(next.contactName).toBe('Ada Lovelace')
    expect(pickLegalCompanyName(next)).toBe('Registered supplier')
    expect(pickLegalCompanyName({
      company: 'Forge GmbH',
      contactName: 'Ada Lovelace',
      email: 'ada@forge.de',
    })).toBe('Forge GmbH')
  })
})
