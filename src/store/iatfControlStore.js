import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'
import { blankPpapElements, DEFAULT_RELIABILITY_SHARE } from '../data/iatfControlCatalog'
import { PLANT_QMS_SPACE, spaceRootFolderId } from '../data/companyDatabaseSpaces'
import {
  ensureSeedFolders,
  inferFolderIdForDocument,
  makeUserFolder,
  migrateDocumentsToFolders,
} from '../utils/companyFolders'
import { freezeLots, lotReleaseBlocked } from '../utils/iatfControlCompute'
import { applyLoggedPatch, withCreateLog } from '../utils/recordChangeLog'

const IMPACT_DOC_TYPE = {
  pfmea: 'pfmea',
  controlPlan: 'control_plan',
  workInstruction: 'work_instruction',
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function stamp(row, extra = {}) {
  const now = new Date().toISOString()
  return {
    ...row,
    ...extra,
    updatedAt: now,
    createdAt: row.createdAt || now,
    _createdBy: row._createdBy || getUserId(),
  }
}

function logPatch(row, patch, action = 'updated', reason = '') {
  return applyLoggedPatch(row, patch, { action, reason, stamp })
}

function mapLogged(list, id, patch, action, reason) {
  return (list || []).map((row) => (row.id === id ? logPatch(row, patch, action, reason) : row))
}

const emptyState = {
  folders: [],
  plantIndustry: 'general',
  processes: [],
  parts: [],
  documents: [],
  lots: [],
  ncrs: [],
  certificates: [],
  ppapPackages: [],
  changes: [],
  gauges: [],
  awards: [],
  share: { ...DEFAULT_RELIABILITY_SHARE },
  publishedCard: null,
}

const useIatfControlStore = create(
  persist(
    (set, get) => ({
      ...emptyState,

      canEdit: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),
      getAccessLevel: () => getUserRole(),

      ensureFolders: () => {
        const plantIndustry = get().plantIndustry || 'general'
        const folders = ensureSeedFolders(get().folders || [], plantIndustry)
        const documents = migrateDocumentsToFolders(get().documents || [], folders)
        set({ folders, documents })
        return folders
      },

      setPlantIndustry: (industryId) => {
        const plantIndustry = String(industryId || 'general')
        const folders = ensureSeedFolders(get().folders || [], plantIndustry)
        set({ plantIndustry, folders })
        return folders
      },

      addFolder: (patch = {}) => {
        const folders = get().folders?.length ? get().folders : ensureSeedFolders([])
        const row = stamp(withCreateLog(
          makeUserFolder({
            parentId: patch.parentId || spaceRootFolderId(patch.space || PLANT_QMS_SPACE),
            name: patch.name,
            space: patch.space || PLANT_QMS_SPACE,
            folders,
          }),
          'Created folder',
        ))
        set((s) => ({ folders: [...(s.folders || []), row] }))
        return row
      },

      updateFolder: (id, patch = {}, meta = {}) => {
        set((s) => ({
          folders: mapLogged(s.folders || [], id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      addProcess: (patch = {}) => {
        const row = stamp(withCreateLog({
          id: newId('prc'),
          code: patch.code || '',
          name: patch.name || 'New process',
          operations: Array.isArray(patch.operations) ? patch.operations : [],
        }, 'Created process'))
        set((s) => ({ processes: [row, ...s.processes] }))
        return row
      },

      updateProcess: (id, patch = {}, meta = {}) => {
        set((s) => ({
          processes: mapLogged(s.processes, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      addOperation: (processId, name = 'Operation') => {
        const op = { id: newId('op'), seq: 0, name }
        set((s) => ({
          processes: s.processes.map((row) => {
            if (row.id !== processId) return row
            const operations = [...(row.operations || []), { ...op, seq: (row.operations || []).length + 1 }]
            return stamp(row, { operations })
          }),
        }))
        return op
      },

      addPart: (patch = {}) => {
        const row = stamp(withCreateLog({
          id: newId('prt'),
          partNumber: patch.partNumber || '',
          revision: patch.revision || 'A',
          name: patch.name || 'New part',
          processId: patch.processId || '',
          specialCharacteristics: patch.specialCharacteristics || '',
          ppapLevel: patch.ppapLevel || '3',
          ppapStatus: patch.ppapStatus || 'none',
          ppapCustomer: patch.ppapCustomer || '',
        }, 'Created part'))
        set((s) => ({ parts: [row, ...s.parts] }))
        return row
      },

      updatePart: (id, patch = {}, meta = {}) => {
        set((s) => ({
          parts: mapLogged(s.parts, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      addDocument: (patch = {}) => {
        const folders = get().folders?.length ? get().folders : ensureSeedFolders([])
        const folderId = patch.folderId || inferFolderIdForDocument(patch, folders)
        const row = stamp(withCreateLog({
          id: newId('doc'),
          docNumber: patch.docNumber || `DOC-${Date.now().toString(36).toUpperCase()}`,
          title: patch.title || 'Untitled',
          type: patch.type || 'procedure',
          revision: patch.revision || '00',
          status: patch.status || 'draft',
          department: patch.department || 'Quality',
          space: patch.space || PLANT_QMS_SPACE,
          folderId,
          partId: patch.partId || '',
          processId: patch.processId || '',
          owner: patch.owner || '',
          approvedBy: '',
          approvedAt: '',
          effectiveDate: patch.effectiveDate || '',
          reviewDue: patch.reviewDue || '',
          supersededBy: '',
          fileName: patch.fileName || '',
          storagePath: patch.storagePath || '',
          notes: patch.notes || '',
        }, 'Created document'))
        set((s) => ({ documents: [row, ...s.documents] }))
        return row
      },

      updateDocument: (id, patch = {}, meta = {}) => {
        set((s) => ({
          documents: mapLogged(s.documents, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      approveDocument: (id, meta = {}) => {
        const now = new Date().toISOString()
        set((s) => ({
          documents: mapLogged(
            s.documents,
            id,
            { status: 'approved', approvedBy: getUserId(), approvedAt: now },
            'approved',
            meta.reason,
          ),
        }))
      },

      obsoleteDocument: (id, supersededBy = '', meta = {}) => {
        set((s) => ({
          documents: mapLogged(
            s.documents,
            id,
            { status: 'obsolete', supersededBy },
            'obsoleted',
            meta.reason,
          ),
        }))
      },

      addLot: (patch = {}) => {
        const row = stamp(withCreateLog({
          id: newId('lot'),
          lotNumber: patch.lotNumber || `LOT-${Date.now().toString(36).toUpperCase()}`,
          kind: patch.kind || 'incoming',
          partId: patch.partId || '',
          processId: patch.processId || '',
          parentLotIds: Array.isArray(patch.parentLotIds) ? patch.parentLotIds : [],
          materialCert: patch.materialCert || '',
          serialNumber: patch.serialNumber || '',
          quantity: Number(patch.quantity) || 0,
          status: patch.status || 'open',
          customerRef: patch.customerRef || '',
          department: patch.department || '',
          ncrIds: [],
        }, 'Created lot'))
        set((s) => ({ lots: [row, ...s.lots] }))
        return row
      },

      updateLot: (id, patch = {}, meta = {}) => {
        const prev = (get().lots || []).find((row) => row.id === id)
        if (!prev) return { ok: false }
        const nextStatus = patch.status || prev.status
        if (lotReleaseBlocked({ ...prev, ...patch, status: nextStatus }, get().gauges || [])) {
          return { ok: false, reason: 'Cannot release or ship: a gauge for this part is overdue.' }
        }
        set((s) => ({
          lots: mapLogged(s.lots, id, patch, meta.action || 'updated', meta.reason),
        }))
        return { ok: true }
      },

      addNcr: (patch = {}) => {
        const lotIds = Array.isArray(patch.lotIds) ? patch.lotIds : []
        const row = stamp(withCreateLog({
          id: newId('ncr'),
          number: patch.number || `NCR-${Date.now().toString(36).toUpperCase()}`,
          partId: patch.partId || '',
          lotIds,
          description: patch.description || '',
          status: 'contained',
          eightDRecordId: patch.eightDRecordId || '',
          department: patch.department || '',
        }, 'Created NCR'))
        set((s) => {
          const frozen = freezeLots(s.lots, lotIds, row.id)
          return {
            ncrs: [row, ...s.ncrs],
            lots: frozen.map((lot) => {
              if (!lotIds.includes(lot.id)) return lot
              const prev = s.lots.find((item) => item.id === lot.id) || lot
              return logPatch(prev, { status: lot.status, ncrIds: lot.ncrIds }, 'contained', patch.description)
            }),
          }
        })
        return row
      },

      updateNcr: (id, patch = {}, meta = {}) => {
        set((s) => ({
          ncrs: mapLogged(s.ncrs, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      addCertificate: (patch = {}) => {
        const row = stamp(withCreateLog({
          id: newId('crt'),
          standard: patch.standard || 'iatf_16949',
          number: patch.number || '',
          certifyingBody: patch.certifyingBody || '',
          scope: patch.scope || '',
          issuedAt: patch.issuedAt || '',
          expiresAt: patch.expiresAt || '',
          fileName: patch.fileName || '',
          storagePath: patch.storagePath || '',
          status: patch.status || 'active',
          space: patch.space || PLANT_QMS_SPACE,
          folderId: patch.folderId || 'folder-06-iatf',
        }, 'Created certificate'))
        set((s) => ({ certificates: [row, ...s.certificates] }))
        return row
      },

      updateCertificate: (id, patch = {}, meta = {}) => {
        set((s) => ({
          certificates: mapLogged(s.certificates, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      deleteCertificate: (id) => {
        set((s) => ({ certificates: s.certificates.filter((row) => row.id !== id) }))
      },

      setShare: (patch = {}) => {
        set((s) => ({ share: { ...s.share, ...patch } }))
      },

      setPublishedCard: (card) => {
        set({ publishedCard: card || null })
      },

      addPpapPackage: (patch = {}) => {
        const row = stamp(withCreateLog({
          id: newId('ppap'),
          partId: patch.partId || '',
          customer: patch.customer || '',
          level: patch.level || '3',
          status: patch.status || 'in_progress',
          elements: { ...blankPpapElements(), ...(patch.elements || {}) },
          pswFile: patch.pswFile || '',
          notes: patch.notes || '',
        }, 'Created PPAP pack'))
        set((s) => ({
          ppapPackages: [row, ...(s.ppapPackages || [])],
          parts: s.parts.map((part) => (
            part.id === row.partId
              ? logPatch(part, { ppapStatus: 'in_progress', ppapLevel: row.level, ppapCustomer: row.customer }, 'ppap_opened')
              : part
          )),
        }))
        return row
      },

      updatePpapPackage: (id, patch = {}, meta = {}) => {
        set((s) => ({
          ppapPackages: mapLogged(s.ppapPackages, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      setPpapElement: (id, elementId, state, meta = {}) => {
        set((s) => ({
          ppapPackages: (s.ppapPackages || []).map((row) => {
            if (row.id !== id) return row
            return logPatch(row, { elements: { ...(row.elements || {}), [elementId]: state } }, 'element', meta.reason)
          }),
        }))
      },

      submitPpapPackage: (id) => {
        set((s) => ({
          ppapPackages: mapLogged(s.ppapPackages, id, { status: 'submitted' }, 'submitted'),
          parts: s.parts.map((part) => {
            const pkg = (s.ppapPackages || []).find((row) => row.id === id)
            if (!pkg || part.id !== pkg.partId) return part
            return logPatch(part, { ppapStatus: 'submitted' }, 'ppap_submitted')
          }),
        }))
      },

      approvePpapPackage: (id) => {
        set((s) => ({
          ppapPackages: mapLogged(s.ppapPackages, id, { status: 'approved' }, 'approved'),
          parts: s.parts.map((part) => {
            const pkg = (s.ppapPackages || []).find((row) => row.id === id)
            if (!pkg || part.id !== pkg.partId) return part
            return logPatch(part, { ppapStatus: 'approved' }, 'ppap_approved')
          }),
        }))
      },

      addChange: (patch = {}) => {
        const row = stamp(withCreateLog({
          id: newId('ecn'),
          number: patch.number || `ECN-${Date.now().toString(36).toUpperCase()}`,
          title: patch.title || 'Process / product change',
          partId: patch.partId || '',
          processId: patch.processId || '',
          reason: patch.reason || '',
          impacts: Array.isArray(patch.impacts) ? patch.impacts : [],
          status: 'draft',
          flaggedDocIds: [],
          approvedBy: '',
          approvedAt: '',
        }, 'Created change request'))
        set((s) => ({ changes: [row, ...(s.changes || [])] }))
        return row
      },

      updateChange: (id, patch = {}, meta = {}) => {
        set((s) => ({
          changes: mapLogged(s.changes, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      approveChange: (id) => {
        const change = (get().changes || []).find((row) => row.id === id)
        if (!change) return
        const now = new Date().toISOString()
        const types = new Set((change.impacts || []).map((key) => IMPACT_DOC_TYPE[key]).filter(Boolean))
        const flaggedDocIds = get().documents
          .filter((doc) => (
            change.partId
            && doc.partId === change.partId
            && types.has(doc.type)
            && doc.status === 'approved'
          ))
          .map((doc) => doc.id)
        const reopenPpap = (change.impacts || []).includes('ppap') && Boolean(change.partId)
        set((s) => ({
          changes: mapLogged(
            s.changes,
            id,
            { status: 'approved', approvedBy: getUserId(), approvedAt: now, flaggedDocIds },
            'approved',
            change.reason,
          ),
          documents: s.documents.map((doc) => {
            if (!flaggedDocIds.includes(doc.id)) return doc
            if (doc.type === 'work_instruction') {
              return logPatch(doc, {
                status: 'obsolete',
                changeFlag: change.number || change.id,
                supersededBy: '',
              }, 'obsoleted', change.reason)
            }
            return logPatch(doc, { changeFlag: change.number || change.id }, 'flagged', change.reason)
          }),
          parts: reopenPpap
            ? s.parts.map((part) => (
              part.id === change.partId && part.ppapStatus === 'approved'
                ? logPatch(part, { ppapStatus: 'in_progress' }, 'ppap_reopened', change.reason)
                : part
            ))
            : s.parts,
          ppapPackages: reopenPpap
            ? (s.ppapPackages || []).map((pkg) => (
              pkg.partId === change.partId && pkg.status === 'approved'
                ? logPatch(pkg, { status: 'in_progress' }, 'reopened', change.reason)
                : pkg
            ))
            : (s.ppapPackages || []),
        }))
      },

      closeChange: (id) => {
        set((s) => ({
          changes: mapLogged(s.changes, id, { status: 'closed' }, 'closed'),
        }))
      },

      addGauge: (patch = {}) => {
        const row = stamp(withCreateLog({
          id: newId('gag'),
          assetNumber: patch.assetNumber || `G-${Date.now().toString(36).toUpperCase()}`,
          name: patch.name || 'Gauge',
          location: patch.location || '',
          calibrationDue: patch.calibrationDue || '',
          status: patch.status || 'ok',
          msaRecordId: patch.msaRecordId || '',
          partId: patch.partId || '',
        }, 'Created gauge'))
        set((s) => ({ gauges: [row, ...(s.gauges || [])] }))
        return row
      },

      updateGauge: (id, patch = {}, meta = {}) => {
        set((s) => ({
          gauges: mapLogged(s.gauges, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      deleteGauge: (id) => {
        set((s) => ({ gauges: (s.gauges || []).filter((row) => row.id !== id) }))
      },

      addAward: (patch = {}) => {
        const existing = (get().awards || []).find((row) => row.rfqId && row.rfqId === patch.rfqId && row.projectId)
        if (existing) return existing
        const row = stamp(withCreateLog({
          id: newId('awd'),
          rfqId: patch.rfqId || '',
          sellerId: patch.sellerId || '',
          sellerName: patch.sellerName || '',
          projectId: patch.projectId || '',
          partId: patch.partId || '',
          title: patch.title || '',
          buyerRef: patch.buyerRef || '',
          price: Number(patch.price) || 0,
          awardedAt: patch.awardedAt || new Date().toISOString(),
          opportunityId: patch.opportunityId || '',
          quotationId: patch.quotationId || '',
          poId: patch.poId || '',
          contractId: patch.contractId || '',
        }, 'Bound award'))
        set((s) => ({ awards: [row, ...(s.awards || [])] }))
        return row
      },

      updateAward: (id, patch = {}, meta = {}) => {
        set((s) => ({
          awards: mapLogged(s.awards, id, patch, meta.action || 'updated', meta.reason),
        }))
      },

      renameDepartment: (from, to, meta = {}) => {
        const next = String(to || '').trim()
        const prev = String(from || '').trim()
        if (!next || !prev || next === prev) return
        const move = (row) => (
          row.department === prev
            ? logPatch(row, { department: next }, 'moved', meta.reason || `Department renamed ${prev} → ${next}`)
            : row
        )
        set((s) => ({
          documents: s.documents.map(move),
          lots: s.lots.map(move),
          ncrs: (s.ncrs || []).map(move),
        }))
      },
    }),
    {
      name: 'strefex-iatf-control',
      storage: createTenantStorage(),
      partialize: (state) => ({
        folders: state.folders,
        plantIndustry: state.plantIndustry,
        processes: state.processes,
        parts: state.parts,
        documents: state.documents,
        lots: state.lots,
        ncrs: state.ncrs,
        certificates: state.certificates,
        ppapPackages: state.ppapPackages,
        changes: state.changes,
        gauges: state.gauges,
        awards: state.awards,
        share: state.share,
        publishedCard: state.publishedCard,
      }),
      version: 2,
      migrate: (state, fromVersion) => {
        const st = { ...state }
        if (fromVersion < 2) {
          st.folders = ensureSeedFolders(st.folders || [], st.plantIndustry || 'general')
          st.documents = migrateDocumentsToFolders(st.documents || [], st.folders)
        }
        if (!st.plantIndustry) st.plantIndustry = 'general'
        return st
      },
    },
  ),
)

export default useIatfControlStore
