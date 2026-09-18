import { describe, expect, it } from 'vitest'
import { AUDIT_SCORING_ANCHORS } from '../data/auditManagementDetailedData'
import {
  chunkQuestionnairePages,
  flattenQuestionnaireRows,
  industryStandardsCatalogue,
  questionnaireFormCode,
  questionnairePrintSheets,
  standardMatchesFilter,
  standardsReferredByAuditor,
  uniqueAuditStandards,
} from '../utils/auditStandardsCatalogue'

describe('auditStandardsCatalogue', () => {
  it('lists unique standards and filters automotive vs special process', () => {
    const rows = uniqueAuditStandards()
    expect(rows.some((r) => r.standard === 'ISO 9001:2015')).toBe(true)
    expect(rows.some((r) => r.standard === 'IATF 16949:2016')).toBe(true)
    const iso = rows.find((r) => r.standard === 'ISO 9001:2015')
    expect(standardMatchesFilter(iso, 'Automotive')).toBe(true)
    expect(standardMatchesFilter({ ...iso, industries: ['special'] }, 'special')).toBe(true)
  })

  it('offers the industry module lists used on Standards', () => {
    expect(industryStandardsCatalogue('Automotive').map((r) => r.standard)).toEqual([
      'ISO 9001:2015',
      'IATF 16949:2016',
      'VDA 6.3 process audit',
      'Special process control',
      'Company-wide departmental audit',
      'Social & environmental due diligence',
    ])
    expect(industryStandardsCatalogue('Aerospace').map((r) => r.standard)).toEqual([
      'ISO 9001:2015',
      'AS9100D / EN 9100',
      'Special process control',
      'ISO 3834 welding quality',
      'Company-wide departmental audit',
    ])
    const iso = industryStandardsCatalogue('industrial').find((r) => r.standard === 'ISO 9001:2015')
    expect(iso.questionCount).toBeGreaterThanOrEqual(20)
    expect(flattenQuestionnaireRows(iso.questionnaire)[0]).toMatchObject({
      clause: '4.1',
      element: 'Context & processes',
    })
  })

  it('flattens questions with look-at text and attached references', () => {
    const rows = flattenQuestionnaireRows([
      {
        section: 'Leadership',
        clause: '5',
        questions: [{
          id: 'q1',
          isoRef: '5.2',
          text: 'Is the quality policy understood?',
          examples: 'Ask two operators.',
          docs: ['Quality policy'],
          reference: 'ISO 9001:2015 §5.2',
        }],
      },
    ])
    expect(rows[0]).toMatchObject({
      clause: '5.2',
      element: 'Leadership',
      lookAt: 'Ask two operators.',
      docs: ['Quality policy'],
    })
  })

  it('maps auditor certificates to the standards they refer to', () => {
    const hits = standardsReferredByAuditor(
      { certifications: ['IATF 16949 Lead Auditor'] },
      uniqueAuditStandards(),
    )
    expect(hits.some((r) => r.standard === 'IATF 16949:2016')).toBe(true)
  })

  it('exposes scoring anchors used on the standards page', () => {
    expect(AUDIT_SCORING_ANCHORS.map((a) => a.label)).toEqual([
      'Conform',
      'Observation',
      'Minor NC',
      'Major NC',
      'Not applicable',
    ])
  })

  it('builds a form code and paginates the printable checklist', () => {
    expect(questionnaireFormCode('ISO 9001:2015')).toMatch(/^SQ-C\d{2} · ISO9001 rev 6$/)
    expect(chunkQuestionnairePages(Array.from({ length: 10 }, (_, i) => ({ id: i })), 8)).toHaveLength(2)
    const sheets = questionnairePrintSheets(Array.from({ length: 20 }, (_, i) => ({ id: i })))
    expect(sheets[0].kind).toBe('cover')
    expect(sheets[0].questions).toHaveLength(4)
    expect(sheets.at(-1).kind).toBe('sign')
    expect(sheets.slice(1, -1).every((s) => s.kind === 'cont')).toBe(true)
  })
})
