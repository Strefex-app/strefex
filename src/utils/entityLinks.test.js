import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockProjects = [{ id: 'proj-1', projectNumber: 'PRJ-2026-001', currency: 'USD' }]
const mockOpportunities = [{ id: 'opp-1', rfqNumber: 'RFQ-2026-001', title: 'CNC', projectId: null }]

vi.mock('../store/projectStore', () => ({
  useProjectStore: {
    getState: () => ({
      getProjectById: (id) => mockProjects.find((p) => p.id === id),
      appendProjectLink: vi.fn(),
    }),
  },
}))

const updateOpportunity = vi.fn()

vi.mock('../store/procurementStore', () => ({
  default: {
    getState: () => ({
      opportunities: mockOpportunities,
      getOpportunityById: (id) => mockOpportunities.find((o) => o.id === id),
      updateOpportunity,
    }),
  },
}))

vi.mock('../store/contractStore', () => ({
  default: {
    getState: () => ({
      updateContract: vi.fn(),
    }),
  },
}))

import { linkRfqToProject, listUnlinkedRfqs } from './entityLinks'

describe('entityLinks', () => {
  beforeEach(() => {
    mockOpportunities[0].projectId = null
    updateOpportunity.mockClear()
  })

  it('lists unlinked RFQs', () => {
    expect(listUnlinkedRfqs(mockOpportunities)).toHaveLength(1)
    mockOpportunities[0].projectId = 'proj-1'
    expect(listUnlinkedRfqs(mockOpportunities)).toHaveLength(0)
  })

  it('links RFQ to project via store update', () => {
    expect(linkRfqToProject('opp-1', 'proj-1')).toBe(true)
    expect(updateOpportunity).toHaveBeenCalledWith('opp-1', expect.objectContaining({ projectId: 'proj-1' }))
  })
})
