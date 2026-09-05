import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId } from '../utils/tenantStorage'
import { filterStandardForIndustry } from '../utils/buyerSourcingReliability'

function newId() {
  return `evreq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

const useEvidenceRequestStore = create(
  persist(
    (set, get) => ({
      requests: [],

      createRequest: ({
        supplierId = '',
        supplierName = '',
        industryId = 'general',
        standardId = '',
        standardLabel = '',
        note = '',
        dueDays = 14,
        buyerCompany = '',
        buyerEmail = '',
      } = {}) => {
        const standard = standardLabel
          || filterStandardForIndustry(industryId)?.label
          || standardId
          || 'Quality evidence'
        const due = new Date()
        due.setDate(due.getDate() + Number(dueDays || 14))
        const row = {
          id: newId(),
          supplierId: String(supplierId || ''),
          supplierName: String(supplierName || 'Supplier'),
          industryId,
          standardId: standardId || filterStandardForIndustry(industryId)?.id || '',
          standardLabel: standard,
          note: String(note || '').trim(),
          status: 'open',
          buyerCompany: buyerCompany || '',
          buyerEmail: buyerEmail || getUserId() || '',
          dueDate: due.toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          fulfilledAt: null,
        }
        set((s) => ({ requests: [row, ...(s.requests || [])] }))
        return row
      },

      markFulfilled: (id) => {
        const now = new Date().toISOString()
        set((s) => ({
          requests: (s.requests || []).map((row) => (
            row.id === id
              ? { ...row, status: 'fulfilled', fulfilledAt: now, updatedAt: now }
              : row
          )),
        }))
      },

      markDeclined: (id, reason = '') => {
        const now = new Date().toISOString()
        set((s) => ({
          requests: (s.requests || []).map((row) => (
            row.id === id
              ? { ...row, status: 'declined', declineReason: reason, updatedAt: now }
              : row
          )),
        }))
      },

      listBuyerRequests: () => (get().requests || []),

      listOpenForSupplier: (supplierId = '') => {
        const sid = String(supplierId || '')
        return (get().requests || []).filter((row) => (
          row.status === 'open' && (!sid || row.supplierId === sid)
        ))
      },

      hasOpenRequest: (supplierId, standardId) => {
        const sid = String(supplierId || '')
        const std = String(standardId || '')
        return (get().requests || []).some((row) => (
          row.status === 'open'
          && row.supplierId === sid
          && (!std || row.standardId === std)
        ))
      },

      openCount: () => (get().requests || []).filter((row) => row.status === 'open').length,
    }),
    {
      name: 'strefex-evidence-requests',
      storage: createTenantStorage(),
      partialize: (state) => ({ requests: state.requests }),
    },
  ),
)

export default useEvidenceRequestStore
