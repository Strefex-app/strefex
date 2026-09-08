import { beforeEach, describe, expect, it } from 'vitest'
import {
  acceptSellerGrowthInvite,
  buildSellerInviteRegisterUrl,
  createSellerGrowthInvite,
  dispatchRfqSellerGrowthInvites,
  getSellerGrowthInviteByToken,
} from '../utils/sellerGrowthInvites'

describe('sellerGrowthInvites', () => {
  beforeEach(() => {
    localStorage.removeItem('strefex-seller-growth-invites')
  })

  it('creates tracked register links for sellers', () => {
    const { invite } = createSellerGrowthInvite({
      inviteeEmail: 'plant@maker.de',
      inviteeName: 'Maker GmbH',
      inviterEmail: 'buyer@oem.com',
      inviterCompany: 'OEM AG',
      source: 'manual',
    })
    expect(invite.status).toBe('pending')
    expect(invite.token).toBeTruthy()
    const url = buildSellerInviteRegisterUrl(invite.token, { origin: 'https://app.strefex.test' })
    expect(url).toBe(`https://app.strefex.test/register?type=seller&invite=${invite.token}`)
    expect(getSellerGrowthInviteByToken(invite.token)?.inviteeEmail).toBe('plant@maker.de')
  })

  it('reuses pending invite for same inviter + email', () => {
    const first = createSellerGrowthInvite({
      inviteeEmail: 'a@b.com',
      inviterEmail: 'me@x.com',
    })
    const second = createSellerGrowthInvite({
      inviteeEmail: 'a@b.com',
      inviterEmail: 'me@x.com',
      rfqTitle: 'RFQ-1',
    })
    expect(second.reused).toBe(true)
    expect(second.invite.token).toBe(first.invite.token)
    expect(second.invite.rfqTitle).toBe('RFQ-1')
  })

  it('marks invite accepted after registration', () => {
    const { invite } = createSellerGrowthInvite({
      inviteeEmail: 'plant@maker.de',
      inviterEmail: 'buyer@oem.com',
    })
    const accepted = acceptSellerGrowthInvite(invite.token, {
      acceptedEmail: 'plant@maker.de',
      companyId: 'co-1',
    })
    expect(accepted.status).toBe('accepted')
    expect(getSellerGrowthInviteByToken(invite.token).status).toBe('accepted')
  })

  it('dispatches growth invites for RFQ email invitees', async () => {
    const results = await dispatchRfqSellerGrowthInvites({
      manualInvitees: [{ id: 'invite:plant@maker.de', email: 'plant@maker.de', name: 'Maker' }],
      supplierIds: ['invite:plant@maker.de'],
      rfq: { id: 'rfq-1', title: 'Trim parts' },
      inviterEmail: 'buyer@oem.com',
      inviterCompany: 'OEM',
    })
    expect(results).toHaveLength(1)
    expect(results[0].ok).toBe(true)
    expect(results[0].invite.source).toBe('rfq')
    expect(results[0].registerUrl).toContain('invite=')
    expect(results[0].mail).toBeTruthy()
  })
})
