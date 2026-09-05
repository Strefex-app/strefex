import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildReliabilityCard,
  coreToolsMaturity,
  freezeLots,
  gaugeCalibrationStatus,
  isCertValid,
  liveStandardStatus,
  lotGenealogy,
  lotReleaseBlocked,
} from '../utils/iatfControlCompute'
import { ppapPackProgress } from '../data/iatfControlCatalog'
import { attachReliability, readPublishedReliability, writePublishedReliability } from '../utils/publishedReliability'
import useIatfControlStore from '../store/iatfControlStore'
import useRfqStore from '../store/rfqStore'
import { useProjectStore } from '../store/projectStore'
import useProcurementStore from '../store/procurementStore'
import useContractStore from '../store/contractStore'
import { awardRfqToProject, bindReceivedAwardToPlant } from '../utils/awardRfqToProject'

const future = '2099-12-31'
const past = '2020-01-01'

describe('IATF certificate validity', () => {
  it('does not treat seed-like rows without number and CB as on file', () => {
    expect(isCertValid({ standard: 'iatf_16949', expiresAt: future })).toBe(false)
    expect(liveStandardStatus([], 'iatf_16949').status).toBe('not_on_file')
  })

  it('marks a complete unexpired certificate valid', () => {
    const cert = {
      standard: 'iatf_16949',
      number: 'IATF-001',
      certifyingBody: 'TÜV',
      expiresAt: future,
    }
    expect(isCertValid(cert)).toBe(true)
    expect(liveStandardStatus([cert], 'iatf_16949').status).toBe('valid')
  })

  it('marks expired certificates', () => {
    const cert = {
      standard: 'iatf_16949',
      number: 'IATF-001',
      certifyingBody: 'TÜV',
      expiresAt: past,
    }
    expect(liveStandardStatus([cert], 'iatf_16949').status).toBe('expired')
  })
})

describe('Core tools maturity from live records', () => {
  it('stays at 0 without quality records', () => {
    const tools = coreToolsMaturity([], [])
    expect(tools.every((t) => t.maturity === 0)).toBe(true)
  })

  it('scores FMEA and PPAP from verified records / part status', () => {
    const tools = coreToolsMaturity(
      [{ toolId: 't10-fmea', status: 'verified' }],
      [{ ppapStatus: 'approved' }],
    )
    expect(tools.find((t) => t.id === 'FMEA').maturity).toBe(80)
    expect(tools.find((t) => t.id === 'PPAP').maturity).toBe(80)
  })
})

describe('Lot genealogy and NCR freeze', () => {
  it('walks parent lots and holds suspect lots', () => {
    const incoming = { id: 'a', lotNumber: 'IN-1', parentLotIds: [] }
    const finished = { id: 'b', lotNumber: 'FG-1', parentLotIds: ['a'], status: 'open', ncrIds: [] }
    const chain = lotGenealogy([incoming, finished], 'b')
    expect(chain.map((l) => l.id)).toEqual(['a', 'b'])

    const frozen = freezeLots([incoming, finished], ['b'], 'ncr-1')
    expect(frozen.find((l) => l.id === 'b').status).toBe('hold')
    expect(frozen.find((l) => l.id === 'b').ncrIds).toContain('ncr-1')
    expect(frozen.find((l) => l.id === 'a').status).toBeUndefined()
  })
})

describe('Reliability card share flags', () => {
  it('omits certificate fields when shareCert is false', () => {
    const card = buildReliabilityCard({
      certificates: [{
        standard: 'iatf_16949',
        number: 'IATF-001',
        certifyingBody: 'TÜV',
        expiresAt: future,
        scope: 'machining',
      }],
      processes: [{ name: 'Turning' }],
      lots: [{ lotNumber: 'L1' }],
      share: { shareCert: false, shareProcesses: true, shareTraceMethod: true },
      companyName: 'Plant Co',
    })
    expect(card.iatfValid).toBe(false)
    expect(card.certifyingBody).toBeNull()
    expect(card.processes).toEqual(['Turning'])
    expect(card.traceMethod).toBe('lot')
  })
})

describe('Published reliability marketplace index', () => {
  beforeEach(() => {
    localStorage.removeItem('strefex-published-reliability')
  })

  it('attaches a published card to a matching supplier name', () => {
    writePublishedReliability({
      companyId: 'co-1',
      companyName: 'Acme Machining',
      iatfValid: true,
      traceMethod: 'lot',
    })
    expect(readPublishedReliability()).toHaveLength(1)
    const row = attachReliability({ legal_name: 'Acme Machining' })
    expect(row.reliabilityCard.iatfValid).toBe(true)
  })
})

describe('IATF control store', () => {
  beforeEach(() => {
    useIatfControlStore.setState({
      folders: [],
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
  })

  it('seeds folders and assigns documents on ensureFolders', () => {
    useIatfControlStore.getState().addDocument({ title: 'WI turning', type: 'work_instruction' })
    expect(useIatfControlStore.getState().documents[0].folderId).toBeTruthy()
    const folders = useIatfControlStore.getState().ensureFolders()
    expect(folders.length).toBeGreaterThan(20)
    expect(useIatfControlStore.getState().documents[0].folderId).toBe('folder-03-wi')
  })

  it('stores certificates in the IATF certificate folder', () => {
    const cert = useIatfControlStore.getState().addCertificate({
      number: 'IATF-001',
      certifyingBody: 'TÜV',
      expiresAt: '2099-12-31',
    })
    expect(cert.folderId).toBe('folder-06-iatf')
    expect(cert.space).toBe('plant-qms')
  })

  it('approves documents and contains lots via NCR', () => {
    const doc = useIatfControlStore.getState().addDocument({ title: 'WI turning' })
    useIatfControlStore.getState().approveDocument(doc.id)
    expect(useIatfControlStore.getState().documents[0].status).toBe('approved')

    const lot = useIatfControlStore.getState().addLot({ lotNumber: 'LOT-1' })
    useIatfControlStore.getState().addNcr({ lotIds: [lot.id], description: 'scratch' })
    expect(useIatfControlStore.getState().lots[0].status).toBe('hold')
    expect(useIatfControlStore.getState().ncrs).toHaveLength(1)
  })

  it('writes a change log when a document is edited', () => {
    const doc = useIatfControlStore.getState().addDocument({ title: 'WI turning' })
    expect(doc.changeLog[0].action).toBe('created')
    useIatfControlStore.getState().updateDocument(doc.id, { title: 'WI turning rev 1' }, { reason: 'typo' })
    const next = useIatfControlStore.getState().documents[0]
    expect(next.changeLog[0].action).toBe('updated')
    expect(next.changeLog[0].reason).toBe('typo')
    expect(next.changeLog[0].changes.some((c) => c.field === 'title')).toBe(true)
  })

  it('moves documents and lots when a department is renamed', () => {
    useIatfControlStore.getState().addDocument({ title: 'WI', department: 'Quality' })
    useIatfControlStore.getState().addLot({ lotNumber: 'L1', department: 'Quality' })
    useIatfControlStore.getState().renameDepartment('Quality', 'QA')
    expect(useIatfControlStore.getState().documents[0].department).toBe('QA')
    expect(useIatfControlStore.getState().lots[0].department).toBe('QA')
  })
})

describe('PPAP pack progress', () => {
  it('treats attached and N/A as complete for Level 3', () => {
    const progress = ppapPackProgress({ design_records: 'attached', aar: 'na' }, '3')
    expect(progress.total).toBe(17)
    expect(progress.done).toBe(1)
  })
})

describe('PPAP pack and change control store', () => {
  beforeEach(() => {
    useIatfControlStore.setState({
      folders: [],
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
  })

  it('creates 18 elements and writes customer approval onto the part', () => {
    const part = useIatfControlStore.getState().addPart({ partNumber: 'P-1' })
    const pkg = useIatfControlStore.getState().addPpapPackage({ partId: part.id, customer: 'OEM' })
    expect(Object.keys(pkg.elements)).toHaveLength(18)
    useIatfControlStore.getState().setPpapElement(pkg.id, 'psw', 'attached')
    expect(useIatfControlStore.getState().ppapPackages[0].elements.psw).toBe('attached')
    useIatfControlStore.getState().approvePpapPackage(pkg.id)
    expect(useIatfControlStore.getState().parts[0].ppapStatus).toBe('approved')
  })

  it('flags work instructions and reopens PPAP when a change is approved', () => {
    const part = useIatfControlStore.getState().addPart({ partNumber: 'P-1' })
    const doc = useIatfControlStore.getState().addDocument({
      title: 'WI turning',
      type: 'work_instruction',
      partId: part.id,
    })
    useIatfControlStore.getState().approveDocument(doc.id)
    const pkg = useIatfControlStore.getState().addPpapPackage({ partId: part.id })
    useIatfControlStore.getState().approvePpapPackage(pkg.id)
    const change = useIatfControlStore.getState().addChange({
      title: 'Insert change',
      partId: part.id,
      impacts: ['workInstruction', 'ppap'],
    })
    useIatfControlStore.getState().approveChange(change.id)
    const next = useIatfControlStore.getState()
    expect(next.documents[0].changeFlag).toBeTruthy()
    expect(next.documents[0].status).toBe('obsolete')
    expect(next.parts[0].ppapStatus).toBe('in_progress')
    expect(next.ppapPackages[0].status).toBe('in_progress')
    expect(next.changes[0].flaggedDocIds).toContain(doc.id)
  })
})

describe('Gauge calibration status', () => {
  it('marks overdue, due within 14 days, and in calibration', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(gaugeCalibrationStatus({ calibrationDue: '2020-01-01' }, now)).toBe('overdue')
    expect(gaugeCalibrationStatus({ calibrationDue: '2026-01-10' }, now)).toBe('due')
    expect(gaugeCalibrationStatus({ calibrationDue: '2026-06-01' }, now)).toBe('ok')
    expect(gaugeCalibrationStatus({ status: 'out_of_service', calibrationDue: '2020-01-01' }, now)).toBe('out_of_service')
  })

  it('blocks lot release when a gauge for the part is overdue', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    const gauges = [{ partId: 'p1', calibrationDue: '2020-01-01' }]
    expect(lotReleaseBlocked({ partId: 'p1', status: 'released' }, gauges, now)).toBe(true)
    expect(lotReleaseBlocked({ partId: 'p1', status: 'open' }, gauges, now)).toBe(false)
    expect(lotReleaseBlocked({ partId: 'p2', status: 'released' }, gauges, now)).toBe(false)
  })
})

describe('RFQ award to project binder', () => {
  beforeEach(() => {
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
    useRfqStore.setState({
      rfqs: [{
        id: 'rfq-1',
        title: 'Housing machining',
        buyerRefDisplay: 'BR-001',
        status: 'active',
        sellerResponses: [
          { sellerId: 's1', sellerName: 'Plant A', price: 1200, status: 'responded' },
          { sellerId: 's2', sellerName: 'Plant B', price: 900, status: 'responded' },
        ],
      }],
      receivedRfqs: [{
        id: 'recv-1',
        rfqId: 'rfq-1',
        sellerId: 's1',
        sellerName: 'Plant A',
        title: 'Housing machining',
        status: 'responded',
      }],
    })
    useProjectStore.setState({ projects: [] })
    useProcurementStore.setState({ opportunities: [], quotations: [], purchaseOrders: [] })
    useContractStore.setState({ contracts: [] })
  })

  it('awards the RFQ and creates a project plus IATF award row', () => {
    const result = awardRfqToProject({ rfqId: 'rfq-1', sellerId: 's1' })
    expect(result.ok).toBe(true)
    expect(useRfqStore.getState().rfqs[0].status).toBe('awarded')
    expect(useRfqStore.getState().rfqs[0].awardedSellerId).toBe('s1')
    expect(useRfqStore.getState().receivedRfqs[0].status).toBe('awarded')
    expect(useProjectStore.getState().projects[0].links.opportunityIds).toContain('rfq-1')
    expect(useIatfControlStore.getState().awards[0].projectId).toBe(result.projectId)
    expect(result.quotationId).toBeTruthy()
    expect(result.poId).toBeTruthy()
    expect(result.binder?.binderDocId).toBeTruthy()
    expect(useIatfControlStore.getState().awards[0].binderDocId).toBe(result.binder.binderDocId)
    expect(useProcurementStore.getState().quotations[0].status).toBe('signed')
    expect(useProcurementStore.getState().purchaseOrders).toHaveLength(1)
  })

  it('binds an already awarded received RFQ without duplicating the project', () => {
    const first = awardRfqToProject({ rfqId: 'rfq-1', sellerId: 's1' })
    const second = bindReceivedAwardToPlant({ receivedRfqId: 'recv-1' })
    expect(second.ok).toBe(true)
    expect(second.already).toBe(true)
    expect(second.projectId).toBe(first.projectId)
    expect(useIatfControlStore.getState().awards).toHaveLength(1)
  })
})
