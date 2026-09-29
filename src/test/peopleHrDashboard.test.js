import { describe, expect, it } from 'vitest'
import { buildHrHubIndicators, buildPeopleManagementMetrics } from '../utils/peopleHrDashboard'

const SAMPLE = [
  {
    id: 'a',
    name: 'A',
    department: 'Engineering',
    status: 'active',
    role: 'Process Engineer',
  },
  {
    id: 'b',
    name: 'B',
    department: 'Sales',
    status: 'active',
    role: 'Sales Engineer',
  },
  {
    id: 'c',
    name: 'C',
    department: 'Sales',
    status: 'left',
    leftDate: '2025-06-01',
    role: 'Accountant',
  },
]

describe('buildPeopleManagementMetrics', () => {
  it('connects employees, departments, positions, and team seats', () => {
    const data = buildPeopleManagementMetrics({
      employees: SAMPLE,
      departments: [{ name: 'Engineering' }, { name: 'Sales' }, { name: 'Quality' }],
      openPositions: [
        { id: 'p1', title: 'QE', department: 'Quality', status: 'open' },
        { id: 'p2', title: 'CNC', department: 'Production', status: 'filled' },
      ],
      candidates: [
        { id: 'c1', status: 'screening' },
        { id: 'c2', status: 'applied' },
      ],
      talentPool: [{ id: 't1' }],
      teamMembers: 4,
      forumPosts: 2,
    })

    expect(data.kpis.employees).toBe(3)
    expect(data.kpis.active).toBe(2)
    expect(data.kpis.departments).toBeGreaterThanOrEqual(3)
    expect(data.kpis.openRoles).toBe(1)
    expect(data.kpis.positions).toBe(2)
    expect(data.kpis.candidates).toBe(2)
    expect(data.kpis.teamMembers).toBe(4)
    expect(data.kpis.talentPool).toBe(1)
    expect(data.kpis.jobTitles).toBe(2)

    expect(data.departmentBars.find((r) => r.label === 'Sales')?.value).toBe(1)
    expect(data.departmentBars.find((r) => r.label === 'Engineering')?.value).toBe(1)
    expect(data.positionBars.find((r) => r.label === 'Open')?.value).toBe(1)
    expect(data.positionBars.find((r) => r.label === 'Filled')?.value).toBe(1)
    expect(data.rolesByDept.find((r) => r.label === 'Quality')?.value).toBe(1)
    expect(data.roleBars.find((r) => r.label === 'Process Engineer')?.value).toBe(1)
    expect(data.roleBars.find((r) => r.label === 'Sales Engineer')?.value).toBe(1)
    expect(data.teamBars.find((r) => r.label === 'Active')?.value).toBe(2)
    expect(data.teamBars.find((r) => r.label === 'Left')?.value).toBe(1)
    expect(data.pipelineBars.find((r) => r.label === 'Screening')?.value).toBe(1)
  })

  it('builds HR hub KPIs from live company records', () => {
    const indicators = buildHrHubIndicators({
      employees: SAMPLE,
      ratings: { 'a-0': 4, 'b-0': 5 },
      goals: [
        { id: 'g1', status: 'In Progress' },
        { id: 'g2', status: 'Completed' },
        { id: 'g3', status: 'Not Started' },
      ],
      dialogues: [
        { id: 'r1', status: 'In Progress' },
        { id: 'r2', status: 'Completed' },
      ],
    })
    expect(indicators.find((r) => r.id === 'employees')?.value).toBe('2')
    expect(indicators.find((r) => r.id === 'qualification')?.value).toBe('4.5 / 5.0')
    expect(indicators.find((r) => r.id === 'goals')?.value).toBe('2')
    expect(indicators.find((r) => r.id === 'reviews')?.value).toBe('1')
  })
})
