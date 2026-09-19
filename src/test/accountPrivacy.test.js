import { describe, expect, it } from 'vitest'
import {
  applyAccountPrivacyVeil,
  maskEmail,
  maskPersonName,
  maskPhone,
  shouldExposeIdentifiedAccount,
  veilAccountIdentifiedFields,
} from '../utils/accountPrivacy'

describe('accountPrivacy', () => {
  it('masks email, phone, and contact name', () => {
    expect(maskEmail('jane.doe@acme.com')).toBe('j••••@a••••.com')
    expect(maskPhone('+49 170 1234567')).toMatch(/•••• 67/)
    expect(maskPersonName('Jane Doe')).toBe('J. D.')
  })

  it('hides identified fields from other buyers by default', () => {
    const seller = {
      id: 'co-1',
      companyId: 'co-1',
      company: 'Acme GmbH',
      name: 'Acme GmbH',
      email: 'sales@acme.com',
      phone: '+491701234567',
      contactName: 'Jane Doe',
      city: 'Stuttgart',
      country: 'Germany',
      address: 'Königstraße 1',
    }
    const veiled = applyAccountPrivacyVeil([seller], {
      role: 'user',
      viewer: { companyId: 'buyer-1', email: 'buyer@oem.com' },
      grantedCompanyIds: [],
    })[0]
    expect(veiled.email).not.toContain('sales@acme.com')
    expect(veiled.address).toBe('')
    expect(veiled.contactName).toBe('J. D.')
    expect(veiled.company).toBe('Acme GmbH')
    expect(veiled.city).toBe('Stuttgart')
  })

  it('shows identified data after seller grant, to the owner, or to operators', () => {
    const seller = { id: 'co-1', companyId: 'co-1', email: 'sales@acme.com', contactName: 'Jane' }
    expect(shouldExposeIdentifiedAccount(seller, { privileged: true })).toBe(true)
    expect(shouldExposeIdentifiedAccount(seller, { viewer: { companyId: 'co-1' } })).toBe(true)
    expect(shouldExposeIdentifiedAccount(seller, {
      viewer: { companyId: 'buyer-1' },
      grantedCompanyIds: ['co-1'],
    })).toBe(true)
    expect(veilAccountIdentifiedFields(seller).identifiedVeiled).toBe(true)
  })
})
