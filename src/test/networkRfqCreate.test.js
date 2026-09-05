import { describe, it, expect, beforeEach } from 'vitest'
import useRfqStore from '../store/rfqStore'
import {
  buildBuyerRfqInitialDraft,
  createAndSendNetworkRfq,
  defaultQualityLevelForIndustry,
  resolveSourcingInvitees,
  sourcingContextFromPayload,
  sourcingRfqOpenContext,
} from '../utils/networkRfqCreate'

describe('networkRfqCreate', () => {
  beforeEach(() => {
    useRfqStore.setState({ rfqs: [], receivedRfqs: [] })
  })

  it('maps sourcing industry/category into create context', () => {
    const ctx = sourcingContextFromPayload({
      domain: 'product',
      industry: 'automotive',
      category: 'plastic',
      sel: ['Meridian Forge'],
    })
    expect(ctx.industryId).toBe('automotive')
    expect(ctx.categoryId).toBe('plastic')
    expect(ctx.rfqType).toBe('product')
  })

  it('resolves invitees from platformId and names', () => {
    const ids = resolveSourcingInvitees({
      sel: ['Acme Co'],
      suppliers: [{ name: 'Acme Co', platformId: 'acct-1' }],
    }, [{ id: 'acct-1', company: 'Acme Co', accountType: 'seller' }])
    expect(ids).toContain('acct-1')
  })

  it('seeds quality from industry and builds open context from sourcing payload', () => {
    expect(defaultQualityLevelForIndustry('automotive')).toBe('iatf_16949')
    const draft = buildBuyerRfqInitialDraft({
      industryId: 'automotive',
      categoryId: 'plastic',
      title: 'RFQ — Automotive / plastic',
      supplierIds: ['a'],
    })
    expect(draft.requirements.coveredIndustries).toEqual(['automotive'])
    expect(draft.requirements.qualityLevel).toBe('iatf_16949')

    const open = sourcingRfqOpenContext({
      domain: 'product',
      industry: 'automotive',
      category: 'plastic',
      sel: ['Acme'],
      suppliers: [{ name: 'Acme', platformId: 'acct-1' }],
      buyer: { id: 'p1', name: 'Plant A', cc: 'DE' },
    }, [{ id: 'acct-1', company: 'Acme', accountType: 'seller' }])
    expect(open.industryId).toBe('automotive')
    expect(open.supplierIds).toContain('acct-1')
    expect(open.initialDraft.title).toMatch(/RFQ/)
    expect(open.plant.name).toBe('Plant A')
  })

  it('creates and sends RFQ into the shared store for later quote comparison', () => {
    const result = createAndSendNetworkRfq({
      title: 'IS bracket RFQ',
      rfqType: 'product',
      categoryId: 'plastic',
      supplierIds: ['sup-a', 'sup-b'],
      requirements: {
        quantity: 1000,
        unit: 'pcs',
        qualityLevel: 'iatf_16949',
        transportMode: 'sea',
        coveredIndustries: ['automotive'],
        packaging: 'Returnable',
      },
      deadline: '2026-10-01',
    }, {
      industryId: 'automotive',
      buyerEmail: 'buyer@example.com',
      buyerCompany: 'Buyer Co',
      source: 'intelligent-sourcing',
    })
    expect(result.ok).toBe(true)
    expect(result.rfq?.id).toBeTruthy()
    expect(result.rfq?.status).toBe('sent')
    expect(result.rfq?.buyerRefDisplay).toMatch(/^B-/)
    expect(result.rfq?.suppliers).toEqual(['sup-a', 'sup-b'])
    expect(result.rfq?.requestSource).toBe('intelligent-sourcing')
    expect(result.rfq?.requirements?.transportMode).toBe('sea')
    expect(result.rfq?.requirements?.coveredIndustries).toEqual(['automotive'])
    expect(result.rfq?.receivingPlant).toBeNull()

    const stored = useRfqStore.getState().getRfqById(result.rfq.id)
    expect(stored?.sellerResponses || []).toEqual([])
    const received = useRfqStore.getState().receivedRfqs || []
    expect(received.length).toBeGreaterThanOrEqual(2)
    expect(received.every((r) => r.rfqId === result.rfq.id)).toBe(true)
  })
})
