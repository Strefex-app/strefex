import { describe, it, expect, beforeEach } from 'vitest'
import { analyzeRfqEvidenceGaps } from '../utils/rfqEvidenceGaps'
import { needsTrustSetup, trustSetupProgress } from '../utils/trustSetup'
import { ensureCommercialBinderForAward } from '../utils/awardCommercialBinder'
import useIatfControlStore from '../store/iatfControlStore'

const future = '2099-12-31'

describe('RFQ evidence gap analysis', () => {
  it('flags missing primary certificate as a gap', () => {
    const analysis = analyzeRfqEvidenceGaps({
      rfq: { industryId: 'automotive', requirements: { ppapLevel: '3', traceabilityRequired: true } },
      certificates: [],
      parts: [],
      lots: [],
    })
    expect(analysis.gapCount).toBeGreaterThan(0)
    expect(analysis.checks.some((c) => c.id === 'primary_cert' && c.status === 'gap')).toBe(true)
    expect(analysis.checks.some((c) => c.id === 'ppap')).toBe(true)
    expect(analysis.checks.some((c) => c.id === 'trace')).toBe(true)
  })

  it('marks primary cert and PPAP on file when plant records match', () => {
    const analysis = analyzeRfqEvidenceGaps({
      rfq: { industryId: 'automotive', requirements: { ppapLevel: '3' } },
      certificates: [{
        standard: 'iatf_16949',
        number: 'IATF-1',
        certifyingBody: 'TÜV',
        expiresAt: future,
      }],
      parts: [{ ppapLevel: '3', ppapStatus: 'approved' }],
      lots: [],
    })
    expect(analysis.checks.find((c) => c.id === 'primary_cert')?.status).toBe('on_file')
    expect(analysis.checks.find((c) => c.id === 'ppap')?.status).toBe('on_file')
    expect(analysis.isReady).toBe(true)
  })

  it('detects medical ISO 13485 requirement from RFQ', () => {
    const analysis = analyzeRfqEvidenceGaps({
      rfq: { industryId: 'medical', requirements: { iso13485Required: true } },
      certificates: [],
      parts: [],
      lots: [],
    })
    expect(analysis.checks.some((c) => c.id === 'iso_13485' && c.status === 'gap')).toBe(true)
  })
})

describe('trust setup helpers', () => {
  beforeEach(() => {
    useIatfControlStore.setState({
      plantIndustry: 'general',
      certificates: [],
      publishedCard: null,
    })
  })

  it('needs setup when no cert and no published card', () => {
    expect(needsTrustSetup()).toBe(true)
    expect(trustSetupProgress().done).toBeLessThan(3)
  })

  it('is complete when published card exists', () => {
    useIatfControlStore.setState({
      plantIndustry: 'automotive',
      certificates: [{
        standard: 'iatf_16949',
        number: 'IATF-1',
        certifyingBody: 'TÜV',
        expiresAt: future,
      }],
      publishedCard: { publishedAt: new Date().toISOString() },
    })
    expect(needsTrustSetup()).toBe(false)
    expect(trustSetupProgress().percent).toBe(100)
  })
})

describe('commercial binder on award', () => {
  beforeEach(() => {
    useIatfControlStore.setState({
      folders: [],
      documents: [],
      awards: [{
        id: 'awd-1',
        rfqId: 'rfq-1',
        projectId: 'prj-1',
        title: 'Housing',
        buyerRef: 'BR-1',
      }],
    })
  })

  it('creates an idempotent commercial project binder document', () => {
    const first = ensureCommercialBinderForAward({
      award: useIatfControlStore.getState().awards[0],
      projectId: 'prj-1',
      title: 'Housing',
      buyerRef: 'BR-1',
      rfqId: 'rfq-1',
    })
    expect(first.binderDocId).toBeTruthy()
    expect(useIatfControlStore.getState().documents.some((d) => d.type === 'project_binder')).toBe(true)

    const second = ensureCommercialBinderForAward({
      award: useIatfControlStore.getState().awards[0],
      projectId: 'prj-1',
      title: 'Housing',
      rfqId: 'rfq-1',
    })
    expect(second.already).toBe(true)
    expect(second.binderDocId).toBe(first.binderDocId)
    expect(useIatfControlStore.getState().documents.filter((d) => d.type === 'project_binder')).toHaveLength(1)
  })
})
