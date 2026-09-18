import { describe, expect, it } from 'vitest'
import {
  auditorDatabaseKpis,
  auditorModules,
  auditorPanelStatus,
  auditorSpread,
  buildAuditorDatabaseRows,
  formatSpread,
} from '../utils/auditorDatabase'

describe('auditorDatabase', () => {
  it('classifies panel status from role and notes', () => {
    expect(auditorPanelStatus({ role: 'Technical Expert' })).toBe('EXPERT')
    expect(auditorPanelStatus({ notes: 'provisional on IATF' })).toBe('PROVISIONAL')
    expect(auditorPanelStatus({ role: 'Lead Auditor' })).toBe('QUALIFIED')
  })

  it('splits certificate titles into qualified and provisional modules', () => {
    const modules = auditorModules({
      certifications: ['IATF 16949:2016', 'ISO 9001 Lead Auditor — Provisional'],
      registeredAt: '2026-05-01',
    })
    expect(modules.some((m) => m.label.includes('IATF') && m.status === 'Qualified')).toBe(true)
    expect(modules.some((m) => /provisional/i.test(m.label) || m.status === 'Provisional')).toBe(true)
  })

  it('builds database rows with booked days and scoring spread', () => {
    const auditor = {
      id: 'a1',
      name: 'Ada West',
      role: 'Lead Auditor',
      email: 'ada@strefex.com',
      auditorCode: 'SX-AUD-2026-001',
      city: 'Stuttgart',
      country: 'DE',
      languages: ['DE', 'EN'],
      certifications: ['ISO 9001:2015'],
      registeredAt: '2018-03-01',
      cpdHours: 32,
    }
    const audits = [
      { id: '1', auditorId: 'a1', plannedDate: '2026-02-01', auditDays: 2, status: 'Completed', findings: [{ type: 'Conform' }, { type: 'Minor NC' }] },
      { id: '2', auditorId: 'a1', plannedDate: '2026-06-01', auditDays: 3, status: 'Completed', findings: [{ type: 'Observation' }] },
      { id: '3', auditorId: 'a1', plannedDate: '2025-06-01', auditDays: 10, status: 'Completed', findings: [{ type: 'Major NC' }] },
    ]
    const rows = buildAuditorDatabaseRows({ auditors: [auditor], audits, year: '2026' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: 'Ada West',
      base: 'Stuttgart, DE',
      status: 'QUALIFIED',
      bookedDays: 5,
    })
    expect(rows[0].languagesLine).toContain('DE, EN')
    expect(formatSpread(rows[0].spread)).toMatch(/^±/)
    expect(auditorSpread(auditor, audits, '2026')).toBeGreaterThanOrEqual(0)

    const kpis = auditorDatabaseKpis(rows, audits, '2026')
    expect(kpis.panel).toBe(1)
    expect(kpis.booked).toBe(5)
    expect(kpis.yearAudits).toBe(2)
  })
})
