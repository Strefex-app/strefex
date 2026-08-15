import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../config/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: null,
}))

vi.mock('../services/supabaseService', () => ({
  profilesService: {
    getMyProfile: vi.fn(),
  },
}))

import ProtectedRoute from '../components/ProtectedRoute'
import { useAuthStore } from '../store/authStore'
import { profilesService } from '../services/supabaseService'

describe('ProtectedRoute (Supabase session)', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    localStorage.clear()
    profilesService.getMyProfile.mockReset()
  })

  it('does not kick the user when local expiresAt is stale', () => {
    useAuthStore.getState().login({
      role: 'user',
      token: 't',
      expiresAt: Date.now() - 1000,
      user: { email: 'u@test.com' },
      tenant: null,
    })
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login">Login</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="secret">Secret</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('secret')).toBeInTheDocument()
    expect(screen.queryByTestId('login')).not.toBeInTheDocument()
  })

  it('fails closed when the profile fetch fails on a privileged route', async () => {
    profilesService.getMyProfile.mockRejectedValue(new Error('network'))
    useAuthStore.getState().login({
      role: 'admin',
      token: 't',
      expiresAt: Date.now() + 3600000,
      user: { email: 'u@test.com' },
      tenant: null,
    })
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login">Login</div>} />
          <Route path="/main-menu" element={<div data-testid="menu">Menu</div>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <div data-testid="secret">Secret</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('menu')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument()
  })
})
