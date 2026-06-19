/**
 * Auth store — httpOnly cookie mode (phase 8).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../store/authStore'

vi.mock('../config/authCookies', () => ({
  AUTH_USE_COOKIES: true,
}))

describe('Auth Store (cookie mode)', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    localStorage.clear()
  })

  it('does not persist JWT in localStorage when cookies are enabled', () => {
    useAuthStore.getState().login({
      role: 'admin',
      token: 'should-not-persist',
      expiresAt: Date.now() + 3600000,
      user: { id: '1', email: 'a@test.com', fullName: 'A', role: 'admin' },
    })

    const raw = JSON.parse(localStorage.getItem('strefex-auth'))
    expect(raw.token).toBe(null)
    expect(useAuthStore.getState().token).toBe(null)
    expect(useAuthStore.getState().isTokenValid()).toBe(true)
  })
})
