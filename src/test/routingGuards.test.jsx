import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('../config/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null,
}))

import ProtectedRoute from '../components/ProtectedRoute'
import AccountTypeRoute from '../components/AccountTypeRoute'
import { useAuthStore } from '../store/authStore'

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    localStorage.clear()
  })

  it('redirects unauthenticated users to login', () => {
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
    expect(screen.getByTestId('login')).toBeInTheDocument()
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument()
  })

  it('renders children when authenticated', () => {
    useAuthStore.getState().login({
      role: 'user',
      token: 't',
      expiresAt: Date.now() + 3600000,
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
  })

  it('redirects to login when token is expired', () => {
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
    expect(screen.getByTestId('login')).toBeInTheDocument()
  })
})

describe('AccountTypeRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
    localStorage.clear()
  })

  it('allows matching account type', () => {
    useAuthStore.getState().login({
      role: 'user',
      token: 't',
      expiresAt: Date.now() + 3600000,
      user: { email: 's@test.com', accountType: 'seller', primaryAccountType: 'seller' },
      tenant: { id: '1', name: 'C', slug: 'c' },
    })
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route path="/main-menu" element={<div data-testid="home">Home</div>} />
          <Route
            path="/dash"
            element={
              <AccountTypeRoute allowed={['seller']}>
                <div data-testid="seller-dash">Seller</div>
              </AccountTypeRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('seller-dash')).toBeInTheDocument()
  })

  it('redirects when account type does not match', () => {
    useAuthStore.getState().login({
      role: 'user',
      token: 't',
      expiresAt: Date.now() + 3600000,
      user: { email: 'b@test.com', accountType: 'buyer', primaryAccountType: 'buyer' },
      tenant: { id: '1', name: 'C', slug: 'c' },
    })
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route path="/main-menu" element={<div data-testid="home">Home</div>} />
          <Route
            path="/dash"
            element={
              <AccountTypeRoute allowed={['seller']}>
                <div data-testid="seller-dash">Seller</div>
              </AccountTypeRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home')).toBeInTheDocument()
    expect(screen.queryByTestId('seller-dash')).not.toBeInTheDocument()
  })

  it('lets superadmin bypass account type check', () => {
    useAuthStore.getState().login({
      role: 'superadmin',
      token: 't',
      expiresAt: Date.now() + 3600000,
      user: { email: 'strefex@strfgroup.ru', accountType: 'buyer' },
      tenant: null,
    })
    render(
      <MemoryRouter initialEntries={['/dash']}>
        <Routes>
          <Route path="/main-menu" element={<div data-testid="home">Home</div>} />
          <Route
            path="/dash"
            element={
              <AccountTypeRoute allowed={['seller']}>
                <div data-testid="seller-dash">Seller</div>
              </AccountTypeRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('seller-dash')).toBeInTheDocument()
  })
})
