/**
 * Email verification API client (phase 10).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../store/authStore', () => ({
  useAuthStore: {
    getState: () => ({ token: null, logout: vi.fn() }),
  },
}))

vi.mock('../config/authCookies', () => ({
  AUTH_USE_COOKIES: true,
}))

import { authApi } from '../services/api'

describe('authApi email verification', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('verifyEmail posts token without auth', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ email_verified: true, email: 'a@test.com' }),
    })

    const result = await authApi.verifyEmail('secret-token')
    expect(result.email_verified).toBe(true)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/verify-email'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ token: 'secret-token' }),
      }),
    )
  })

  it('resendVerification posts email without auth', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    })

    const result = await authApi.resendVerification('user@company.com')
    expect(result.status).toBe('ok')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/resend-verification'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@company.com' }),
      }),
    )
  })
})
