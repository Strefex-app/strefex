import { describe, it, expect } from 'vitest'
import { AUDIT_STANDARDS } from '../data/auditManagementDetailedData'
import {
  AUDITORS_DIRECTORY_PATH,
  AUDITORS_SOP_NAV,
  auditorsHubLeaf,
  groupSellersByCategory,
  isAuditorsHubPath,
  isAuditorsSopNavActive,
  plannedAuditsByCategory,
  sellerCategoryLabel,
  standardsCatalogue,
} from '../utils/auditorsDirectory'
import {
  buildAssignmentPool,
  buildPanelCapacity,
  inferAuditKind,
  matchWholePool,
  regionFromCountry,
  sellerSiteCode,
} from '../utils/auditorsAssignmentPool'

describe('auditorsDirectory helpers', () => {
  it('matches hub paths including the legacy alias', () => {
    expect(isAuditorsHubPath('/management/auditors')).toBe(true)
    expect(isAuditorsHubPath('/management/auditors/calendar')).toBe(true)
    expect(isAuditorsHubPath(AUDITORS_DIRECTORY_PATH)).toBe(true)
    expect(isAuditorsHubPath(`${AUDITORS_DIRECTORY_PATH}/new-audit`)).toBe(true)
    expect(isAuditorsHubPath('/management/contracts-compliance/contracts')).toBe(false)
  })

  it('reads the leaf segment', () => {
    expect(auditorsHubLeaf(AUDITORS_DIRECTORY_PATH)).toBe('')
    expect(auditorsHubLeaf(`${AUDITORS_DIRECTORY_PATH}/calendar`)).toBe('calendar')
  })

  it('marks compact SOP screens from path and query', () => {
    expect(AUDITORS_SOP_NAV.map((n) => n.label)).toEqual([
      'Supplier pool',
      'Calendar',
      'Panel',
      'Records',
    ])
    const calendar = AUDITORS_SOP_NAV.find((n) => n.label === 'Calendar')
    expect(isAuditorsSopNavActive(calendar, `${AUDITORS_DIRECTORY_PATH}/calendar`, '')).toBe(true)
    expect(isAuditorsSopNavActive(calendar, `${AUDITORS_DIRECTORY_PATH}/pool`, '')).toBe(false)
    expect(isAuditorsSopNavActive(calendar, `${AUDITORS_DIRECTORY_PATH}/suppliers`, 'view=records')).toBe(false)
    const pool = AUDITORS_SOP_NAV.find((n) => n.label === 'Supplier pool')
    expect(isAuditorsSopNavActive(pool, `${AUDITORS_DIRECTORY_PATH}/pool`, '')).toBe(true)
    const records = AUDITORS_SOP_NAV.find((n) => n.label === 'Records')
    expect(isAuditorsSopNavActive(records, `${AUDITORS_DIRECTORY_PATH}/suppliers`, 'view=records')).toBe(true)
    expect(isAuditorsSopNavActive(records, `${AUDITORS_DIRECTORY_PATH}/record/abc`, '')).toBe(true)
    const panel = AUDITORS_SOP_NAV.find((n) => n.label === 'Panel')
    expect(isAuditorsSopNavActive(panel, `${AUDITORS_DIRECTORY_PATH}/standards`, '')).toBe(true)
  })

  it('groups sellers by industry category', () => {
    expect(sellerCategoryLabel({ industry: 'automotive' })).toBe('Automotive')
    expect(sellerCategoryLabel({ industry: 'raw-materials' })).toBe('Raw Materials')
    const groups = groupSellersByCategory([
      { id: '1', industry: 'Automotive', name: 'A' },
      { id: '2', industry: 'Automotive', name: 'B' },
      { id: '3', name: 'C' },
    ])
    expect(groups[0][0]).toBe('Automotive')
    expect(groups[0][1]).toHaveLength(2)
    expect(groups[1][0]).toBe('Uncategorized')
  })

  it('plans audits by seller category', () => {
    const rows = plannedAuditsByCategory(
      [
        { id: 'a1', supplierId: 's1', plannedDate: '2026-10-02', industry: 'Medical' },
        { id: 'a2', supplierId: 'missing', plannedDate: '2026-09-20', industry: 'Aerospace' },
      ],
      [{ id: 's1', industry: 'Automotive' }],
    )
    expect(rows.map(([cat]) => cat)).toEqual(['Aerospace', 'Automotive'])
  })

  it('builds a standards catalogue with question counts', () => {
    const rows = standardsCatalogue(
      { Automotive: { 'Manufacturing / Quality': ['ISO 9001:2015'] } },
      () => [{ questions: [{}, {}] }],
      (q) => q[0].questions.length,
    )
    expect(rows[0]).toMatchObject({
      industry: 'Automotive',
      standard: 'ISO 9001:2015',
      questionCount: 2,
    })
  })
})

describe('assignment pool', () => {
  it('maps countries to panel regions', () => {
    expect(regionFromCountry('Türkiye')).toBe('EMEA')
    expect(regionFromCountry('Vietnam')).toBe('ASIA')
    expect(regionFromCountry('Mexico')).toBe('AMERICAS')
  })

  it('classifies joined, yearly, reoccurred and request kinds', () => {
    expect(inferAuditKind({ todayIso: '2026-09-17', registeredAt: '2026-08-01' })).toBe('joined')
    expect(inferAuditKind({
      todayIso: '2026-09-17',
      lastCompleted: { completedDate: '2025-09-01' },
    })).toBe('yearly')
    expect(inferAuditKind({ todayIso: '2026-09-17', openFindings: 2 })).toBe('reoccurred')
    expect(inferAuditKind({ todayIso: '2026-09-17', fromRequest: true })).toBe('request')
  })

  it('puts unassigned database sellers and audit requests into the pool', () => {
    const jobs = buildAssignmentPool({
      todayIso: '2026-09-17',
      suppliers: [{
        id: 's1',
        name: 'New Co',
        email: 'new@co.test',
        country: 'Germany',
        industry: 'Automotive',
        registeredAt: '2026-08-20',
        certifications: ['IATF 16949:2016', 'ISO 9001:2015'],
      }],
      audits: [],
      requests: [{
        id: 'SR-1',
        status: 'new',
        serviceCategoryId: 'supplier-audit',
        companyName: 'Buyer Ltd',
        email: 'buyer@co.test',
        preferredDate: '2026-10-01',
        services: ['Supplier Audit'],
        description: 'Audit type: Supplier. Audit standard: VDA 6.3.',
      }],
    })
    expect(jobs.some((j) => j.kind === 'joined' && j.supplierId === 's1')).toBe(true)
    expect(jobs.some((j) => j.kind === 'request')).toBe(true)
  })

  it('matches the pool to qualified auditors and tracks utilisation', () => {
    const auditors = [{
      id: 'aud1',
      name: 'M. Haas',
      email: 'haas@a.test',
      country: 'Germany',
      certifications: ['IATF 16949:2016', 'ISO 9001:2015'],
      annualCapacityDays: 60,
    }]
    const jobs = buildAssignmentPool({
      todayIso: '2026-09-17',
      suppliers: [{
        id: 's1',
        name: 'Plant',
        country: 'Germany',
        industry: 'Automotive',
        registeredAt: '2026-08-01',
        certifications: ['ISO 9001:2015'],
      }],
      audits: [],
      requests: [],
    })
    const proposals = matchWholePool(jobs, auditors, [])
    expect(Object.values(proposals)[0]?.auditorId).toBe('aud1')
    const cap = buildPanelCapacity({ auditors, audits: [], proposals })
    expect(cap[0].assignedHere).toBeGreaterThan(0)
    expect(AUDIT_STANDARDS.Automotive).toBeTruthy()
  })

  it('lists assigned sellers when includeAllSuppliers is on', () => {
    const jobs = buildAssignmentPool({
      todayIso: '2026-09-17',
      includeAssigned: true,
      includeAllSuppliers: true,
      suppliers: [{
        id: 's1',
        name: 'Assigned Co',
        country: 'Germany',
        industry: 'Automotive',
        externalAuditAssignedAuditorEmail: 'haas@a.test',
      }],
      audits: [{ id: 'a1', supplierId: 's1', auditorId: 'aud1', status: 'Assigned' }],
      requests: [],
    })
    expect(jobs.some((j) => j.supplierId === 's1' && j.auditorId === 'aud1')).toBe(true)
  })

  it('uses the platform number as seller code', () => {
    expect(sellerSiteCode({
      id: 's1',
      name: 'Plant Co',
      registration_code: 'S000421',
    })).toBe('S000421')
    expect(sellerSiteCode({
      id: 's1',
      name: 'Plant Co',
      supplierCode: 'SUP-1234',
      registrationCode: 'S000421',
    })).toBe('S000421')
  })
})
