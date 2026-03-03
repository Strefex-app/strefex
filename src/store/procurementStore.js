/**
 * Procurement Store — Purchase Requisitions (PR) & Purchase Orders (PO)
 * Multi-level approval workflows: Requester → Manager → Admin → (Platform)
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole, tenantKey } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, isAuditor as guardIsAuditor } from '../utils/companyGuard'

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

const useProcurementStore = create(
  persist(
    (set, get) => ({
      requisitions: [],
      purchaseOrders: [],

      /* ── Getters ─────────────────────────────── */
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
        const poId = `PO-2026-${String(get().purchaseOrders.length + 4).padStart(4, '0')}`
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
        const po = {
          id: `PO-2026-${String(get().purchaseOrders.length + 4).padStart(4, '0')}`,
          type: 'po', ...data,
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
