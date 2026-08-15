import { afterEach, describe, expect, it } from 'vitest'
import {
  saveFeatureGrants,
  setServerFeatureGrants,
  userHasActiveFeatureGrant,
} from '../utils/featureGrants'

describe('featureGrants', () => {
  afterEach(() => {
    setServerFeatureGrants(null)
    localStorage.clear()
  })

  it('uses localStorage before server hydrate', () => {
    saveFeatureGrants([
      { featureKey: 'auditProProgram', email: 'user@company.com', status: 'active' },
    ])
    expect(userHasActiveFeatureGrant('auditProProgram', 'user@company.com', '1')).toBe(true)
  })

  it('ignores localStorage after server hydrate', () => {
    saveFeatureGrants([
      { featureKey: 'auditProProgram', email: 'user@company.com', status: 'active' },
    ])
    setServerFeatureGrants([])
    expect(userHasActiveFeatureGrant('auditProProgram', 'user@company.com', '1')).toBe(false)
  })

  it('honors hydrated server grants', () => {
    setServerFeatureGrants([
      { featureKey: 'auditProProgram', email: 'user@company.com', status: 'active' },
    ])
    expect(userHasActiveFeatureGrant('auditProProgram', 'user@company.com', '1')).toBe(true)
  })
})
