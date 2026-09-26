import { describe, expect, it } from 'vitest'
import { resolveWorkspaceLandingPath } from '../utils/workspaceLanding'

describe('resolveWorkspaceLandingPath', () => {
  it('sends buyers to Home dashboard', () => {
    expect(resolveWorkspaceLandingPath({
      accountType: 'buyer',
      accountTypes: ['buyer'],
    })).toBe('/main-menu')
  })

  it('sends manufacturers to Home dashboard', () => {
    expect(resolveWorkspaceLandingPath({
      accountType: 'seller',
      accountTypes: ['seller'],
    })).toBe('/main-menu')
  })

  it('sends dual buyer+seller to Home dashboard', () => {
    expect(resolveWorkspaceLandingPath({
      accountType: 'buyer',
      accountTypes: ['buyer', 'seller'],
    })).toBe('/main-menu')
  })

  it('falls back to Management when account has no network roles', () => {
    expect(resolveWorkspaceLandingPath({
      accountType: null,
      accountTypes: [],
    })).toBe('/management')
  })

  it('sends auditors to the Auditors hub, not Home or Sourcing', () => {
    expect(resolveWorkspaceLandingPath({
      accountType: 'auditor',
      accountTypes: ['auditor'],
      role: 'auditor_external',
    })).toBe('/management/auditors/calendar')
  })
})
