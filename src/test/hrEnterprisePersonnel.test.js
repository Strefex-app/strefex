import { describe, expect, it } from 'vitest'
import {
  buildPersonnelCostsFromEmployees,
  isHrSpaceSnapshotEmpty,
} from '../utils/hrEnterprisePersonnel'

describe('buildPersonnelCostsFromEmployees', () => {
  it('rolls active HR headcount into enterprise departments and keeps salary rates', () => {
    const existing = [
      { id: 'pc-001', department: 'Production', headcount: 45, avgSalary: 4200, benefits: 1050, training: 200, description: 'Production workers' },
      { id: 'pc-006', department: 'Management', headcount: 6, avgSalary: 12000, benefits: 3000, training: 800, description: 'Senior management' },
    ]
    const next = buildPersonnelCostsFromEmployees(
      [
        { id: 'e1', department: 'Production', status: 'active' },
        { id: 'e2', department: 'Production', status: 'active' },
        { id: 'e3', department: 'Quality', status: 'active' },
        { id: 'e4', department: 'Production', status: 'left' },
      ],
      existing,
    )

    const production = next.find((r) => r.department === 'Production')
    const quality = next.find((r) => r.department === 'Quality')
    const management = next.find((r) => r.department === 'Management')

    expect(production.headcount).toBe(2)
    expect(production.avgSalary).toBe(4200)
    expect(production.id).toBe('pc-001')
    expect(quality.headcount).toBe(1)
    expect(quality.source).toBe('hr_space')
    expect(management.headcount).toBe(6)
  })

  it('does not wipe enterprise rows when HR has no active employees', () => {
    const existing = [{ id: 'pc-001', department: 'Production', headcount: 45, avgSalary: 4200, benefits: 0, training: 0 }]
    const next = buildPersonnelCostsFromEmployees([{ id: 'e1', department: 'Production', status: 'left' }], existing)
    expect(next).toEqual(existing)
  })
})

describe('isHrSpaceSnapshotEmpty', () => {
  it('keeps hiring and documents as company data even without employees', () => {
    expect(isHrSpaceSnapshotEmpty({})).toBe(true)
    expect(isHrSpaceSnapshotEmpty({ employees: [], candidates: [{ id: 'c1' }] })).toBe(false)
    expect(isHrSpaceSnapshotEmpty({ hrDocuments: [{ id: 'd1' }] })).toBe(false)
  })
})
