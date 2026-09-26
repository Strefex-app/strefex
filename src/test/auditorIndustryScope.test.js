import { describe, expect, it } from 'vitest'
import { isBusinessEmail, businessEmailError } from '../utils/businessEmail'
import {
  normalizeIndustryId,
  readAuditorVisibleIndustries,
  recordInAuditorScope,
  scopeAuditsForViewer,
  scopeAuditorsForViewer,
  scopeSuppliersForViewer,
  suppliersForCalendarWorkspace,
} from '../utils/auditorIndustryScope'

describe('business email', () => {
  it('rejects public mailboxes', () => {
    expect(isBusinessEmail('lead@gmail.com')).toBe(false)
    expect(isBusinessEmail('lead@mail.ru')).toBe(false)
    expect(businessEmailError('a@yahoo.com')).toMatch(/company email/i)
  })

  it('accepts company domains', () => {
    expect(isBusinessEmail('auditor@audit-house.pro')).toBe(true)
  })
})

describe('auditor industry scope', () => {
  it('maps audit labels to hub slugs', () => {
    expect(normalizeIndustryId('Automotive')).toBe('automotive')
    expect(normalizeIndustryId('Oil & Gas')).toBe('oil-gas')
  })

  it('prefers explicit allowlist including empty', () => {
    expect(readAuditorVisibleIndustries({
      metadata: { auditor_visible_industries: [], industries: ['automotive'] },
    })).toEqual([])
    expect(readAuditorVisibleIndustries({
      industries: ['Medical'],
    })).toEqual(['medical'])
  })

  it('hides uncategorized and out-of-scope sellers', () => {
    expect(recordInAuditorScope({ industry: 'automotive' }, ['automotive'])).toBe(true)
    expect(recordInAuditorScope({ industry: 'medical' }, ['automotive'])).toBe(false)
    expect(recordInAuditorScope({ name: 'No industry' }, ['automotive'])).toBe(false)
  })

  it('scopes panel, records and visits for an external auditor', () => {
    const auditors = [
      { id: 'a1', email: 'me@firm.pro' },
      { id: 'a2', email: 'other@firm.pro' },
    ]
    const suppliers = [
      { id: 's1', industry: 'automotive' },
      { id: 's2', industry: 'medical' },
      { id: 's3', industry: 'automotive' },
    ]
    const audits = [
      { id: 'v1', auditorId: 'a1', supplierId: 's1', industry: 'automotive' },
      { id: 'v2', auditorId: 'a1', supplierId: 's2', industry: 'medical' },
      { id: 'v3', auditorId: 'a2', supplierId: 's3', industry: 'automotive' },
    ]
    const ctx = {
      role: 'auditor_external',
      email: 'me@firm.pro',
      allowedIndustries: ['automotive'],
      auditorIds: new Set(['a1']),
      audits,
    }
    expect(scopeAuditorsForViewer(auditors, ctx).map((a) => a.id)).toEqual(['a1'])
    expect(scopeSuppliersForViewer(suppliers, ctx).map((s) => s.id)).toEqual(['s1'])
    expect(scopeAuditsForViewer(audits, suppliers, ctx).map((a) => a.id)).toEqual(['v1'])
  })

  it('does not list other sellers in the same assigned industry', () => {
    const suppliers = [
      { id: 'mine', industry: 'automotive', externalAuditAssignedAuditorEmail: 'me@firm.pro' },
      { id: 'peer', industry: 'automotive' },
    ]
    expect(scopeSuppliersForViewer(suppliers, {
      role: 'auditor_external',
      email: 'me@firm.pro',
      allowedIndustries: ['automotive'],
      auditorIds: new Set(['a1']),
      audits: [],
    }).map((s) => s.id)).toEqual(['mine'])
  })

  it('keeps unassigned sellers off the calendar rail for superadmin', () => {
    const suppliers = [
      { id: 'open', industry: 'automotive' },
      { id: 'idle', industry: 'automotive' },
    ]
    const audits = [{ id: 'v1', auditorId: 'a1', supplierId: 'open' }]
    expect(suppliersForCalendarWorkspace(suppliers, audits, { role: 'superadmin' }).map((s) => s.id)).toEqual(['open'])
  })
})
