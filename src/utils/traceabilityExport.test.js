import { describe, it, expect } from 'vitest'
import { traceRowsToCsv } from './traceabilityExport'

describe('traceabilityExport', () => {
  it('builds CSV with header and escaped values', () => {
    const csv = traceRowsToCsv([
      {
        projectNumber: 'PRJ-2026-001',
        projectName: 'Line 4',
        opportunityNumber: 'OPP-2026-001',
        opportunityTitle: 'CNC, "special"',
        quotationNumber: 'QUO-2026-001',
        supplier: 'Acme GmbH',
        supplierQuotationRef: 'VQ-8842',
        amount: 12000,
        currency: 'EUR',
        quoteStatus: 'signed',
        poNumber: 'PO-2026-0001',
        poStatus: 'approved',
      },
    ])

    expect(csv.split('\n')[0]).toContain('Project')
    expect(csv).toContain('PRJ-2026-001')
    expect(csv).toContain('"CNC, ""special"""')
  })
})
