import { describe, expect, it } from 'vitest'
import {
  authEmailRedirectTo,
  signupAwaitingConfirmation,
  signupLooksLikeExistingAccount,
} from '../utils/authEmailRedirect'

describe('authEmailRedirect', () => {
  it('builds a login confirmation URL from the app origin', () => {
    const href = authEmailRedirectTo('/login?confirmed=true')
    expect(href).toMatch(/\/login\?confirmed=true$/)
    expect(href.startsWith('http')).toBe(true)
  })

  it('detects pending confirmation and existing-account fake signups', () => {
    expect(signupAwaitingConfirmation({ user: { id: '1' }, session: null })).toBe(true)
    expect(signupAwaitingConfirmation({ user: { id: '1' }, session: { access_token: 'x' } })).toBe(false)
    expect(signupLooksLikeExistingAccount({ user: { identities: [] } })).toBe(true)
    expect(signupLooksLikeExistingAccount({ user: { identities: [{ id: 'i' }] } })).toBe(false)
  })
})
