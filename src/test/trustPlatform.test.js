import { describe, it, expect, beforeEach } from 'vitest'
import useEvidenceRequestStore from '../store/evidenceRequestStore'
import { analyzeShortlistGap, comparisonRowFromSupplier } from '../utils/shortlistGapAnalysis'

describe('evidence request store', () => {
  beforeEach(() => {
    useEvidenceRequestStore.setState({ requests: [] })
  })

  it('creates and tracks open buyer evidence requests', () => {
    const row = useEvidenceRequestStore.getState().createRequest({
      supplierId: 'sup-1',
      supplierName: 'Acme GmbH',
      industryId: 'medical',
      standardId: 'iso_13485',
      standardLabel: 'ISO 13485',
    })
    expect(row.status).toBe('open')
    expect(useEvidenceRequestStore.getState().hasOpenRequest('sup-1', 'iso_13485')).toBe(true)
    expect(useEvidenceRequestStore.getState().listOpenForSupplier('sup-1')).toHaveLength(1)
  })

  it('marks requests fulfilled', () => {
    const row = useEvidenceRequestStore.getState().createRequest({
      supplierId: 'sup-2',
      supplierName: 'Beta',
      industryId: 'automotive',
    })
    useEvidenceRequestStore.getState().markFulfilled(row.id)
    expect(useEvidenceRequestStore.getState().hasOpenRequest('sup-2')).toBe(false)
  })
})

describe('shortlist gap analysis', () => {
  it('flags suppliers missing primary standard', () => {
    const gap = analyzeShortlistGap([
      {
        id: 'a',
        display_name: 'Certified',
        reliabilityCard: { standards: { iso_13485: { valid: true } }, iso13485Valid: true },
        reliabilityScore: 60,
      },
      { id: 'b', display_name: 'Unknown', reliabilityScore: 0 },
    ], 'medical')
    expect(gap.withPrimary).toBe(1)
    expect(gap.withoutPrimary).toBe(1)
    expect(gap.gapSuppliers[0].name).toBe('Unknown')
  })

  it('builds comparison rows with evidence fields', () => {
    const row = comparisonRowFromSupplier({
      display_name: 'Plant A',
      reliabilityScore: 72,
      reliabilityPublished: true,
      reliabilityCard: {
        iatfValid: true,
        traceMethod: 'lot',
        ppapLevels: ['3'],
        standards: { iatf_16949: { valid: true, label: 'IATF 16949' } },
      },
    }, 'automotive')
    expect(row.evidenceScore).toBe(72)
    expect(row.evidenceSource).toBe('Published')
    expect(row.traceText).toBe('lot')
    expect(row.ppapText).toBe('L3')
  })
})
