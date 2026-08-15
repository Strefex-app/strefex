import { describe, expect, it } from 'vitest'
import { sessionExpiresAtMs } from './sessionExpiry'

describe('sessionExpiresAtMs', () => {
  it('converts unix seconds to milliseconds', () => {
    expect(sessionExpiresAtMs({ expires_at: 1_700_000_000 })).toBe(1_700_000_000_000)
  })

  it('accepts numeric strings from JSON', () => {
    expect(sessionExpiresAtMs({ expires_at: '1700000000' })).toBe(1_700_000_000_000)
  })

  it('returns null when expiry is missing', () => {
    expect(sessionExpiresAtMs(null)).toBe(null)
    expect(sessionExpiresAtMs({})).toBe(null)
    expect(sessionExpiresAtMs({ expires_at: 0 })).toBe(null)
  })
})
