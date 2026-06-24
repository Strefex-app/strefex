import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVendors = []
const mockAddVendor = vi.fn((data) => {
  const vendor = {
    id: `vnd-${mockVendors.length + 1}`,
    vendorNumber: `VEND-${1000 + mockVendors.length + 1}`,
    general: data.general,
    connections: [],
    status: 'pending_approval',
  }
  mockVendors.push(vendor)
  return vendor
})

vi.mock('../store/vendorStore', () => ({
  default: {
    getState: () => ({
      vendors: mockVendors,
      getVendorById: (id) => mockVendors.find((v) => v.id === id),
      addVendor: mockAddVendor,
      addConnection: vi.fn((vendorId, conn) => {
        const v = mockVendors.find((row) => row.id === vendorId)
        if (v) v.connections.push(conn)
      }),
      updateVendor: vi.fn(),
    }),
  },
}))

vi.mock('../store/auditStore', () => ({
  default: {
    getState: () => ({ addLog: vi.fn() }),
  },
}))

import { ensureVendorFromProcurement, resolveVendorDisplay } from './vendorLinkage'

describe('vendorLinkage', () => {
  beforeEach(() => {
    mockVendors.length = 0
    mockAddVendor.mockClear()
  })

  it('creates a potential vendor when name is new', () => {
    const link = ensureVendorFromProcurement('Acme GmbH', {
      source: 'procurement',
      refType: 'quotation',
      refId: 'quo-1',
      refLabel: 'QUO-2026-001',
    })
    expect(link.vendorName).toBe('Acme GmbH')
    expect(link.isNew).toBe(true)
    expect(mockAddVendor).toHaveBeenCalledOnce()
  })

  it('reuses vendor by company name', () => {
    mockVendors.push({
      id: 'vnd-1',
      vendorNumber: 'VEND-1001',
      general: { companyName: 'Acme GmbH', legalName: 'Acme GmbH' },
      connections: [],
    })
    const link = ensureVendorFromProcurement('Acme GmbH', { refId: 'quo-2', refType: 'quotation' })
    expect(link.isNew).toBe(false)
    expect(mockAddVendor).not.toHaveBeenCalled()
  })

  it('resolveVendorDisplay matches vendor list', () => {
    const vendors = [{ id: 'v1', vendorNumber: 'VEND-1001', general: { companyName: 'Beta AG' }, status: 'active' }]
    const row = resolveVendorDisplay(vendors, { vendorName: 'Beta AG' })
    expect(row.vendorId).toBe('v1')
    expect(row.vendorNumber).toBe('VEND-1001')
  })
})
