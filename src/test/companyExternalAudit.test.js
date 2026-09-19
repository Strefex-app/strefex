import { describe, it, expect } from 'vitest'
import {
  applyCompanyAuditCloudToSuppliers,
  auditStatusLabel,
  buildAuditScheduleMessages,
  companyTrustBadges,
  notesHavePreAssessmentIssued,
  notesHavePreAssessmentReturn,
  PRE_ASSESSMENT_ISSUED_MARK,
  PRE_ASSESSMENT_RETURN_MARK,
  plannedDateWithinDeadline,
  sellerNeedsAuditDate,
  toAuditDateInput,
  validateAuditSchedule,
} from '../utils/companyExternalAudit'

describe('companyExternalAudit', () => {
  it('requires a date and auditor when status is planned', () => {
    expect(sellerNeedsAuditDate('planned')).toBe(true)
    expect(validateAuditSchedule({ status: 'planned', plannedAt: '', auditorEmail: 'a@x.com' }))
      .toMatch(/date/i)
    expect(validateAuditSchedule({ status: 'planned', plannedAt: '2026-10-02', auditorEmail: '' }))
      .toMatch(/auditor/i)
    expect(validateAuditSchedule({
      status: 'planned',
      plannedAt: '2026-10-02',
      auditorEmail: 'auditor@strefex.com',
    })).toBe('')
  })

  it('blocks a visit date after the STREFEX deadline', () => {
    expect(plannedDateWithinDeadline('2026-09-18', '2026-09-30')).toBe(true)
    expect(plannedDateWithinDeadline('2026-10-01', '2026-09-30')).toBe(false)
    expect(validateAuditSchedule({
      status: 'planned',
      plannedAt: '2026-10-01',
      deadlineAt: '2026-09-30',
      auditorEmail: 'auditor@strefex.com',
    })).toMatch(/deadline/i)
  })

  it('keeps seller copy anonymous and split badges', () => {
    const copy = buildAuditScheduleMessages({
      companyName: 'Nordic Steel',
      status: 'planned',
      plannedAt: '2026-09-18',
      deadlineAt: '2026-09-30',
      auditorName: 'Jane Auditor',
      auditorEmail: 'jane@audit.pro',
    })
    expect(copy.sellerMessage).toContain('STREFEX')
    expect(copy.sellerMessage.toLowerCase()).not.toContain('jane')
    expect(copy.sellerMessage.toLowerCase()).not.toContain('jane@audit.pro')
    expect(copy.auditorMessage).toContain('Nordic Steel')
    expect(copy.auditorMessage).toContain('Deadline')
    expect(companyTrustBadges({})).toEqual([])
    expect(companyTrustBadges({ strefex_verified: true }).map((b) => b.id)).toContain('verified')
    expect(companyTrustBadges({ onsite_audit_completed: true }).map((b) => b.label)).toContain('On-site audited')
    expect(auditStatusLabel('confirmed')).toBe('Confirmed')
    expect(toAuditDateInput('2026-10-02T12:00:00.000Z')).toBe('2026-10-02')
  })

  it('marks pre-assessment issued and returned in company notes', () => {
    expect(notesHavePreAssessmentIssued(`${PRE_ASSESSMENT_ISSUED_MARK} x`)).toBe(true)
    expect(notesHavePreAssessmentReturn(`${PRE_ASSESSMENT_RETURN_MARK} x`)).toBe(true)
  })

  it('links company audit rows onto seller directory records', () => {
    const next = applyCompanyAuditCloudToSuppliers(
      [{ id: 's1', email: 'plant@seller.test', name: 'Plant' }],
      [{
        id: '11111111-1111-4111-8111-111111111111',
        email: 'plant@seller.test',
        external_audit_status: 'planned',
        external_audit_planned_at: '2026-10-02',
        external_audit_assigned_auditor_email: 'lead@audit.test',
        external_audit_assigned_auditor_name: 'Lead',
      }],
    )
    expect(next[0].platformCompanyId).toBe('11111111-1111-4111-8111-111111111111')
    expect(next[0].externalAuditStatus).toBe('planned')
    expect(next[0].externalAuditAssignedAuditorEmail).toBe('lead@audit.test')
  })
})
