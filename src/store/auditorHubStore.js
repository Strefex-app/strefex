/**
 * Auditor Hub — supplier-facing audit programs, auditor profiles, engagement history.
 * Tenant-scoped via createTenantStorage (same company as vendor master).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getTenantId } from '../utils/tenantStorage'
import { getQuestionnaireKeyForAuditType } from '../utils/auditTypeQuestionnaireKey'

export const AUDIT_TYPE_IDS = [
  { id: 'production_audit', label: 'Production audit' },
  { id: 'product_process_audit', label: 'Product & process audit' },
  { id: 'iatf_16949', label: 'IATF 16949' },
  { id: 'five_s', label: '5S / workplace organization' },
  { id: 'iso_9001', label: 'ISO 9001 system audit' },
  { id: 'layered_audit', label: 'Layered process audit (LPA)' },
  { id: 'environmental_compliance', label: 'Environmental / compliance' },
  { id: 'supplier_qualification', label: 'Supplier qualification / development' },
  { id: 'other', label: 'Other / custom' },
]

export const AUDIT_STATUS = ['planned', 'in_progress', 'completed', 'cancelled']

function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const useAuditorHubStore = create(
  persist(
    (set, get) => ({
      profiles: [],
      engagements: [],
      /** Follow-ups / CAPA-style reminders (AMS dashboard). */
      auditReminders: [],

      ensureDefaultProfile: (user) => {
        const email = String(user?.email || '').trim().toLowerCase()
        if (!email) return
        const { profiles } = get()
        if (profiles.some((p) => String(p.email || '').toLowerCase() === email)) return
        const prof = {
          id: nextId('AP'),
          displayName: user?.name || user?.fullName || email.split('@')[0],
          email,
          organization: user?.company || '',
          competencies: ['General quality', 'Supplier audits'],
          certifications: [],
          notes: '',
          isSelf: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _companyId: getTenantId(),
          _createdBy: getUserId(),
        }
        set({ profiles: [prof, ...profiles] })
      },

      addProfile: (data) => {
        const row = {
          id: nextId('AP'),
          displayName: String(data.displayName || '').trim() || 'Auditor',
          email: String(data.email || '').trim().toLowerCase(),
          organization: String(data.organization || '').trim(),
          competencies: Array.isArray(data.competencies) ? data.competencies : String(data.competencies || '').split(',').map((s) => s.trim()).filter(Boolean),
          certifications: Array.isArray(data.certifications) ? data.certifications : [],
          notes: String(data.notes || ''),
          isSelf: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _companyId: getTenantId(),
          _createdBy: getUserId(),
        }
        set((s) => ({ profiles: [row, ...s.profiles] }))
        return row
      },

      updateProfile: (id, patch) =>
        set((s) => ({
          profiles: s.profiles.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
          ),
        })),

      removeProfile: (id) =>
        set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id || p.isSelf) })),

      startEngagement: (payload) => {
        const row = {
          id: nextId('SA'),
          auditType: payload.auditType,
          questionnaireTemplateKey:
            payload.questionnaireTemplateKey ||
            (payload.auditType ? getQuestionnaireKeyForAuditType(payload.auditType) : 'Supplier'),
          questionnaireResponses: payload.questionnaireResponses || null,
          overallScorePercent:
            payload.overallScorePercent !== undefined && payload.overallScorePercent !== null
              ? payload.overallScorePercent
              : null,
          title: String(payload.title || '').trim() || 'Supplier audit',
          supplierVendorId: payload.supplierVendorId || null,
          supplierName: String(payload.supplierName || '').trim(),
          siteLocation: String(payload.siteLocation || '').trim(),
          auditorProfileId: payload.auditorProfileId || null,
          leadAuditorEmail: String(payload.leadAuditorEmail || '').trim().toLowerCase(),
          scheduledAt: payload.scheduledAt || null,
          completedAt: null,
          status: 'planned',
          outcome: '',
          scoreBand: '',
          findingsSummary: String(payload.findingsSummary || '').trim(),
          standardRefs: String(payload.standardRefs || '').trim(),
          createdBy: getUserId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          _companyId: getTenantId(),
        }
        set((s) => ({ engagements: [row, ...s.engagements] }))
        return row
      },

      updateEngagement: (id, patch) =>
        set((s) => ({
          engagements: s.engagements.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
          ),
        })),

      removeEngagement: (id) =>
        set((s) => ({ engagements: s.engagements.filter((e) => e.id !== id) })),

      addAuditReminder: (payload) => {
        const due = String(payload.dueDate || '').trim().slice(0, 10)
        if (!due) return null
        const row = {
          id: nextId('AR'),
          title: String(payload.title || '').trim() || 'Reminder',
          dueDate: due,
          status: 'open',
          engagementId: payload.engagementId || null,
          createdAt: new Date().toISOString(),
          _companyId: getTenantId(),
          _createdBy: getUserId(),
        }
        set((s) => ({ auditReminders: [row, ...s.auditReminders] }))
        return row
      },

      dismissAuditReminder: (id) =>
        set((s) => ({
          auditReminders: s.auditReminders.map((r) =>
            r.id === id ? { ...r, status: 'dismissed' } : r
          ),
        })),

      getEngagementById: (id) => get().engagements.find((e) => e.id === id),

      stats: () => {
        const engagements = get().engagements
        const byType = AUDIT_TYPE_IDS.reduce((acc, t) => {
          acc[t.id] = engagements.filter((e) => e.auditType === t.id).length
          return acc
        }, {})
        return {
          total: engagements.length,
          planned: engagements.filter((e) => e.status === 'planned').length,
          in_progress: engagements.filter((e) => e.status === 'in_progress').length,
          completed: engagements.filter((e) => e.status === 'completed').length,
          byType,
        }
      },
    }),
    {
      name: 'strefex-auditor-hub',
      storage: createTenantStorage(),
    }
  )
)

export default useAuditorHubStore
