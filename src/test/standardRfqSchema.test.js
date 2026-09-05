import { describe, expect, it } from 'vitest'
import {
  assessBidAgainstAsk,
  bidFormToPayload,
  comparisonBests,
  emptyBidFormState,
  normalizeRfqBid,
  seedBidFormFromAsk,
  summarizeRfqAsk,
} from '../utils/standardRfqSchema'

describe('normalizeRfqBid', () => {
  it('flattens cost buckets and aliases unit price', () => {
    const bid = normalizeRfqBid({
      unitPrice: 12.5,
      leadTimeDays: 30,
      feasibility: 'feasible_with_changes',
      qualityLevel: 'iatf_16949',
      capacityStatus: 'limited',
      costs: { material: 4, operations: 6, flexible: 2.5 },
      certConfirm: true,
      ppapCommit: '3',
    })
    expect(bid.unitPrice).toBe(12.5)
    expect(bid.price).toBe(12.5)
    expect(bid.materialCost).toBe(4)
    expect(bid.operationsCost).toBe(6)
    expect(bid.flexibleCost).toBe(2.5)
    expect(bid.leadTime).toBe(30)
    expect(bid.feasibility).toBe('feasible_with_changes')
    expect(bid.qualityLevel).toBe('iatf_16949')
    expect(bid.ppapLevelOffered).toBe('3')
    expect(bid.certConfirm).toBe(true)
  })

  it('derives unit price from cost sum when unit price missing', () => {
    const bid = normalizeRfqBid({
      costs: { material: 10, operations: 5, flexible: 1 },
      leadTimeDays: 14,
    })
    expect(bid.unitPrice).toBe(16)
  })
})

describe('bidFormToPayload', () => {
  it('maps empty form defaults through normalize', () => {
    const form = emptyBidFormState()
    form.unitPrice = '9.99'
    form.leadTimeDays = '21'
    form.costs = { material: '3', operations: '4', flexible: '2' }
    const payload = bidFormToPayload(form)
    expect(payload.unitPrice).toBe(9.99)
    expect(payload.materialCost).toBe(3)
    expect(payload.feasibility).toBe('feasible')
  })
})

describe('seedBidFormFromAsk', () => {
  it('prefills plant reply fields from buyer commercial ask', () => {
    const form = seedBidFormFromAsk({
      currency: 'EUR',
      qualityLevel: 'iatf_16949',
      incoterms: 'FOB',
      paymentTermsAsk: 'net30',
      ppapLevel: '3',
      moqAsk: 500,
      monthlyCapacityAsk: 2000,
    })
    expect(form.currency).toBe('EUR')
    expect(form.qualityLevel).toBe('iatf_16949')
    expect(form.incotermsOffer).toBe('FOB')
    expect(form.paymentTerms).toMatch(/Net 30/i)
    expect(form.ppapCommit).toBe('3')
    expect(form.moq).toBe('500')
  })
})

describe('summarizeRfqAsk', () => {
  it('returns commercial lines plus structured fields', () => {
    const ask = summarizeRfqAsk({
      title: 'Bracket RFQ',
      rfqType: 'product',
      requirements: {
        itemName: 'Bracket A',
        quantity: 1000,
        unit: 'pcs',
        maxLeadTime: 45,
        currency: 'USD',
        targetUnitPrice: '2.40',
        qualityLevel: 'iatf_16949',
        ppapLevel: '3',
        incoterms: 'FOB',
        paymentTermsAsk: 'net30',
        monthlyCapacityAsk: 5000,
        moqAsk: 250,
      },
    })
    expect(ask.rfqTypeLabel).toMatch(/Product/i)
    expect(ask.itemName).toBe('Bracket A')
    expect(ask.targetUnitPrice).toBe(2.4)
    expect(ask.qualityLevelLabel).toMatch(/IATF 16949/i)
    expect(ask.commercial.join(' ')).toMatch(/Target USD 2.40/)
    expect(ask.commercial.join(' ')).toMatch(/Incoterms: FOB/)
    expect(ask.commercial.join(' ')).toMatch(/Capacity ask: 5000/)
    expect(ask.quality).toContain('PPAP L3')
  })

  it('maps legacy quality levels onto ISO standards', () => {
    const ask = summarizeRfqAsk({
      requirements: { qualityLevel: 'medical_controlled' },
    })
    expect(ask.qualityLevel).toBe('iso_13485')
  })
})

describe('assessBidAgainstAsk', () => {
  it('returns no gaps when bid meets automotive ask', () => {
    const requirements = {
      maxLeadTime: 45,
      qualityLevel: 'iatf_16949',
      ppapLevel: '3',
      traceabilityRequired: true,
    }
    const bid = normalizeRfqBid({
      leadTimeDays: 40,
      qualityLevel: 'iatf_16949',
      ppapCommit: '3',
      certConfirm: true,
    })
    expect(assessBidAgainstAsk(bid, requirements)).toHaveLength(0)
  })
})

describe('comparisonBests', () => {
  it('highlights best commercial values and ignores not_feasible', () => {
    const bests = comparisonBests([
      {
        unitPrice: 20,
        materialCost: 8,
        operationsCost: 7,
        flexibleCost: 5,
        leadTime: 40,
        feasibility: 'feasible',
      },
      {
        unitPrice: 15,
        materialCost: 5,
        operationsCost: 6,
        flexibleCost: 4,
        leadTime: 25,
        feasibility: 'feasible',
      },
      {
        unitPrice: 1,
        materialCost: 1,
        operationsCost: 1,
        flexibleCost: 1,
        leadTime: 1,
        feasibility: 'not_feasible',
      },
    ])
    expect(bests.bestUnitPrice).toBe(15)
    expect(bests.bestMaterial).toBe(5)
    expect(bests.bestOps).toBe(6)
    expect(bests.bestFlex).toBe(4)
    expect(bests.bestLead).toBe(25)
  })
})
