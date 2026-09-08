import { describe, it, expect } from 'vitest'
import {
  BUYER_SERVICE_INDUSTRY_PATH,
  BUYER_SERVICE_SOURCING_PATH,
  canAccessLegacyServiceHub,
} from '../utils/serviceHubAccess'

describe('serviceHubAccess', () => {
  it('allows service providers, auditors, and superadmin on legacy Service Hub', () => {
    expect(canAccessLegacyServiceHub({ accountType: 'service_provider' })).toBe(true)
    expect(canAccessLegacyServiceHub({ accountTypes: ['service_provider', 'buyer'] })).toBe(true)
    expect(canAccessLegacyServiceHub({ accountType: 'auditor' })).toBe(true)
    expect(canAccessLegacyServiceHub({ accountType: 'buyer', isSuperAdmin: true })).toBe(true)
  })

  it('blocks buyers and sellers from legacy Service Hub', () => {
    expect(canAccessLegacyServiceHub({ accountType: 'buyer' })).toBe(false)
    expect(canAccessLegacyServiceHub({ accountType: 'seller' })).toBe(false)
    expect(canAccessLegacyServiceHub({ accountTypes: ['buyer', 'seller'] })).toBe(false)
  })

  it('exports buyer entry paths', () => {
    expect(BUYER_SERVICE_SOURCING_PATH).toBe('/hub/procurement')
    expect(BUYER_SERVICE_INDUSTRY_PATH).toBe('/hub/procurement')
  })
})
