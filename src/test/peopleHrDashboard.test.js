import { describe, expect, it } from 'vitest'
import { buildPeopleHrDashboard } from '../utils/peopleHrDashboard'

const SAMPLE = [
  {
    id: 'a',
    name: 'A',
    department: 'Engineering',
    status: 'active',
    hireDate: '2025-03-01',
    birthDate: '1990-01-01',
    gender: 'M',
    race: 'White',
    city: 'Munich',
    country: 'Germany',
  },
  {
    id: 'b',
    name: 'B',
    department: 'Sales',
    status: 'active',
    hireDate: '2026-02-01',
    birthDate: '1985-06-15',
    gender: 'F',
    race: 'Asian',
    city: 'Berlin',
    country: 'Germany',
  },
  {
    id: 'c',
    name: 'C',
    department: 'Sales',
    status: 'left',
    hireDate: '2020-01-01',
    leftDate: '2025-06-01',
    birthDate: '1978-03-01',
    gender: 'M',
    race: 'White',
    city: 'Vienna',
    country: 'Austria',
  },
]

describe('buildPeopleHrDashboard', () => {
  it('builds KPI and chart series for year vs prior', () => {
    const data = buildPeopleHrDashboard(SAMPLE, [{ name: 'Engineering' }, { name: 'Sales' }], {
      year: 2026,
    })
    expect(data.year).toBe(2026)
    expect(data.priorYear).toBe(2025)
    expect(data.totals.total).toBe(3)
    expect(data.totals.active).toBe(2)
    expect(data.totals.left).toBe(1)
    expect(data.kpis).toHaveLength(6)
    expect(data.hiringByMonth).toHaveLength(12)
    expect(data.byDepartment[0].label).toMatch(/Engineering|Sales/)
    expect(data.byAge).toHaveLength(8)
    expect(data.diversity.length).toBeGreaterThan(0)
    expect(data.genderKeys).toEqual(['M', 'F', 'N.C'])
  })
})
