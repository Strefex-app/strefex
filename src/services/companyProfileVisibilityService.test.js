import { describe, it, expect } from 'vitest'
import { evaluateCompanyProfileDirectory, buildCompanyVisibilityUpdate } from './companyProfileVisibilityService'
import { PROFILE_ATTACHMENT_SLOT, VISIBILITY_TIER } from '../constants/companyProfileDirectory'

describe('companyProfileVisibilityService', () => {
  it('marks incomplete when mandatory fields missing', () => {
    const snap = evaluateCompanyProfileDirectory({
      account_type: 'seller',
      name: 'ACME',
      address: 'short',
      country: '',
      city: '',
      email: 'a@b.co',
      phone: '+12345678901',
      website: 'https://acme.com',
      industries: ['automotive'],
      metadata: { company_summary: 'x'.repeat(50) },
      profile_attachments: [],
    })
    expect(snap.mandatoryComplete).toBe(false)
    expect(snap.visibilityTier).toBe(VISIBILITY_TIER.INCOMPLETE)
  })

  it('standard when mandatory satisfied', () => {
    const snap = evaluateCompanyProfileDirectory({
      account_type: 'seller',
      name: 'ACME GmbH',
      address: '123 Industrial Way, Suite 400',
      country: 'Germany',
      city: 'Munich',
      email: 'sales@acme.com',
      phone: '+49891234567',
      website: 'https://acme.com',
      industries: ['automotive'],
      metadata: { company_summary: 'x'.repeat(45) },
      profile_attachments: [
        {
          id: '1',
          path: 'c/p/a.pdf',
          name: 'deck.pdf',
          mime_type: 'application/pdf',
          profile_slot: PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION,
        },
      ],
    })
    expect(snap.mandatoryComplete).toBe(true)
    expect(snap.extraComplete).toBe(false)
    expect(snap.visibilityTier).toBe(VISIBILITY_TIER.STANDARD)
  })

  it('verified overrides when external audit passed', () => {
    const u = buildCompanyVisibilityUpdate({
      account_type: 'seller',
      name: 'ACME',
      external_audit_status: 'passed',
      industries: [],
      metadata: {},
      profile_attachments: [],
    })
    expect(u.visibility_tier).toBe(VISIBILITY_TIER.VERIFIED)
  })

  it('reads industries from metadata when top-level industries missing', () => {
    const snap = evaluateCompanyProfileDirectory({
      account_type: 'seller',
      name: 'ACME GmbH',
      address: '123 Industrial Way, Suite 400',
      country: 'Germany',
      city: 'Munich',
      email: 'sales@acme.com',
      phone: '+49891234567',
      website: 'https://acme.com',
      metadata: {
        company_summary: 'x'.repeat(45),
        industries: ['automotive'],
      },
      profile_attachments: [
        {
          id: '1',
          path: 'c/p/a.pdf',
          name: 'deck.pdf',
          mime_type: 'application/pdf',
          profile_slot: PROFILE_ATTACHMENT_SLOT.COMPANY_PRESENTATION,
        },
      ],
    })
    expect(snap.mandatory.industries).toBe(true)
    expect(snap.mandatoryComplete).toBe(true)
  })
})
