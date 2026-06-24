import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrograms = []
const mockProjects = []
const mockOpportunities = []
const mockQuotations = []
const mockContracts = []

vi.mock('../store/programStore', () => ({
  useProgramStore: {
    getState: () => ({
      programs: mockPrograms,
      addProgram: vi.fn((data) => {
        const id = `pgm-${mockPrograms.length + 1}`
        mockPrograms.push({ id, programNumber: 'PGM-2026-001', nextProjectSeq: 1, ...data })
        return id
      }),
      allocateNextProjectNumber: vi.fn(() => 'PGM-2026-001-P01'),
    }),
  },
}))

vi.mock('../store/projectStore', () => ({
  useProjectStore: {
    getState: () => ({
      addProject: vi.fn((data) => {
        const id = `proj-${mockProjects.length + 1}`
        mockProjects.push({ id, projectNumber: 'PGM-2026-001-P01', name: data.name, links: {}, ...data })
        return id
      }),
      getProjectById: (id) => mockProjects.find((p) => p.id === id),
      updateProject: vi.fn((id, updates) => {
        const p = mockProjects.find((x) => x.id === id)
        if (p) Object.assign(p, updates)
      }),
      appendProjectLink: vi.fn(),
    }),
  },
}))

vi.mock('../store/procurementStore', () => ({
  default: {
    getState: () => ({
      opportunities: mockOpportunities,
      quotations: mockQuotations,
      createOpportunity: vi.fn((data) => {
        const id = `opp-${mockOpportunities.length + 1}`
        mockOpportunities.push({
          id,
          opportunityNumber: 'OPP-2026-001',
          rfqNumber: 'RFQ-2026-001',
          projectId: data.projectId,
          ...data,
        })
        return id
      }),
      getOpportunityById: (id) => mockOpportunities.find((o) => o.id === id),
      getQuotationById: (id) => mockQuotations.find((q) => q.id === id),
      updateQuotation: vi.fn(),
    }),
  },
}))

vi.mock('../store/contractStore', () => ({
  default: {
    getState: () => ({
      addContract: vi.fn((data) => {
        const id = `CTR-2026-001`
        mockContracts.push({ id, ...data })
        return id
      }),
    }),
  },
}))

vi.mock('../store/vendorStore', () => ({
  default: { getState: () => ({ addDocument: vi.fn() }) },
}))

import { createProjectWithRfq, createRfqWithProject } from './pmWorkflowChain'

describe('pmWorkflowChain', () => {
  beforeEach(() => {
    mockPrograms.length = 0
    mockProjects.length = 0
    mockOpportunities.length = 0
    mockPrograms.push({ id: 'pgm-1', programNumber: 'PGM-2026-001', nextProjectSeq: 1 })
  })

  it('creates project and linked RFQ together', () => {
    const result = createProjectWithRfq({ name: 'Line 4', programId: 'pgm-1' }, { title: 'RFQ — Line 4' })
    expect(result.projectNumber).toBe('PGM-2026-001-P01')
    expect(result.rfqNumber).toBe('RFQ-2026-001')
    expect(result.opportunityNumber).toBe('OPP-2026-001')
    expect(mockOpportunities).toHaveLength(1)
  })

  it('creates project when RFQ has no projectId', () => {
    const result = createRfqWithProject({ title: 'CNC spindle', projectName: 'CNC line' })
    expect(result.createdProject).toBe(true)
    expect(result.projectNumber).toBeTruthy()
    expect(result.rfqNumber).toBe('RFQ-2026-001')
  })
})
