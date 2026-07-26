import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import MachineIntelligenceDocsSection from '../components/machineDb/MachineIntelligenceDocsSection'
import MachineDbCataloguePage from '../pages/MachineDbCataloguePage'
import { useAuthStore } from '../store/authStore'

describe('CutDB integration', () => {
  it('renders CutDB card in machine intelligence docs section', () => {
    render(
      <MemoryRouter>
        <MachineIntelligenceDocsSection />
      </MemoryRouter>,
    )
    expect(screen.getByText('CutDB')).toBeTruthy()
    expect(screen.getByText('191 tools')).toBeTruthy()
    expect(screen.getByText('EDMDB')).toBeTruthy()
  })

  it('renders CutDB catalogue page for superadmin without loading machine seeds', async () => {
    useAuthStore.setState({ role: 'superadmin' })
    render(
      <MemoryRouter initialEntries={['/profile/machine-intelligence/cutdb']}>
        <Routes>
          <Route path="/profile/machine-intelligence/:catalogueId" element={<MachineDbCataloguePage />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Cutting Tools Intelligence')).toBeTruthy()
      expect(screen.getByText('Tool Catalogue')).toBeTruthy()
    }, { timeout: 12000 })
    expect(document.querySelector('iframe')).toBeNull()
    expect(document.querySelector('.stx-mdb-tabs')).toBeTruthy()
    expect(document.querySelector('.stx-mdb-overview-stats')).toBeTruthy()
    const overview = document.querySelector('.stx-mdb-overview-stats')
    expect(overview?.textContent).toMatch(/191/)
    expect(overview?.textContent).toMatch(/Tools/)
    expect(overview?.textContent).toMatch(/Suppliers/)
    expect(screen.queryByText('Loading catalogue…')).toBeNull()
  }, 15000)
})
