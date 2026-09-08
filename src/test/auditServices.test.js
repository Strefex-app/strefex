import { describe, it, expect, beforeEach } from 'vitest'
import {
  AUDIT_SERVICES_CATEGORY_ID,
  accountOffersAuditServices,
  defaultAuditorServiceCategories,
  isAuditServiceCategoryId,
} from '../data/auditServices'
import { useAccountRegistry } from '../store/accountRegistry'
import { canAccessLegacyServiceHub } from '../utils/serviceHubAccess'

describe('auditServices taxonomy', () => {
  it('recognizes hub, legacy, and kind ids', () => {
    expect(isAuditServiceCategoryId('audit-services')).toBe(true)
    expect(isAuditServiceCategoryId('supplier-audit')).toBe(true)
    expect(isAuditServiceCategoryId('process-audit')).toBe(true)
    expect(isAuditServiceCategoryId('project-management')).toBe(false)
  })

  it('defaults auditor categories to audit-services + supplier-audit', () => {
    expect(defaultAuditorServiceCategories()).toEqual(
      expect.arrayContaining([AUDIT_SERVICES_CATEGORY_ID, 'supplier-audit']),
    )
  })

  it('treats auditor accounts as offering audits', () => {
    expect(accountOffersAuditServices({ accountType: 'auditor', serviceCategories: [] })).toBe(true)
    expect(accountOffersAuditServices({
      accountType: 'service_provider',
      serviceCategories: ['audit-services'],
    })).toBe(true)
    expect(accountOffersAuditServices({
      accountType: 'service_provider',
      serviceCategories: ['project-management'],
    })).toBe(false)
  })
})

describe('getAuditProvidersForIndustry', () => {
  beforeEach(() => {
    useAccountRegistry.setState({
      accounts: [
        {
          id: 'a1',
          email: 'auditor@example.com',
          company: 'Audit Co',
          accountType: 'auditor',
          accountTypes: ['auditor'],
          industries: ['automotive'],
          serviceCategories: ['audit-services', 'supplier-audit'],
          status: 'active',
        },
        {
          id: 'sp1',
          email: 'sp-audit@example.com',
          company: 'SP Audits',
          accountType: 'service_provider',
          accountTypes: ['service_provider'],
          industries: ['automotive'],
          serviceCategories: ['audit-services', 'process-audit'],
          status: 'active',
        },
        {
          id: 'sp2',
          email: 'sp-pm@example.com',
          company: 'PM Only',
          accountType: 'service_provider',
          accountTypes: ['service_provider'],
          industries: ['automotive'],
          serviceCategories: ['project-management'],
          status: 'active',
        },
        {
          id: 'a2',
          email: 'other-ind@example.com',
          company: 'Medical Auditor',
          accountType: 'auditor',
          accountTypes: ['auditor'],
          industries: ['medical'],
          serviceCategories: ['audit-services'],
          status: 'active',
        },
      ],
    })
  })

  it('returns auditors and audit SPs for an industry', () => {
    const rows = useAccountRegistry.getState().getAuditProvidersForIndustry('automotive')
    const emails = rows.map((r) => r.email).sort()
    expect(emails).toEqual(['auditor@example.com', 'sp-audit@example.com'])
  })

  it('filters by audit type when SP has specific kinds', () => {
    const rows = useAccountRegistry.getState().getAuditProvidersForIndustry('automotive', 'process-audit')
    const emails = rows.map((r) => r.email).sort()
    expect(emails).toContain('sp-audit@example.com')
    expect(emails).toContain('auditor@example.com')
    expect(emails).not.toContain('sp-pm@example.com')
  })
})

describe('serviceHubAccess auditors', () => {
  it('allows auditors on Service Hub', () => {
    expect(canAccessLegacyServiceHub({ accountType: 'auditor' })).toBe(true)
  })
})
