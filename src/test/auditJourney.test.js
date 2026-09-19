import { describe, expect, it } from 'vitest'
import {
  auditDaysForStandard,
  defaultSellerStandard,
  journeyStage,
  openAuditForSeller,
  sellerBoardStatus,
  sellersWaitingToPlan,
} from '../utils/auditJourney'

describe('auditJourney', () => {
  it('classifies New, Need action, scheduled and audited', () => {
    expect(sellerBoardStatus(null, { id: 's1' }).id).toBe('new')
    expect(sellerBoardStatus({ id: 'a1', supplierId: 's1', auditorId: 'x', status: 'Assigned' }, { id: 's1' }).id).toBe('action')
    expect(sellerBoardStatus({ id: 'a1', supplierId: 's1', auditorId: 'x', status: 'Planned', plannedDate: '2026-10-02' }, { id: 's1' }).id).toBe('scheduled')
    expect(sellerBoardStatus({ id: 'a1', closingReportUploadedAt: '2026-10-03' }, { id: 's1' }).id).toBe('audited')
  })

  it('asks for a date and standard before the visit', () => {
    const assigned = { id: 'a1', supplierId: 's1', auditorId: 'lead', status: 'Assigned' }
    expect(journeyStage(assigned, { id: 's1' }).id).toBe('plan')
    expect(journeyStage({ ...assigned, plannedDate: '2026-10-02', status: 'Planned' }, { id: 's1' }).id).toBe('pre')
    expect(journeyStage({ ...assigned, plannedDate: '2026-10-02', status: 'Planned', preAssessmentStatus: 'issued' }, { id: 's1' }).id).toBe('onsite')
  })

  it('requires an uploaded closing report before the on-site badge', () => {
    const done = { id: 'a1', supplierId: 's1', auditorId: 'lead', status: 'Completed' }
    expect(journeyStage(done, { id: 's1' }).id).toBe('closing')
    expect(journeyStage({ ...done, closingReportUploadedAt: '2026-10-03' }, { id: 's1' }).id).toBe('badge')
  })

  it('picks the open visit for a seller', () => {
    const open = openAuditForSeller([
      { id: 'old', supplierId: 's1', status: 'Completed' },
      { id: 'live', supplierId: 's1', status: 'Assigned', auditorId: 'x' },
    ], 's1')
    expect(open.id).toBe('live')
  })

  it('sets visit length from the standard', () => {
    expect(auditDaysForStandard('IATF 16949:2016')).toBe(3)
    expect(auditDaysForStandard('ISO 9001:2015')).toBe(1)
    expect(defaultSellerStandard({ industry: 'Automotive' })).toMatch(/IATF/)
  })

  it('lists sellers that still need a visit date', () => {
    const waiting = sellersWaitingToPlan(
      [{ id: 's1' }, { id: 's2' }],
      [{ id: 'a2', supplierId: 's2', plannedDate: '2026-10-02', status: 'Planned' }],
    )
    expect(waiting.map((s) => s.id)).toEqual(['s1'])
  })
})
