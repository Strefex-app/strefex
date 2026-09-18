import { describe, it, expect } from 'vitest'
import {
  auditKindLabel,
  buildCapaRows,
  buildFindingsReports,
  buildScheduleEvents,
  filterCapaRows,
  nextCommitments,
  yearComparison,
} from '../utils/auditProgrammeViews'

const supplier = { id: 's1', name: 'Hanoi Electronics Assembly', country: 'Vietnam', city: 'Hanoi' }
const auditor = { id: 'a1', name: 'M. Haas', email: 'haas@a.test' }

describe('audit programme views', () => {
  it('builds calendar events for planned visits, questionnaires and CAPA', () => {
    const events = buildScheduleEvents({
      todayIso: '2026-09-17',
      suppliers: [supplier],
      auditors: [auditor],
      audits: [{
        id: 'aud1',
        supplierId: 's1',
        title: 'Initial – Hanoi',
        poolKind: 'joined',
        auditorId: 'a1',
        status: 'Planned',
        plannedDate: '2026-09-19',
        responses: {},
      }],
      reminders: [{
        id: 'r1',
        auditId: 'aud1',
        status: 'Open',
        dueDate: '2026-09-20',
        type: 'finding_due',
        title: 'CAPA Due: bath control',
      }],
    })
    expect(events.some((e) => e.type === 'planned')).toBe(true)
    expect(events.find((e) => e.type === 'planned').auditorId).toBe('a1')
    expect(events.find((e) => e.type === 'planned').detail).toContain('M. Haas')
    expect(events.some((e) => e.type === 'questionnaire')).toBe(true)
    expect(events.some((e) => e.type === 'capa')).toBe(true)
    expect(nextCommitments(events, '2026-09-17', 8).length).toBeGreaterThan(0)
  })

  it('links findings reports and CAPA rows to the seller', () => {
    const audit = {
      id: 'aud2',
      supplierId: 's1',
      status: 'Completed',
      completedDate: '2026-06-09',
      plannedDate: '2026-06-09',
      title: 'Surveillance',
      auditorId: 'a1',
      findings: [
        { id: 'f1', type: 'Major NC', status: 'Open', dueDate: '2026-05-01', description: 'Bath chemistry', reference: 'IATF 8.5.1', action: 'Lock parameter access' },
      ],
      responses: { '0-0': { verdict: 'Conforms' } },
    }
    const reports = buildFindingsReports({ audits: [audit], suppliers: [supplier], auditors: [auditor] })
    expect(reports[0].supplierName).toBe(supplier.name)
    expect(auditKindLabel(audit)).toBe('Surveillance')
    const capa = buildCapaRows({ audits: [audit], suppliers: [supplier], auditors: [auditor], todayIso: '2026-09-17' })
    expect(capa[0].overdue).toBe(true)
    expect(capa[0].supplierId).toBe('s1')
    expect(filterCapaRows(capa, 'major')).toHaveLength(1)
  })

  it('compares seller scores by year', () => {
    const a2025 = {
      id: 'y1',
      supplierId: 's1',
      status: 'Completed',
      completedDate: '2025-10-14',
      standard: 'ISO 9001:2015',
      auditType: 'Manufacturing / Quality',
      responses: { '0-0': { verdict: 'Conforms' }, '0-1': { verdict: 'Minor NC' } },
    }
    const a2026 = {
      id: 'y2',
      supplierId: 's1',
      status: 'Completed',
      completedDate: '2026-03-17',
      standard: 'ISO 9001:2015',
      auditType: 'Manufacturing / Quality',
      responses: { '0-0': { verdict: 'Major NC' }, '0-1': { verdict: 'Minor NC' } },
    }
    const cmp = yearComparison('s1', [a2025, a2026])
    expect(cmp.years).toEqual(['2025', '2026'])
    expect(cmp.rows.length).toBeGreaterThan(0)
  })
})
