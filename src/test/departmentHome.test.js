import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildDepartmentHome,
  departmentSlug,
  findDepartmentBySlug,
  inferLotDepartment,
  listCompanyDepartments,
  matchTeamToEmployees,
} from '../utils/departmentHome'
import { searchCompanyRecords } from '../utils/companySearch'
import { attachPlantFile } from '../utils/iatfFileAttach'
import { collectDepartmentLogs } from '../utils/recordChangeLog'
import useIatfControlStore from '../store/iatfControlStore'

describe('department homes', () => {
  it('slugs names and finds them back', () => {
    expect(departmentSlug('Quality')).toBe('quality')
    expect(departmentSlug('HR Space')).toBe('hr-space')
    expect(findDepartmentBySlug(['Quality', 'Production'], 'quality')).toBe('Quality')
  })

  it('unions HR, IATF, and catalog department names', () => {
    const names = listCompanyDepartments({
      hrDepartments: ['Maintenance'],
      employees: [{ department: 'Assembly' }],
      documents: [{ department: 'Quality' }],
      lots: [{ department: 'Logistics' }],
    })
    expect(names).toContain('Maintenance')
    expect(names).toContain('Assembly')
    expect(names).toContain('Quality')
    expect(names).toContain('Logistics')
    expect(names).toContain('Purchasing')
  })

  it('builds a home from people, docs, lots, and NCRs', () => {
    const docs = [{ id: 'd1', department: 'Quality', partId: 'p1', title: 'WI' }]
    const lots = [
      { id: 'l1', lotNumber: 'LOT-1', department: 'Quality' },
      { id: 'l2', lotNumber: 'LOT-2', partId: 'p1' },
    ]
    const home = buildDepartmentHome('Quality', {
      employees: [{ id: 'e1', department: 'Quality', name: 'Ada' }],
      documents: docs,
      lots,
      ncrs: [{ id: 'n1', lotIds: ['l1'], description: 'scratch' }],
    })
    expect(home.slug).toBe('quality')
    expect(home.id).toBeTruthy()
    expect(String(home.id)).toContain('quality')
    expect(home.path).toContain(home.id)
    expect(home.people).toHaveLength(1)
    expect(home.documents).toHaveLength(1)
    expect(home.lots.map((l) => l.id)).toEqual(['l1', 'l2'])
    expect(home.ncrs).toHaveLength(1)
    expect(home.hrefCompanyDatabase).toContain('folder-04-quality')
  })

  it('infers lot department from the part document when unset', () => {
    expect(inferLotDepartment(
      { partId: 'p1' },
      [{ partId: 'p1', department: 'Engineering' }],
    )).toBe('Engineering')
  })
})

describe('team ↔ HR match', () => {
  it('splits logins and employees by email', () => {
    const match = matchTeamToEmployees(
      [{ email: 'a@plant.test' }, { email: 'b@plant.test' }],
      [{ email: 'a@plant.test', name: 'Ada' }, { email: 'c@plant.test', name: 'Cam' }],
    )
    expect(match.linked).toHaveLength(1)
    expect(match.teamWithoutEmployee.map((r) => r.email)).toEqual(['b@plant.test'])
    expect(match.employeesWithoutLogin.map((r) => r.email)).toEqual(['c@plant.test'])
  })

  it('links a team login to an HR employee by explicit id when emails differ', () => {
    const match = matchTeamToEmployees(
      [{ id: 'tm-1', email: 'login@plant.test', employeeId: 'e9' }],
      [{ id: 'e9', email: 'hr@plant.test', name: 'Pat' }],
    )
    expect(match.linked).toHaveLength(1)
    expect(match.pairs[0].via).toBe('id')
    expect(match.employeesWithoutLogin).toHaveLength(0)
  })
})

describe('company record search', () => {
  it('returns live hits with paths', () => {
    const docHits = searchCompanyRecords('WI turn', {
      documents: [{ title: 'WI turning', docNumber: 'WI-01', department: 'Quality', folderId: 'folder-03-wi' }],
    })
    expect(docHits.some((h) => h.kind === 'QMS document' && h.path.includes('company-database'))).toBe(true)

    const empHits = searchCompanyRecords('Ada', {
      employees: [{ id: 'e1', name: 'Ada Turner', department: 'Quality' }],
    })
    expect(empHits.some((h) => h.kind === 'Employee' && h.path.includes('/employees/e1'))).toBe(true)

    const flowHits = searchCompanyRecords('onboarding', {})
    expect(flowHits.some((h) => h.kind === 'Workflow')).toBe(true)
  })

  it('ignores short queries', () => {
    expect(searchCompanyRecords('Q', { departments: ['Quality'] })).toEqual([])
  })
})

describe('lot department persist', () => {
  beforeEach(() => {
    useIatfControlStore.setState({ lots: [], ncrs: [] })
  })

  it('stores department on lots and copies it onto NCRs', () => {
    const lot = useIatfControlStore.getState().addLot({ lotNumber: 'LOT-Q', department: 'Quality' })
    expect(lot.department).toBe('Quality')
    const ncr = useIatfControlStore.getState().addNcr({
      lotIds: [lot.id],
      description: 'scratch',
      department: lot.department,
    })
    expect(ncr.department).toBe('Quality')
  })
})

describe('change log and file attach', () => {
  it('collects department logs from records and HR entries', () => {
    const logs = collectDepartmentLogs('Quality', {
      documents: [{
        id: 'd1',
        department: 'Quality',
        docNumber: 'WI-1',
        changeLog: [{ id: 'c1', at: '2026-08-25T00:00:00.000Z', action: 'updated', summary: 'title' }],
      }],
      departmentLogs: [{
        id: 'h1',
        at: '2026-08-25T01:00:00.000Z',
        action: 'renamed',
        summary: 'Quality → QA',
        department: 'QA',
      }],
    })
    expect(logs[0].id).toBe('h1')
    expect(logs.some((row) => row.entityLabel === 'WI-1')).toBe(true)
  })

  it('records a local filename when cloud storage is not connected', async () => {
    const meta = await attachPlantFile({
      entityType: 'iatf-certificate',
      entityId: 'crt-1',
      file: { name: 'iatf.pdf', size: 12, type: 'application/pdf' },
    })
    expect(meta.fileName).toBe('iatf.pdf')
    expect(meta.cloud).toBe(false)
    expect(meta.storagePath).toBe('')
  })
})
