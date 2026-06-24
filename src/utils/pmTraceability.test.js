import { describe, it, expect } from 'vitest'
import { buildProcurementTraceRows } from './pmTraceability'

describe('pmTraceability', () => {
  it('builds a flat row linking program through PO', () => {
    const rows = buildProcurementTraceRows({
      programs: [{ id: 'pgm-1', programNumber: 'PGM-2026-001' }],
      projects: [{ id: 'proj-1', programId: 'pgm-1', projectNumber: 'PGM-2026-001-P01', name: 'Line 4' }],
      opportunities: [{
        id: 'opp-1',
        opportunityNumber: 'OPP-2026-001',
        projectId: 'proj-1',
        programId: 'pgm-1',
        programNumber: 'PGM-2026-001',
        projectNumber: 'PGM-2026-001-P01',
        title: 'CNC spindle',
      }],
      quotations: [{
        id: 'quo-1',
        quotationNumber: 'QUO-2026-001',
        opportunityId: 'opp-1',
        projectId: 'proj-1',
        programId: 'pgm-1',
        programNumber: 'PGM-2026-001',
        projectNumber: 'PGM-2026-001-P01',
        opportunityNumber: 'OPP-2026-001',
        vendor: 'Acme GmbH',
        supplierQuotationRef: 'VQ-8842',
        amount: 12000,
        currency: 'EUR',
        status: 'signed',
        linkedPOId: 'PO-2026-0001',
      }],
      purchaseOrders: [{
        id: 'PO-2026-0001',
        projectId: 'proj-1',
        programId: 'pgm-1',
        programNumber: 'PGM-2026-001',
        projectNumber: 'PGM-2026-001-P01',
        quotationId: 'quo-1',
        quotationNumber: 'QUO-2026-001',
        vendorName: 'Acme GmbH',
        totalAmount: 12000,
        currency: 'EUR',
        status: 'approved',
      }],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].programNumber).toBe('PGM-2026-001')
    expect(rows[0].projectNumber).toBe('PGM-2026-001-P01')
    expect(rows[0].opportunityNumber).toBe('OPP-2026-001')
    expect(rows[0].quotationNumber).toBe('QUO-2026-001')
    expect(rows[0].supplier).toBe('Acme GmbH')
    expect(rows[0].supplierQuotationRef).toBe('VQ-8842')
    expect(rows[0].poNumber).toBe('PO-2026-0001')
  })
})
