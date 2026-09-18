import { describe, it, expect } from 'vitest'
import {
  buildRegisterRows,
  buildSelfAssessmentPipeline,
  buildStrefexCertificates,
  closingReportModel,
  filterPipeline,
  questionnaireWindows,
} from '../utils/auditSupplierRegister'

const supplier = {
  id: 's1',
  name: 'Nantong Precision Forming',
  country: 'China',
  city: 'Nantong',
  industry: 'Automotive',
  notes: 'Stamping & welded assemblies',
  contact: 'Li Wei',
  registeredAt: '2021-03-12',
}
const auditor = { id: 'a1', name: 'M. Haas', email: 'haas@a.test' }

describe('audit supplier register', () => {
  it('builds register rows with approval, score and self-assessment windows', () => {
    const rows = buildRegisterRows({
      todayIso: '2026-09-17',
      suppliers: [supplier],
      audits: [{
        id: 'aud1',
        supplierId: 's1',
        status: 'Completed',
        completedDate: '2026-04-18',
        nextAuditDate: '2027-04-18',
        standard: 'IATF 16949:2016',
        responses: { '0-0': { verdict: '3' }, '0-1': { verdict: '3' } },
        findings: [],
      }],
    })
    expect(rows[0].code).toMatch(/^SUP-/)
    expect(rows[0].status.label).toBe('APPROVED')
    expect(rows[0].approvalUntil).toBe('2027-04-18')
    expect(rows[0].score).toBeGreaterThan(0)
  })

  it('flags overdue self-assessments 10 days before the visit', () => {
    const audit = {
      id: 'aud2',
      supplierId: 's1',
      status: 'Planned',
      plannedDate: '2026-09-20',
      title: 'Initial',
      poolKind: 'joined',
      responses: {},
    }
    const windows = questionnaireWindows(audit)
    expect(windows.dueBack).toBe('2026-09-10')
    expect(windows.issueBy).toBe('2026-08-21')
    const pipeline = buildSelfAssessmentPipeline({
      todayIso: '2026-09-17',
      suppliers: [supplier],
      audits: [audit],
    })
    expect(pipeline[0].overdue).toBe(true)
    expect(filterPipeline(pipeline, 'overdue')).toHaveLength(1)
    expect(filterPipeline(pipeline, 'new')).toHaveLength(1)
  })

  it('issues a STREFEX certificate after a passed audit and names signatories on the closing report', () => {
    const audit = {
      id: 'aud3',
      supplierId: 's1',
      status: 'Completed',
      completedDate: '2026-04-18',
      nextAuditDate: '2027-04-18',
      auditorId: 'a1',
      standard: 'IATF 16949:2016',
      scope: 'Stamped & welded assemblies, Nantong plant',
      findings: [],
      responses: { '0-0': { verdict: '3' } },
    }
    const certs = buildStrefexCertificates({
      todayIso: '2026-09-17',
      suppliers: [supplier],
      audits: [audit],
    })
    expect(certs[0].certNo).toMatch(/^SX-CERT-/)
    expect(certs[0].state).toBe('valid')
    const closing = closingReportModel({ audit, supplier, auditor })
    expect(closing.signatories.map((s) => s.role)).toEqual([
      'Lead auditor',
      'Supplier representative',
      'Head of Supplier Quality',
    ])
    expect(closing.signatories[1].name).toBe('Li Wei')
  })
})
