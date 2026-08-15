import { describe, expect, it } from 'vitest'
import {
  authorizeRfqWrite,
  isPlatformAdminProfile,
} from '../../api/_lib/rfqAccess.js'

describe('isPlatformAdminProfile', () => {
  it('allows superadmin and external auditor', () => {
    expect(isPlatformAdminProfile({ role: 'superadmin' })).toBe(true)
    expect(isPlatformAdminProfile({ role: 'auditor_external' })).toBe(true)
  })

  it('rejects company roles', () => {
    expect(isPlatformAdminProfile({ role: 'admin' })).toBe(false)
    expect(isPlatformAdminProfile({ role: 'user' })).toBe(false)
    expect(isPlatformAdminProfile(null)).toBe(false)
  })
})

describe('authorizeRfqWrite', () => {
  it('lets platform admins do anything', () => {
    expect(authorizeRfqWrite({ isAdmin: true, action: 'respond' }).ok).toBe(true)
    expect(authorizeRfqWrite({ isAdmin: true, action: 'status', status: 'closed' }).ok).toBe(true)
  })

  it('blocks a random user from forging a supplier response', () => {
    const result = authorizeRfqWrite({
      isAdmin: false,
      isSupplierEditor: false,
      isBuyerMember: true,
      action: 'respond',
    })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(403)
  })

  it('lets the invited supplier submit a response', () => {
    expect(
      authorizeRfqWrite({
        isAdmin: false,
        isSupplierEditor: true,
        isBuyerMember: false,
        action: 'respond',
      }).ok,
    ).toBe(true)
  })

  it('lets the supplier mark viewed/responded/rejected', () => {
    for (const status of ['viewed', 'responded', 'rejected']) {
      expect(
        authorizeRfqWrite({
          isAdmin: false,
          isSupplierEditor: true,
          isBuyerMember: false,
          action: 'status',
          status,
        }).ok,
      ).toBe(true)
    }
  })

  it('lets the buyer close or re-invite, but not forge viewed', () => {
    expect(
      authorizeRfqWrite({
        isAdmin: false,
        isSupplierEditor: false,
        isBuyerMember: true,
        action: 'status',
        status: 'closed',
      }).ok,
    ).toBe(true)
    expect(
      authorizeRfqWrite({
        isAdmin: false,
        isSupplierEditor: false,
        isBuyerMember: true,
        action: 'status',
        status: 'invited',
      }).ok,
    ).toBe(true)
    const forged = authorizeRfqWrite({
      isAdmin: false,
      isSupplierEditor: false,
      isBuyerMember: true,
      action: 'status',
      status: 'responded',
    })
    expect(forged.ok).toBe(false)
    expect(forged.status).toBe(403)
  })

  it('blocks a supplier from closing the buyer link', () => {
    const result = authorizeRfqWrite({
      isAdmin: false,
      isSupplierEditor: true,
      isBuyerMember: false,
      action: 'status',
      status: 'closed',
    })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(403)
  })
})
