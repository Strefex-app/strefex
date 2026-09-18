import { describe, it, expect } from 'vitest'
import { AUDIT_STANDARDS } from '../data/auditManagementDetailedData'
import {
  AUDITORS_DIRECTORY_PATH,
  auditorsHubLeaf,
  groupSellersByCategory,
  isAuditorsHubPath,
  plannedAuditsByCategory,
  standardsCatalogue,
} from '../utils/auditorsDirectory'
import {
  buildAssignmentPool,
  buildPanelCapacity,
  inferAuditKind,
  matchWholePool,
  regionFromCountry,
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

  it('groups sellers by industry category', () => {
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
})
