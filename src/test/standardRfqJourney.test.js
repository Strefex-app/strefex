import { beforeEach, describe, expect, it } from 'vitest'
import useRfqStore from '../store/rfqStore'
import { useProjectStore } from '../store/projectStore'
import useProcurementStore from '../store/procurementStore'
import useIatfControlStore from '../store/iatfControlStore'
import useContractStore from '../store/contractStore'
import { awardRfqToProject } from '../utils/awardRfqToProject'
import {
  assessBidAgainstAsk,
  bidFormToPayload,
  comparisonBests,
  DEFAULT_ASK_REQUIREMENTS,
  seedBidFormFromAsk,
} from '../utils/standardRfqSchema'

describe('standard RFQ journey (canvas smoke)', () => {
  beforeEach(() => {
    useRfqStore.setState({ rfqs: [], receivedRfqs: [] })
    useProjectStore.setState({ projects: [] })
    useProcurementStore.setState({ opportunities: [], quotations: [], purchaseOrders: [] })
    useIatfControlStore.setState({
      processes: [],
      parts: [],
      documents: [],
      lots: [],
      ncrs: [],
      certificates: [],
      ppapPackages: [],
      changes: [],
      gauges: [],
      awards: [],
      share: {},
      publishedCard: null,
    })
    useContractStore.setState({ contracts: [] })
  })

  it('runs send → bid → compare → award on one standard package', () => {
    const requirements = {
      ...DEFAULT_ASK_REQUIREMENTS,
      itemName: 'Bracket A',
      quantity: 1000,
      maxLeadTime: 45,
      qualityLevel: 'iatf_16949',
      ppapLevel: '3',
      monthlyCapacityAsk: 500,
      moqAsk: 200,
      incoterms: 'FOB',
      traceabilityRequired: true,
    }

    const created = useRfqStore.getState().addRfq({
      title: 'Bracket RFQ',
      rfqType: 'product',
      industryId: 'automotive',
      categoryId: 'injection-molding',
      suppliers: ['plant-a', 'plant-b'],
      requirements,
      buyerEmail: 'buyer@test.com',
      buyerCompany: 'Test Buyer',
    })

    useRfqStore.getState().sendRfq(created.id)
    const sent = useRfqStore.getState().getRfqById(created.id)
    expect(sent.status).toBe('sent')
    expect(useRfqStore.getState().receivedRfqs).toHaveLength(2)

    const received = useRfqStore.getState().receivedRfqs.find((r) => r.sellerId === 'plant-a')
    const bid = bidFormToPayload({
      ...seedBidFormFromAsk(requirements),
      unitPrice: '12.50',
      leadTimeDays: '40',
      capacityStatus: 'available',
      monthlyCapacity: '600',
      moq: '150',
      certConfirm: true,
      ppapCommit: '3',
      incotermsOffer: 'FOB',
      costs: { material: '4', operations: '6', flexible: '2.5' },
    })

    useRfqStore.getState().respondToRfq(received.id, bid)
    const withQuote = useRfqStore.getState().getRfqById(created.id)
    expect(withQuote.sellerResponses).toHaveLength(1)
    expect(withQuote.sellerResponses[0].unitPrice).toBe(12.5)
    expect(withQuote.sellerResponses[0].materialCost).toBe(4)

    expect(assessBidAgainstAsk(withQuote.sellerResponses[0], requirements)).toHaveLength(0)

    const bests = comparisonBests(withQuote.sellerResponses)
    expect(bests.bestUnitPrice).toBe(12.5)
    expect(bests.bestMaterial).toBe(4)

    const award = awardRfqToProject({ rfqId: created.id, sellerId: 'plant-a' })
    expect(award.ok).toBe(true)
    expect(useRfqStore.getState().getRfqById(created.id).status).toBe('awarded')
    expect(useProjectStore.getState().projects[0].tags).toContain('rfq-award')
    expect(useIatfControlStore.getState().awards[0].projectId).toBe(award.projectId)
  })

  it('surfaces ask alignment gaps on weak plant bids', () => {
    const requirements = {
      ...DEFAULT_ASK_REQUIREMENTS,
      maxLeadTime: 30,
      qualityLevel: 'iatf_16949',
      ppapLevel: '3',
    }
    const weak = bidFormToPayload({
      ...seedBidFormFromAsk(requirements),
      unitPrice: '9',
      leadTimeDays: '45',
      qualityLevel: 'iso_9001',
      ppapCommit: '1',
      certConfirm: false,
      feasibility: 'not_feasible',
    })
    const gaps = assessBidAgainstAsk(weak, requirements)
    expect(gaps.some((g) => g.id === 'quality')).toBe(true)
    expect(gaps.some((g) => g.id === 'lead')).toBe(true)
    expect(gaps.some((g) => g.id === 'ppap')).toBe(true)
    expect(gaps.some((g) => g.id === 'feasibility')).toBe(true)
  })
})
