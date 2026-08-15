import { describe, expect, it } from 'vitest'
import { assertAllowedOrigin, getBearerToken, hasRequestCredential } from '../../api/_lib/platformApi.js'

describe('getBearerToken', () => {
  it('reads a Bearer token and ignores other headers', () => {
    expect(getBearerToken({ headers: { authorization: 'Bearer abc' } })).toBe('abc')
    expect(getBearerToken({ headers: { authorization: 'Basic abc' } })).toBe('')
    expect(getBearerToken({ headers: {} })).toBe('')
  })
})

describe('hasRequestCredential', () => {
  it('accepts Bearer, API key, or cron secret', () => {
    expect(hasRequestCredential({ headers: { authorization: 'Bearer abc' } })).toBe(true)
    expect(hasRequestCredential({ headers: { 'x-api-key': 'k' } })).toBe(true)
    expect(hasRequestCredential({ headers: { 'x-cron-secret': 's' } })).toBe(true)
    expect(hasRequestCredential({ headers: {} })).toBe(false)
  })
})

describe('assertAllowedOrigin', () => {
  it('rejects missing Origin without credentials', () => {
    expect(assertAllowedOrigin({ headers: {} })).toBe(false)
  })

  it('allows missing Origin when a credential is present', () => {
    expect(assertAllowedOrigin({ headers: { authorization: 'Bearer t' } })).toBe(true)
  })

  it('allows missing Origin for webhook-style callers', () => {
    expect(assertAllowedOrigin({ headers: {} }, { allowUnauthenticatedNoOrigin: true })).toBe(true)
  })
})
