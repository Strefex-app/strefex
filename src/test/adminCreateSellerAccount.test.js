import { describe, expect, it } from 'vitest'
import {
  buildAdminCreatedSellerEmail,
  isAdminCreatedPlaceholderEmail,
  createAdminSellerAccount,
  transferSellerAccountRights,
} from '../utils/adminCreateSellerAccount'

describe('adminCreateSellerAccount', () => {
  it('builds placeholder emails for admin-created sellers', () => {
    const email = buildAdminCreatedSellerEmail('Acme Mold Tools')
    expect(isAdminCreatedPlaceholderEmail(email)).toBe(true)
    expect(email).toMatch(/^pending\.acme-mold-tools\./)
  })

  it('creates a local seller without auth and registers it', async () => {
    const created = []
    const result = await createAdminSellerAccount({
      companyName: 'Die Works GmbH',
      country: 'Germany',
      city: 'Munich',
      industryId: 'automotive',
      registerAccount: (row) => {
        created.push(row)
        return row
      },
    })
    expect(result.account.accountType).toBe('seller')
    expect(result.account.industries).toEqual(['automotive'])
    expect(result.account.country).toBe('Germany')
    expect(result.usedPlaceholderEmail).toBe(true)
    expect(created).toHaveLength(1)
    expect(created[0].adminCreated).toBe(true)
  })

  it('transfers rights to a real email', async () => {
    const patches = []
    const out = await transferSellerAccountRights({
      registryKey: 'pending.x@admin-created.strefex.local',
      currentEmail: 'pending.x@admin-created.strefex.local',
      newEmail: 'owner@maker.de',
      contactName: 'Owner',
      sendInvite: false,
      updateAccount: (key, patch) => {
        patches.push({ key, patch })
        return { email: patch.email, ...patch }
      },
    })
    expect(out.email).toBe('owner@maker.de')
    expect(patches[0].patch.pendingOwnerTransfer).toBe(false)
    expect(patches[0].patch.email).toBe('owner@maker.de')
  })
})
