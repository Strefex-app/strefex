import { describe, expect, it } from 'vitest'
import {
  auditToUpsertRow,
  auditDirectoryEntriesFromProfileRows,
  directoryRowToEntry,
  reminderToRow,
  rowToAudit,
  rowToReminder,
} from '../services/auditManagementDb'
import {
  assembleAuditWorkspaceFromServer,
  calendarLinksFromWorkspace,
  keepUnsyncedLocalRows,
  mergeSupplierLists,
  sellersFromCompanyAuditRows,
} from '../utils/auditProgramHydrate'

const COMPANY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SELLER_COMPANY_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function plannedVisit() {
  return {
    id: 'visit-1',
    title: 'IATF 16949 – Hanoi plant',
    industry: 'Automotive',
    auditType: 'Manufacturing / Quality',
    standard: 'IATF 16949:2016',
    supplierId: 'seller-hanoi',
    auditorId: 'auditor-lead',
    secondaryAuditorId: 'auditor-support',
    status: 'Planned',
    plannedDate: '2026-10-02',
    deadlineDate: '2026-10-20',
    completedDate: null,
    nextAuditDate: null,
    scope: 'QMS · manufacturing',
    findings: [],
    responses: {},
    auditDays: 2,
    language: 'English',
    parentAuditId: null,
    isAutoPlanned: false,
  }
}

describe('audit program database connection', () => {
  it('round-trips a planned visit with seller, lead and supporting auditor', () => {
    const visit = plannedVisit()
    const row = auditToUpsertRow(visit, COMPANY_ID)
    expect(row).toMatchObject({
      company_id: COMPANY_ID,
      supplier_ref: 'seller-hanoi',
      auditor_ref: 'auditor-lead',
      secondary_auditor_ref: 'auditor-support',
      planned_date: '2026-10-02',
      deadline_date: '2026-10-20',
      status: 'Planned',
    })
    const loaded = rowToAudit({
      ...row,
      created_at: '2026-09-18T00:00:00.000Z',
      updated_at: '2026-09-18T08:00:00.000Z',
    })
    expect(loaded.supplierId).toBe(visit.supplierId)
    expect(loaded.auditorId).toBe(visit.auditorId)
    expect(loaded.secondaryAuditorId).toBe(visit.secondaryAuditorId)
    expect(loaded.plannedDate).toBe(visit.plannedDate)
    expect(loaded.deadlineDate).toBe(visit.deadlineDate)
  })

  it('round-trips auditor and seller directory rows used on hydrate', () => {
    const auditorRow = {
      id: 'auditor-lead',
      entry_kind: 'auditor',
      data: { id: 'auditor-lead', name: 'M. Haas', email: 'haas@audit.test', auditorCode: 'SX-AUD-2026-001' },
    }
    const sellerRow = {
      id: 'seller-hanoi',
      entry_kind: 'supplier',
      data: {
        id: 'seller-hanoi',
        name: 'Hanoi Electronics Assembly',
        email: 'plant@hanoi.test',
        platformCompanyId: SELLER_COMPANY_ID,
      },
    }
    expect(directoryRowToEntry(auditorRow)).toMatchObject({ id: 'auditor-lead', email: 'haas@audit.test' })
    expect(directoryRowToEntry(sellerRow)).toMatchObject({
      id: 'seller-hanoi',
      platformCompanyId: SELLER_COMPANY_ID,
    })
  })

  it('round-trips calendar reminders against the visit id', () => {
    const reminder = {
      id: 'rem-1',
      auditId: 'visit-1',
      findingId: null,
      title: 'IATF 16949 – Hanoi plant',
      dueDate: '2026-10-02',
      status: 'Open',
      type: 'next_audit',
    }
    const row = reminderToRow(reminder, COMPANY_ID)
    expect(row.audit_id).toBe('visit-1')
    expect(rowToReminder(row).auditId).toBe('visit-1')
  })

  it('loads auditors, sellers and calendar links from empty local state (cold start)', () => {
    const visit = rowToAudit(auditToUpsertRow(plannedVisit(), COMPANY_ID))
    const { auditors, suppliers } = assembleAuditWorkspaceFromServer({
      directoryAuditors: [
        { id: 'auditor-lead', name: 'M. Haas', email: 'haas@audit.test' },
        { id: 'auditor-support', name: 'L. Chen', email: 'chen@audit.test' },
      ],
      directorySuppliers: [
        { id: 'seller-hanoi', name: 'Hanoi Electronics Assembly', email: 'plant@hanoi.test' },
      ],
      platformAuditors: [
        { id: 'company_profile_9', name: 'M. Haas', email: 'haas@audit.test', source: 'supabase_profiles' },
      ],
      accountSuppliers: [
        { id: 'account_directory_3', name: 'Hanoi Electronics Assembly', email: 'plant@hanoi.test', accountDirectoryEntryId: '3' },
      ],
      companyAuditRows: [{
        id: SELLER_COMPANY_ID,
        email: 'plant@hanoi.test',
        name: 'Hanoi Electronics Assembly',
        accountType: 'seller',
        external_audit_status: 'planned',
        external_audit_planned_at: '2026-10-02',
        external_audit_assigned_auditor_email: 'haas@audit.test',
        external_audit_assigned_auditor_name: 'M. Haas',
      }],
      localAuditors: [],
      localSuppliers: [],
    })

    expect(auditors.find((a) => a.email === 'haas@audit.test').id).toBe('auditor-lead')
    expect(suppliers.find((s) => s.id === 'seller-hanoi').platformCompanyId).toBe(SELLER_COMPANY_ID)
    expect(suppliers.find((s) => s.id === 'seller-hanoi').externalAuditStatus).toBe('planned')

    const calendar = calendarLinksFromWorkspace({
      audits: [visit],
      auditors,
      suppliers,
      todayIso: '2026-09-18',
    })
    expect(calendar.missingAuditor).toEqual([])
    expect(calendar.missingSeller).toEqual([])
    const planned = calendar.events.find((e) => e.type === 'planned')
    expect(planned.supplierId).toBe('seller-hanoi')
    expect(planned.auditorId).toBe('auditor-lead')
    expect(planned.label).toBe('Hanoi Electronics Assembly')
    expect(planned.detail).toContain('M. Haas')
  })

  it('keeps a supporting auditor from platform profiles when the directory only has the lead', () => {
    const { auditors } = assembleAuditWorkspaceFromServer({
      directoryAuditors: [{ id: 'auditor-lead', name: 'M. Haas', email: 'haas@audit.test' }],
      platformAuditors: [{ id: 'company_profile_2', name: 'L. Chen', email: 'chen@audit.test', source: 'supabase_profiles' }],
    })
    expect(auditors.map((a) => a.email).sort()).toEqual(['chen@audit.test', 'haas@audit.test'])
  })

  it('adds assigned seller companies that are not yet in the local directory', () => {
    const incoming = sellersFromCompanyAuditRows([{
      id: SELLER_COMPANY_ID,
      name: 'Nordic Steel',
      email: 'qa@nordic.test',
      accountType: 'seller',
      external_audit_status: 'planned',
      external_audit_planned_at: '2026-11-01',
      external_audit_assigned_auditor_email: 'haas@audit.test',
    }])
    const merged = mergeSupplierLists([], incoming)
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({
      id: `platform_company_${SELLER_COMPANY_ID}`,
      platformCompanyId: SELLER_COMPANY_ID,
      email: 'qa@nordic.test',
    })
  })

  it('does not drop a local unsynced seller when the server directory is empty', () => {
    const kept = keepUnsyncedLocalRows([], [{ id: 'local-seller', name: 'Draft plant' }])
    expect(kept).toHaveLength(1)
    expect(kept[0].id).toBe('local-seller')
  })

  it('maps Superadmin registered accounts (metadata types) onto the seller register', () => {
    const { suppliers, auditors } = auditDirectoryEntriesFromProfileRows([
      {
        id: 'p-seller',
        email: 'plant@hanoi.test',
        full_name: 'Plant Admin',
        role: 'admin',
        created_at: '2026-01-10T00:00:00.000Z',
        metadata: { account_types: ['seller'], company_name: 'Hanoi Electronics Assembly' },
        companies: {
          id: SELLER_COMPANY_ID,
          name: 'Hanoi Electronics Assembly',
          account_type: 'buyer',
          country: 'Vietnam',
          city: 'Hanoi',
          external_audit_status: 'pending',
        },
      },
      {
        id: 'p-aud',
        email: 'haas@audit.test',
        full_name: 'M. Haas',
        role: 'auditor_external',
        created_at: '2026-02-01T00:00:00.000Z',
        companies: { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'Haas Audit', account_type: 'auditor' },
      },
    ])
    expect(suppliers[0]).toMatchObject({
      id: `platform_company_${SELLER_COMPANY_ID}`,
      email: 'plant@hanoi.test',
      name: 'Hanoi Electronics Assembly',
      city: 'Hanoi',
      platformCompanyId: SELLER_COMPANY_ID,
    })
    expect(auditors[0]).toMatchObject({ email: 'haas@audit.test', name: 'M. Haas' })

    const { suppliers: merged } = assembleAuditWorkspaceFromServer({
      platformSuppliers: suppliers,
    })
    expect(merged.some((s) => s.platformCompanyId === SELLER_COMPANY_ID)).toBe(true)
  })
})
