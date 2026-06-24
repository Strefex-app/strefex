/**
 * Procurement Store — Purchase Requisitions (PR) & Purchase Orders (PO)
 * Multi-level approval workflows: Requester → Manager → Admin → (Platform)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole, tenantKey } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, isAuditor as guardIsAuditor } from '../utils/companyGuard'
import {
  currentYear,
  formatOpportunityNumber,
  formatRfqNumber,
  formatQuotationNumber,
  formatPONumber,
  nextSeqFromNumbers,
  opportunityNumberPattern,
  rfqNumberPattern,
  quotationNumberPattern,
  poNumberPattern,
} from '../utils/pmNumbering'
import { useProjectStore } from './projectStore'
import { useProgramStore } from './programStore'
import { devWarn } from '../utils/devLog'
import { ensureVendorFromProcurement } from '../utils/vendorLinkage'

function syncProcurementCloudNow() {
  if (typeof window === 'undefined') return
  import('../services/workspaceCloudSync').then((m) => {
    if (typeof m.notifyWorkspaceKeyDirty === 'function') {
      m.notifyWorkspaceKeyDirty('procurement', true)
    }
  }).catch((err) => devWarn('procurement sync notify skipped', err))
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const APPROVAL_LEVELS = ['requester', 'manager', 'admin', 'finance']

/**
 * Filter PRs/POs by the current user's role within the company.
 * Data is already company-scoped via createTenantStorage,
 * this adds WITHIN-COMPANY role-based filtering:
 *   - admin/superadmin: sees all company data
 *   - manager: sees all + can approve
 *   - user: sees only their own PRs/POs
 */
function filterByRole(items) {
  const role = getUserRole()
  if (role === 'superadmin' || role === 'auditor_external' || role === 'admin' || role === 'auditor_internal' || role === 'manager') return items
  const userId = getUserId()
  return items.filter((item) =>
    (item._createdBy || '').toLowerCase() === userId ||
    (item.requester || '').toLowerCase().includes(userId.split('@')[0])
  )
}

/* Seed data removed for production — PRs and POs start empty */

function resolveProjectContext(projectId, overrides = {}) {
  if (!projectId) return { ...overrides }
  const project = useProjectStore.getState().getProjectById(projectId)
  if (!project) return { ...overrides }
  const program = project.programId
    ? useProgramStore.getState().getProgramById(project.programId)
    : null
  return {
    projectId,
    projectNumber: overrides.projectNumber || project.projectNumber || '',
    programId: overrides.programId || project.programId || null,
    programNumber: overrides.programNumber || program?.programNumber || '',
    currency: overrides.currency || project.currency || 'USD',
  }
}

function allocateNextPONumber(purchaseOrders) {
  const year = currentYear()
  const seq = nextSeqFromNumbers(purchaseOrders, poNumberPattern, year, 'id')
  return formatPONumber(year, seq)
}

const useProcurementStore = create(
  persist(
    (set, get) => ({
      requisitions: [],
      purchaseOrders: [],
      opportunities: [],
      quotations: [],

      getOpportunityById: (id) => get().opportunities.find((o) => o.id === id),
      getQuotationById: (id) => get().quotations.find((q) => q.id === id),

      updateQuotation: (quotationId, updates) => {
        set((s) => ({
          quotations: s.quotations.map((q) =>
            q.id === quotationId ? { ...q, ...updates } : q,
          ),
        }))
        syncProcurementCloudNow()
      },

      updateOpportunity: (opportunityId, updates) => {
        set((s) => ({
          opportunities: s.opportunities.map((o) =>
            o.id === opportunityId ? { ...o, ...updates } : o,
          ),
        }))
        syncProcurementCloudNow()
      },

      updatePurchaseOrder: (poId, updates) => {
        set((s) => ({
          purchaseOrders: s.purchaseOrders.map((po) =>
            po.id === poId ? { ...po, ...updates, updatedAt: new Date().toISOString() } : po,
          ),
        }))
        syncProcurementCloudNow()
      },
      getOpportunitiesForProject: (projectId) =>
        get().opportunities.filter((o) => o.projectId === projectId),
      getQuotationsForProject: (projectId) =>
        get().quotations.filter((q) => q.projectId === projectId),

      getCommittedForProject: (projectId) => {
        const signedQuotes = get().quotations.filter(
          (q) => q.projectId === projectId && q.status === 'signed' && !q.linkedPOId,
        )
        const openPOs = get().purchaseOrders.filter(
          (po) =>
            po.projectId === projectId &&
            po.status !== 'rejected' &&
            po.status !== 'draft',
        )
        const quoteSum = signedQuotes.reduce((s, q) => s + (q.amount || 0), 0)
        const poSum = openPOs.reduce((s, po) => s + (po.totalAmount || 0), 0)
        return {
          quoteSum,
          poSum,
          total: quoteSum + poSum,
          signedQuotes,
          openPOs,
        }
      },
      getAllPRs: () => get().requisitions,
      getAllPOs: () => get().purchaseOrders,
      getPRById: (id) => get().requisitions.find((r) => r.id === id),
      getPOById: (id) => get().purchaseOrders.find((o) => o.id === id),

      getPRsByStatus: (status) => get().requisitions.filter((r) => r.status === status),
      getPOsByStatus: (status) => get().purchaseOrders.filter((o) => o.status === status),

      getPendingApprovals: (approverRole) => {
        const all = [...get().requisitions, ...get().purchaseOrders]
        return all.filter((item) => {
          const pending = item.approvalChain?.find((a) => a.status === 'pending')
          return pending && pending.level === approverRole
        })
      },

      stats: () => {
        const prs = get().requisitions
        const pos = get().purchaseOrders
        return {
          totalPRs: prs.length,
          pendingPRs: prs.filter((r) => r.status.startsWith('pending')).length,
          approvedPRs: prs.filter((r) => r.status === 'approved').length,
          rejectedPRs: prs.filter((r) => r.status === 'rejected').length,
          draftPRs: prs.filter((r) => r.status === 'draft').length,
          totalPOs: pos.length,
          pendingPOs: pos.filter((o) => o.status.startsWith('pending')).length,
          approvedPOs: pos.filter((o) => o.status === 'approved' || o.status === 'completed').length,
          totalSpend: pos.filter((o) => o.status === 'approved' || o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0),
          avgProcessingDays: 3.2,
        }
      },

      canEditProcurement: () => guardCanEdit(),
      isReadOnly: () => guardIsAuditor(),

      /** SAFE — returns only PRs the current user is allowed to see. */
      getSafeRequisitions: () => filterByRole(get().requisitions),
      /** SAFE — returns only POs the current user is allowed to see. */
      getSafePurchaseOrders: () => filterByRole(get().purchaseOrders),
      /** SAFE — stats based on what the user can see. */
      safeStats: () => {
        const prs = filterByRole(get().requisitions)
        const pos = filterByRole(get().purchaseOrders)
        return {
          totalPRs: prs.length,
          pendingPRs: prs.filter((r) => r.status.startsWith('pending')).length,
          approvedPRs: prs.filter((r) => r.status === 'approved').length,
          rejectedPRs: prs.filter((r) => r.status === 'rejected').length,
          draftPRs: prs.filter((r) => r.status === 'draft').length,
          totalPOs: pos.length,
          pendingPOs: pos.filter((o) => o.status.startsWith('pending')).length,
          approvedPOs: pos.filter((o) => o.status === 'approved' || o.status === 'completed').length,
          totalSpend: pos.filter((o) => o.status === 'approved' || o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0),
          avgProcessingDays: 3.2,
        }
      },

      /* ── Opportunity / Quotation (Phase 1) ─── */
      createOpportunity: (data) => {
        const ctx = resolveProjectContext(data.projectId, data)
        const year = currentYear()
        const seq = nextSeqFromNumbers(get().opportunities, opportunityNumberPattern, year, 'opportunityNumber')
        const rfqSeq = nextSeqFromNumbers(get().opportunities, rfqNumberPattern, year, 'rfqNumber')
        const opportunityNumber = formatOpportunityNumber(year, seq)
        const rfqNumber = formatRfqNumber(year, rfqSeq)
        const opp = {
          id: `opp-${Date.now()}`,
          opportunityNumber,
          rfqNumber,
          projectId: ctx.projectId || null,
          projectNumber: ctx.projectNumber || '',
          programId: ctx.programId || null,
          programNumber: ctx.programNumber || '',
          title: data.title || 'New RFQ',
          description: data.description || '',
          category: data.category || '',
          estimatedValue: data.estimatedValue ?? 0,
          currency: ctx.currency || data.currency || 'USD',
          status: 'open',
          quotationIds: [],
          createdAt: new Date().toISOString(),
          _createdBy: getUserId(),
        }
        set((s) => ({ opportunities: [opp, ...s.opportunities] }))
        if (ctx.projectId) {
          useProjectStore.getState().appendProjectLink(ctx.projectId, 'opportunityIds', opp.id)
        }
        syncProcurementCloudNow()
        return opp.id
      },

      addQuotation: (opportunityId, data) => {
        const opp = get().getOpportunityById(opportunityId)
        if (!opp) return null
        const year = currentYear()
        const seq = nextSeqFromNumbers(get().quotations, quotationNumberPattern, year, 'quotationNumber')
        const quo = {
          id: `quo-${Date.now()}`,
          quotationNumber: formatQuotationNumber(year, seq),
          opportunityId,
          opportunityNumber: opp.opportunityNumber || '',
          projectId: opp.projectId,
          projectNumber: opp.projectNumber,
          programId: opp.programId,
          programNumber: opp.programNumber || '',
          vendor: data.vendor || '',
          vendorId: data.vendorId || '',
          vendorNumber: data.vendorNumber || '',
          supplierQuotationRef: data.supplierQuotationRef || '',
          amount: data.amount ?? 0,
          currency: data.currency || opp.currency || 'USD',
          status: data.status || 'received',
          signedAt: null,
          signedBy: '',
          linkedPOId: null,
          linkedContractId: null,
          attachments: data.attachments || [],
          createdAt: new Date().toISOString(),
          _createdBy: getUserId(),
        }

        if (quo.vendor) {
          const vendorLink = ensureVendorFromProcurement(quo.vendor, {
            source: 'procurement',
            refType: 'quotation',
            refId: quo.id,
            refLabel: quo.quotationNumber,
            projectId: opp.projectId,
            programId: opp.programId,
          })
          if (vendorLink) {
            quo.vendorId = vendorLink.vendorId
            quo.vendorNumber = vendorLink.vendorNumber
            quo.vendor = vendorLink.vendorName
          }
        }
        set((s) => ({
          quotations: [quo, ...s.quotations],
          opportunities: s.opportunities.map((o) =>
            o.id === opportunityId
              ? { ...o, quotationIds: [...(o.quotationIds || []), quo.id] }
              : o,
          ),
        }))
        if (opp.projectId) {
          useProjectStore.getState().appendProjectLink(opp.projectId, 'quotationIds', quo.id)
        }
        syncProcurementCloudNow()
        return quo.id
      },

      signQuotation: (quotationId, signedBy = '') => {
        const q = get().getQuotationById(quotationId)
        if (!q || q.status === 'signed') return false
        const now = new Date().toISOString()
        set((s) => ({
          quotations: s.quotations.map((row) =>
            row.id === quotationId
              ? { ...row, status: 'signed', signedAt: now, signedBy: signedBy || getUserId() }
              : row,
          ),
        }))
        syncProcurementCloudNow()
        return true
      },

      createPOFromQuotation: (quotationId) => {
        const q = get().getQuotationById(quotationId)
        if (!q || q.status !== 'signed' || q.linkedPOId) return null
        const opp = get().getOpportunityById(q.opportunityId)
        const poId = allocateNextPONumber(get().purchaseOrders)
        let vendorId = q.vendorId || ''
        let vendorNumber = q.vendorNumber || ''
        if (q.vendor && !vendorId) {
          const vendorLink = ensureVendorFromProcurement(q.vendor, {
            source: 'procurement',
            refType: 'purchase_order',
            refId: poId,
            refLabel: poId,
            projectId: q.projectId,
            programId: q.programId,
          })
          if (vendorLink) {
            vendorId = vendorLink.vendorId
            vendorNumber = vendorLink.vendorNumber
          }
        }
        const po = {
          id: poId,
          type: 'po',
          title: `PO from ${q.quotationNumber}`,
          description: `Purchase order from signed quotation ${q.quotationNumber}${q.supplierQuotationRef ? ` (vendor ref ${q.supplierQuotationRef})` : ''}.`,
          requester: getUserId(),
          department: 'Procurement',
          category: 'General',
          priority: 'medium',
          currency: q.currency,
          items: [{
            id: `li-${Date.now()}`,
            description: q.vendor || 'Quoted items',
            qty: 1,
            unit: 'lot',
            unitPrice: q.amount,
            total: q.amount,
          }],
          totalAmount: q.amount,
          vendorId,
          vendorNumber,
          vendorName: q.vendor,
          projectId: q.projectId,
          projectNumber: q.projectNumber,
          programId: q.programId,
          programNumber: q.programNumber || '',
          opportunityId: q.opportunityId,
          opportunityNumber: q.opportunityNumber || opp?.opportunityNumber || '',
          quotationId: q.id,
          quotationNumber: q.quotationNumber,
          supplierQuotationRef: q.supplierQuotationRef || '',
          status: 'pending_manager',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          approvalChain: [
            { level: 'requester', approver: getUserId(), status: 'approved', date: new Date().toISOString(), notes: '' },
            { level: 'manager', approver: '', status: 'pending', date: '', notes: '' },
          ],
          linkedPRId: null,
          receivingStatus: 'not_received',
          receivedQty: 0,
          invoiceStatus: 'none',
          _createdBy: getUserId(),
        }
        set((s) => ({
          purchaseOrders: [po, ...s.purchaseOrders],
          quotations: s.quotations.map((row) =>
            row.id === quotationId ? { ...row, linkedPOId: poId } : row,
          ),
        }))
        if (q.projectId) {
          useProjectStore.getState().appendProjectLink(q.projectId, 'procurementIds', poId)
        }
        syncProcurementCloudNow()
        return poId
      },

      /* ── PR Actions ─────────────────────────── */
      createPR: (data) => {
        const pr = {
          id: `PR-2026-${String(get().requisitions.length + 5).padStart(4, '0')}`,
          type: 'pr', ...data,
          _createdBy: getUserId(),
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          approvalChain: [],
          linkedPOId: null,
        }
        set((s) => ({ requisitions: [pr, ...s.requisitions] }))
        return pr.id
      },

      submitPR: (id, requester) =>
        set((s) => ({
          requisitions: s.requisitions.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'pending_manager',
                  updatedAt: new Date().toISOString(),
                  approvalChain: [
                    { level: 'requester', approver: requester, status: 'approved', date: new Date().toISOString(), notes: '' },
                    { level: 'manager', approver: '', status: 'pending', date: '', notes: '' },
                  ],
                }
              : r
          ),
        })),

      approvePR: (id, level, approver, notes) =>
        set((s) => ({
          requisitions: s.requisitions.map((r) => {
            if (r.id !== id) return r
            const chain = r.approvalChain.map((a) =>
              a.level === level && a.status === 'pending'
                ? { ...a, approver, status: 'approved', date: new Date().toISOString(), notes: notes || '' }
                : a
            )
            const nextLevel = APPROVAL_LEVELS[APPROVAL_LEVELS.indexOf(level) + 1]
            const needsMore = nextLevel && level !== 'admin'
            if (needsMore) {
              chain.push({ level: nextLevel, approver: '', status: 'pending', date: '', notes: '' })
            }
            return {
              ...r,
              approvalChain: chain,
              status: needsMore ? `pending_${nextLevel}` : 'approved',
              updatedAt: new Date().toISOString(),
            }
          }),
        })),

      rejectPR: (id, level, approver, notes) =>
        set((s) => ({
          requisitions: s.requisitions.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: 'rejected',
                  updatedAt: new Date().toISOString(),
                  approvalChain: r.approvalChain.map((a) =>
                    a.level === level && a.status === 'pending'
                      ? { ...a, approver, status: 'rejected', date: new Date().toISOString(), notes: notes || '' }
                      : a
                  ),
                }
              : r
          ),
        })),

      /* ── PO Actions ─────────────────────────── */
      createPOFromPR: (prId) => {
        const pr = get().getPRById(prId)
        if (!pr || pr.status !== 'approved') return null
        const poId = allocateNextPONumber(get().purchaseOrders)
        const po = {
          id: poId, type: 'po', title: pr.title,
          description: `Purchase order from approved ${prId}.`,
          requester: pr.requester, department: pr.department, category: pr.category,
          priority: pr.priority, currency: pr.currency,
          items: pr.items, totalAmount: pr.totalAmount,
          vendorId: pr.vendorId, vendorName: pr.vendorName,
          status: 'pending_manager',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          deliveryDate: '', paymentTerms: 'Net 30',
          approvalChain: [
            { level: 'requester', approver: pr.requester, status: 'approved', date: new Date().toISOString(), notes: '' },
            { level: 'manager', approver: '', status: 'pending', date: '', notes: '' },
          ],
          linkedPRId: prId,
          receivingStatus: 'not_received', receivedQty: 0, invoiceStatus: 'none',
        }
        set((s) => ({
          purchaseOrders: [po, ...s.purchaseOrders],
          requisitions: s.requisitions.map((r) => r.id === prId ? { ...r, linkedPOId: poId } : r),
        }))
        return poId
      },

      createPO: (data) => {
        const ctx = resolveProjectContext(data.projectId, data)
        const po = {
          id: allocateNextPONumber(get().purchaseOrders),
          type: 'po',
          ...data,
          ...ctx,
          _createdBy: getUserId(),
          status: 'pending_manager',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          approvalChain: [
            { level: 'requester', approver: data.requester || 'User', status: 'approved', date: new Date().toISOString(), notes: '' },
            { level: 'manager', approver: '', status: 'pending', date: '', notes: '' },
          ],
          linkedPRId: null, receivingStatus: 'not_received', receivedQty: 0, invoiceStatus: 'none',
        }
        set((s) => ({ purchaseOrders: [po, ...s.purchaseOrders] }))
        return po.id
      },

      approvePO: (id, level, approver, notes) =>
        set((s) => ({
          purchaseOrders: s.purchaseOrders.map((o) => {
            if (o.id !== id) return o
            const chain = o.approvalChain.map((a) =>
              a.level === level && a.status === 'pending'
                ? { ...a, approver, status: 'approved', date: new Date().toISOString(), notes: notes || '' }
                : a
            )
            const nextLevel = level === 'manager' ? 'finance' : null
            if (nextLevel) {
              chain.push({ level: nextLevel, approver: '', status: 'pending', date: '', notes: '' })
            }
            return {
              ...o, approvalChain: chain,
              status: nextLevel ? `pending_${nextLevel}` : 'approved',
              updatedAt: new Date().toISOString(),
            }
          }),
        })),

      rejectPO: (id, level, approver, notes) =>
        set((s) => ({
          purchaseOrders: s.purchaseOrders.map((o) =>
            o.id === id
              ? {
                  ...o, status: 'rejected', updatedAt: new Date().toISOString(),
                  approvalChain: o.approvalChain.map((a) =>
                    a.level === level && a.status === 'pending'
                      ? { ...a, approver, status: 'rejected', date: new Date().toISOString(), notes: notes || '' }
                      : a
                  ),
                }
              : o
          ),
        })),

      updatePOReceiving: (id, status, qty) =>
        set((s) => ({
          purchaseOrders: s.purchaseOrders.map((o) =>
            o.id === id ? { ...o, receivingStatus: status, receivedQty: qty, updatedAt: new Date().toISOString() } : o
          ),
        })),

      completePO: (id) =>
        set((s) => ({
          purchaseOrders: s.purchaseOrders.map((o) =>
            o.id === id ? { ...o, status: 'completed', invoiceStatus: 'paid', updatedAt: new Date().toISOString() } : o
          ),
        })),
    }),
    { name: 'strefex-procurement', storage: createTenantStorage() }
  )
)

if (typeof window !== 'undefined') {
  const starterMarkerKey = tenantKey('strefex-launch-starter-procurement-v1')
  if (!localStorage.getItem(starterMarkerKey)) {
    const state = useProcurementStore.getState()
    const hasPRs = Array.isArray(state.requisitions) && state.requisitions.length > 0
    const hasPOs = Array.isArray(state.purchaseOrders) && state.purchaseOrders.length > 0
    if (!hasPRs && !hasPOs) {
      const now = new Date().toISOString()
      useProcurementStore.setState({
        requisitions: [
          {
            id: 'PR-STARTER-0001',
            type: 'pr',
            title: 'Starter Requisition - Packaging Materials',
            description: 'Sample requisition for launch presentation.',
            requester: 'Admin',
            department: 'Procurement',
            category: 'Office Supplies',
            priority: 'medium',
            currency: 'USD',
            items: [{ id: 'li-starter-001', description: 'Packaging Box', qty: 100, unit: 'pcs', unitPrice: 2, total: 200 }],
            totalAmount: 200,
            vendorId: '',
            vendorName: 'Starter Vendor',
            _createdBy: getUserId(),
            status: 'approved',
            createdAt: now,
            updatedAt: now,
            approvalChain: [
              { level: 'requester', approver: 'Admin', status: 'approved', date: now, notes: '' },
              { level: 'manager', approver: 'Admin', status: 'approved', date: now, notes: '' },
            ],
            linkedPOId: 'PO-STARTER-0001',
          },
        ],
        purchaseOrders: [
          {
            id: 'PO-STARTER-0001',
            type: 'po',
            title: 'Starter Purchase Order',
            description: 'Sample PO for launch presentation.',
            requester: 'Admin',
            department: 'Procurement',
            category: 'Office Supplies',
            priority: 'medium',
            currency: 'USD',
            items: [{ id: 'li-starter-001', description: 'Packaging Box', qty: 100, unit: 'pcs', unitPrice: 2, total: 200 }],
            totalAmount: 200,
            vendorId: '',
            vendorName: 'Starter Vendor',
            status: 'approved',
            createdAt: now,
            updatedAt: now,
            deliveryDate: '',
            paymentTerms: 'Net 30',
            approvalChain: [
              { level: 'requester', approver: 'Admin', status: 'approved', date: now, notes: '' },
              { level: 'manager', approver: 'Admin', status: 'approved', date: now, notes: '' },
            ],
            linkedPRId: 'PR-STARTER-0001',
            receivingStatus: 'not_received',
            receivedQty: 0,
            invoiceStatus: 'none',
          },
        ],
      })
    }
    localStorage.setItem(starterMarkerKey, '1')
  }
}

export default useProcurementStore
