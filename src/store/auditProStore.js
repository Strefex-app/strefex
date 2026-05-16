/**
 * Audit Pro — tenant-scoped state. Supabase-backed when user has profiles.company_id.
 * Auditors/suppliers are persisted to Supabase `management_audit_directory` when tenant has a company UUID; localStorage/workspace snapshot stays as fallback.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getTenantId } from '../utils/tenantStorage'
import { auditProUid } from '../utils/auditProUid'

function responseTouchesCount(audit) {
  const r = audit?.responses || {}
  return Object.keys(r).filter((k) => {
    const row = r[k]
    return row && (row.verdict != null || (typeof row.notes === 'string' && row.notes.trim() !== ''))
  }).length
}

/**
 * True when the audit has questionnaire activity or findings (resume / continue is meaningful).
 */
export function auditHasConductProgress(audit) {
  if (!audit) return false
  if ((audit.findings || []).length > 0) return true
  return responseTouchesCount(audit) > 0
}

function localDraftNewerThanServer(local, server) {
  const lp = local?.lastProgressSavedAt
  const su = server?.serverUpdatedAt
  if (!lp || !su) return false
  const t1 = new Date(lp).getTime()
  const t2 = new Date(su).getTime()
  return !Number.isNaN(t1) && !Number.isNaN(t2) && t1 > t2
}

/**
 * Prefer server row bodies when DB was updated after this client's last conducted save —
 * avoids desktop localStorage overwriting phone progress purely because locally more response keys qualify as "touched".
 */
function serverDraftNewerThanLocal(local, server) {
  const lp = local?.lastProgressSavedAt
  const su = server?.serverUpdatedAt
  if (!su) return false
  const tSrv = new Date(String(su)).getTime()
  if (Number.isNaN(tSrv)) return false
  if (!lp) return true
  const tLoc = new Date(String(lp)).getTime()
  return Number.isNaN(tLoc) || tSrv > tLoc
}

/** After reconnect: keep richer in-progress client copy so brief offline work is not wiped by stale server rows. */
function mergeAuditOnHydrate(local, server) {
  if (!local) return server
  if (server.status === 'Completed' || server.status === 'Cancelled') {
    if (localDraftNewerThanServer(local, server)) {
      return {
        ...server,
        findings: Array.isArray(local.findings) ? local.findings : server.findings,
        responses:
          local.responses && typeof local.responses === 'object' ? local.responses : server.responses,
        lastProgressSavedAt: local.lastProgressSavedAt,
      }
    }
    return server
  }
  /* Cross-device: DB row wins when it is strictly newer than this tab's last conduct save. */
  if (serverDraftNewerThanLocal(local, server) && !localDraftNewerThanServer(local, server)) {
    return server
  }
  const lc = responseTouchesCount(local)
  const sc = responseTouchesCount(server)
  const preferLocalDraft =
    lc > sc || (lc === sc && lc > 0 && localDraftNewerThanServer(local, server)) || (lc > 0 && sc === 0)
  if (preferLocalDraft) {
    const nextStatus =
      local.status === 'In Progress'
        ? 'In Progress'
        : auditHasConductProgress(local)
          ? 'In Progress'
          : local.status || server.status
    return {
      ...server,
      responses: local.responses || {},
      findings: Array.isArray(local.findings) ? local.findings : [],
      status: nextStatus,
      ...(local.lastProgressSavedAt ? { lastProgressSavedAt: local.lastProgressSavedAt } : {}),
    }
  }
  if (
    lc === sc &&
    lc > 0 &&
    local.status === 'In Progress' &&
    (server.status === 'Planned' || server.status === 'Draft')
  ) {
    return {
      ...server,
      responses: local.responses || {},
      findings: Array.isArray(local.findings) ? local.findings : [],
      status: 'In Progress',
      ...(local.lastProgressSavedAt ? { lastProgressSavedAt: local.lastProgressSavedAt } : {}),
    }
  }
  return server
}

async function persistLogToRemote(log) {
  try {
    const { getActorCompanyId, insertAuditEvent } = await import('../services/auditManagementDb')
    const cid = await getActorCompanyId()
    if (cid && log?.id && log?.auditId) {
      await insertAuditEvent({
        id: log.id,
        auditId: log.auditId,
        companyId: cid,
        action: log.action,
        actorName: log.user,
        detail: log.detail,
      })
    }
  } catch {
    /* offline / RLS */
  }
}

async function persistAuditToRemote(audit) {
  try {
    const { getActorCompanyId, upsertAudit } = await import('../services/auditManagementDb')
    const cid = await getActorCompanyId()
    if (cid && audit?.id) await upsertAudit(audit, cid)
  } catch {
    /* offline */
  }
}

async function persistRemindersRemote(reminders) {
  try {
    const { getActorCompanyId, replaceReminders } = await import('../services/auditManagementDb')
    const cid = await getActorCompanyId()
    if (cid) await replaceReminders(cid, reminders || [])
  } catch {
    /* offline */
  }
}

async function persistDirectoryToRemote(getState) {
  try {
    const { getActorCompanyId, replaceAuditDirectory } = await import('../services/auditManagementDb')
    const cid = await getActorCompanyId()
    if (!cid) return
    const { auditors, suppliers } = getState()
    await replaceAuditDirectory(cid, auditors || [], suppliers || [])
  } catch {
    /* offline */
  }
}

async function deleteAuditRemote(auditId) {
  try {
    const { getActorCompanyId, deleteAudit } = await import('../services/auditManagementDb')
    const cid = await getActorCompanyId()
    if (cid && auditId) await deleteAudit(auditId, cid)
  } catch {
    /* offline */
  }
}

function mergeDirectoryFromServer(serverList, localList) {
  const ids = new Set((serverList || []).map((x) => x?.id).filter(Boolean))
  const extras = (localList || []).filter((x) => x?.id && !ids.has(x.id))
  return [...(serverList || []), ...extras]
}

const useAuditProStore = create(
  persist(
    (set, get) => ({
      audits: [],
      auditors: [],
      suppliers: [],
      auditLogs: [],
      reminders: [],
      seeded: false,

      /** Empty shell — questionnaires & plans come from user data / Supabase. */
      ensureSeed: () => {
        if (get().seeded) return
        const t = getTenantId()
        set({
          seeded: true,
          audits: [],
          auditors: [],
          suppliers: [],
          auditLogs: [],
          reminders: [],
          _companyId: t,
        })
      },

      skipSeed: () => set({ seeded: true }),

      /** Canonical server merge when authenticated with company UUID + Supabase. */
      hydrateFromSupabase: async () => {
        try {
          const { isSupabaseConfigured } = await import('../config/supabase')
          if (!isSupabaseConfigured) return
          const {
            getActorCompanyId,
            fetchAuditProgramForCompany,
            fetchAuditDirectoryForCompany,
          } = await import('../services/auditManagementDb')
          const cid = await getActorCompanyId()
          if (!cid) return
          const [{ audits: serverAudits, auditLogs, reminders }, dir] = await Promise.all([
            fetchAuditProgramForCompany(cid),
            fetchAuditDirectoryForCompany(cid),
          ])
          const localAudits = get().audits || []
          const localMap = new Map(localAudits.map((a) => [a.id, a]))
          const mergedAudits = serverAudits.map((s) => mergeAuditOnHydrate(localMap.get(s.id), s))
          const serverIds = new Set(serverAudits.map((a) => a.id))
          const localOnly = localAudits.filter((a) => !serverIds.has(a.id))
          const auditors = mergeDirectoryFromServer(dir.auditors, get().auditors || [])
          const suppliers = mergeDirectoryFromServer(dir.suppliers, get().suppliers || [])
          set({
            audits: [...mergedAudits, ...localOnly],
            auditLogs,
            reminders,
            auditors,
            suppliers,
            seeded: true,
          })
        } catch {
          /* network / RLS */
        }
      },

      setAudits: (audits) => set({ audits }),
      setAuditors: (auditors) => {
        set({ auditors })
        void persistDirectoryToRemote(get)
      },
      setSuppliers: (suppliers) => {
        set({ suppliers })
        void persistDirectoryToRemote(get)
      },
      setAuditLogs: (auditLogs) => set({ auditLogs }),
      setReminders: (reminders) => {
        set({ reminders })
        void persistRemindersRemote(reminders)
      },

      patchAudit: (id, patch) =>
        set((s) => ({
          audits: s.audits.map((a) => {
            const next = a.id === id ? { ...a, ...patch } : a
            if (a.id === id) void persistAuditToRemote(next)
            return next
          }),
        })),

      replaceAudit: (audit) => {
        set((s) => ({
          audits: s.audits.map((a) => (a.id === audit.id ? audit : a)),
        }))
        void persistAuditToRemote(audit)
      },

      addAuditLog: (auditId, action, user, detail) => {
        const log = {
          id: auditProUid(),
          timestamp: new Date().toISOString(),
          auditId,
          action,
          user,
          detail,
        }
        set((s) => ({ auditLogs: [...s.auditLogs, log] }))
        void persistLogToRemote(log)
        return log
      },

      /** Local state first; then reminders replace + audit delete on server (events cascade). */
      deleteAuditAndSync: (auditId, nextAudits, nextReminders) => {
        set({ audits: nextAudits, reminders: nextReminders })
        void persistRemindersRemote(nextReminders)
        void deleteAuditRemote(auditId)
      },

      upsertAuditRemote: async (audit) => {
        await persistAuditToRemote(audit)
      },

      /**
       * @returns completed audit or null
       */
      completeAudit: (auditId, auditorName) => {
        const { audits, suppliers, reminders } = get()
        const audit = audits.find((a) => a.id === auditId)
        if (!audit) return null
        const openMajors = (audit.findings || []).filter((f) => f.type === 'Major NC' && f.status === 'Open').length
        const hasMajors = openMajors > 0
        const nextDate = new Date(audit.plannedDate || new Date())
        nextDate.setMonth(nextDate.getMonth() + (hasMajors ? 6 : 12))
        const nextAuditDate = nextDate.toISOString().slice(0, 10)
        const sup = suppliers.find((s) => s.id === audit.supplierId) || {}

        const nextAudit = {
          id: auditProUid(),
          title: `${audit.standard} ${hasMajors ? 'Re-Audit' : 'Surveillance'} – ${sup.name || 'Supplier'}`,
          industry: audit.industry,
          auditType: audit.auditType,
          standard: audit.standard,
          supplierId: audit.supplierId,
          auditorId: audit.auditorId,
          status: 'Planned',
          plannedDate: nextAuditDate,
          completedDate: null,
          scope: `Follow-up from: ${audit.title}. ${
            hasMajors ? `Re-audit required — ${openMajors} Major NC(s) open.` : 'Annual surveillance audit.'
          }`,
          findings: [],
          responses: {},
          createdAt: new Date().toISOString().slice(0, 10),
          parentAuditId: auditId,
          isAutoPlanned: true,
          auditDays: audit.auditDays,
          language: audit.language,
        }

        const completed = {
          ...audit,
          status: 'Completed',
          completedDate: new Date().toISOString().slice(0, 10),
          nextAuditDate,
          lastProgressSavedAt: new Date().toISOString(),
        }
        const updatedAudits = audits.map((a) => (a.id === auditId ? completed : a)).concat(nextAudit)
        set({ audits: updatedAudits })

        const newRems = [
          {
            id: auditProUid(),
            auditId: nextAudit.id,
            findingId: null,
            title: `${hasMajors ? 'Re-Audit' : 'Surveillance Audit'}: ${nextAudit.title}`,
            dueDate: nextAuditDate,
            status: 'Open',
            type: 'next_audit',
          },
        ]
        ;(audit.findings || [])
          .filter((f) => f.status === 'Open' && f.dueDate)
          .forEach((f) => {
            newRems.push({
              id: auditProUid(),
              auditId,
              findingId: f.id,
              title: `CAPA Due: ${f.description.slice(0, 55)} (${audit.standard})`,
              dueDate: f.dueDate,
              status: 'Open',
              type: 'finding_due',
            })
          })

        const mergedReminders = [...reminders, ...newRems]
        set({ reminders: mergedReminders })

        void persistAuditToRemote(completed)
        void persistAuditToRemote(nextAudit)
        void persistRemindersRemote(mergedReminders)

        get().addAuditLog(
          auditId,
          'Audit Completed',
          auditorName,
          `Audit completed. ${hasMajors ? `${openMajors} Major NC(s) open — re-audit in 6 months.` : 'Next surveillance in 1 year.'} Next: ${nextAuditDate}`,
        )

        return completed
      },

      dismissReminder: (id) =>
        set((s) => {
          const reminders = s.reminders.map((r) => (r.id === id ? { ...r, status: 'Dismissed' } : r))
          void persistRemindersRemote(reminders)
          return { reminders }
        }),

      toast: null,
      showToast: (msg, type = 'success') => {
        set({ toast: { msg, type } })
        setTimeout(() => set({ toast: null }), 3500)
      },
    }),
    {
      name: 'strefex-audit-pro-v2',
      storage: createTenantStorage(),
      partialize: (s) => ({
        audits: s.audits,
        auditors: s.auditors,
        suppliers: s.suppliers,
        auditLogs: s.auditLogs,
        reminders: s.reminders,
        seeded: s.seeded,
      }),
    },
  ),
)

export default useAuditProStore
