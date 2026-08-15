import { describe, expect, it } from 'vitest'
import {
  AUDIT_STANDARDS,
  INDUSTRIES,
  getQuestionnaire,
  getTotalQuestions,
} from '../data/auditManagementDetailedData'

describe('platform security audit questionnaires', () => {
  it('includes Platform / SaaS industry with whole-platform standard', () => {
    expect(INDUSTRIES).toContain('Platform / SaaS')
    const standards = AUDIT_STANDARDS['Platform / SaaS']['Cybersecurity / IT']
    expect(standards).toContain('STREFEX Platform Security Audit')
    expect(standards).toContain('ISO 27001')
    expect(standards).toContain('NIST CSF')
  })

  it('loads comprehensive STREFEX Platform Security Audit questionnaire', () => {
    const q = getQuestionnaire('STREFEX Platform Security Audit', 'Cybersecurity / IT')
    expect(q.length).toBeGreaterThanOrEqual(8)
    expect(getTotalQuestions(q)).toBeGreaterThanOrEqual(15)
    const sections = q.map((s) => s.section)
    expect(sections.some((s) => s.includes('Authentication'))).toBe(true)
    expect(sections.some((s) => s.includes('Tenant') || s.includes('Multi-Tenant'))).toBe(true)
    expect(sections.some((s) => s.includes('Deployment'))).toBe(true)
  })

  it('loads full NIST CSF and NERC CIP questionnaires (not thin fallback)', () => {
    const nist = getQuestionnaire('NIST CSF', 'Cybersecurity / IT')
    expect(getTotalQuestions(nist)).toBeGreaterThanOrEqual(10)

    const nerc = getQuestionnaire('NERC CIP', 'Cybersecurity / IT')
    expect(getTotalQuestions(nerc)).toBeGreaterThanOrEqual(6)
  })

  it('loads NIST SP 800-171 questionnaire for aerospace cyber audits', () => {
    const n171 = getQuestionnaire('NIST SP 800-171', 'Cybersecurity / IT')
    expect(getTotalQuestions(n171)).toBeGreaterThanOrEqual(5)
    expect(AUDIT_STANDARDS.Aerospace['Cybersecurity / IT']).toContain('NIST SP 800-171')
  })
})
