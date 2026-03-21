import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RegisteredSuppliersPage from '../pages/RegisteredSuppliersPage'

vi.mock('../services/supabaseService', () => ({
  isSupabaseConfigured: true,
  platformRegisteredSuppliersService: {
    list: vi.fn().mockResolvedValue([]),
  },
  supplierDirectoryStorageService: {
    maxBytes: 52428800,
    uploadForRegisteredSupplier: vi.fn(),
    remove: vi.fn(),
    getSignedUrl: vi.fn(),
  },
}))

vi.mock('../components/AppLayout', () => ({
  default: ({ children }) => <div data-testid="app-layout">{children}</div>,
}))

describe('RegisteredSuppliersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows neutral empty copy and no error alert when list is empty', async () => {
    render(
      <MemoryRouter>
        <RegisteredSuppliersPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/No contacts yet/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/The directory is empty/i)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
