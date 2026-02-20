import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole } from '../utils/tenantStorage'
import { filterByCompanyRole, canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'

const useRfqStore = create(
  persist(
    (set, get) => ({
      rfqs: [],
      receivedRfqs: [],

      getSafeRfqs: () => filterByCompanyRole(get().rfqs, { creatorField: 'buyerEmail' }),
      getSafeReceivedRfqs: () => filterByCompanyRole(get().receivedRfqs, { creatorField: '_createdBy' }),
      canEditRfq: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),

      getAllRfqs: () => get().rfqs,

      getRfqsByIndustry: (industryId) => {
        if (!industryId) return get().rfqs
        return get().rfqs.filter(rfq => rfq.industryId === industryId)
      },

      getRfqStats: (industryId) => {
        const rfqs = industryId
          ? get().rfqs.filter(rfq => rfq.industryId === industryId)
          : get().rfqs

        return {
          total: rfqs.length,
          sent: rfqs.filter(r => r.status === 'sent' || r.status === 'active').length,
          active: rfqs.filter(r => r.status === 'active').length,
          draft: rfqs.filter(r => r.status === 'draft').length,
          completed: rfqs.filter(r => r.status === 'completed').length,
          responses: rfqs.reduce((sum, r) => sum + (r.responses || 0), 0),
        }
      },

      getRfqById: (id) => get().rfqs.find(r => r.id === id),

      getAllReceivedRfqs: () => get().receivedRfqs,

      getReceivedRfqStats: () => {
        const rcv = get().receivedRfqs
        return {
          total: rcv.length,
          pending: rcv.filter(r => r.status === 'pending').length,
          responded: rcv.filter(r => r.status === 'responded').length,
          awarded: rcv.filter(r => r.status === 'awarded').length,
          declined: rcv.filter(r => r.status === 'declined').length,
        }
      },

      addRfq: (rfq) => set((state) => ({
        rfqs: [
          ...state.rfqs,
          {
            ...rfq,
            id: `rfq-${Date.now()}`,
            createdAt: new Date().toISOString().split('T')[0],
            _createdBy: getUserId(),
            status: 'draft',
            responses: 0,
            attachments: rfq.attachments || [],
            sellerResponses: [],
          },
        ],
      })),

      updateRfq: (id, updates) => set((state) => ({
        rfqs: state.rfqs.map(rfq =>
          rfq.id === id ? { ...rfq, ...updates } : rfq
        ),
      })),

      sendRfq: (id) => set((state) => ({
        rfqs: state.rfqs.map(rfq =>
          rfq.id === id
            ? { ...rfq, status: 'sent', sentAt: new Date().toISOString().split('T')[0] }
            : rfq
        ),
      })),

      deleteRfq: (id) => set((state) => ({
        rfqs: state.rfqs.filter(rfq => rfq.id !== id),
      })),

      addAttachment: (rfqId, filename) => set((state) => ({
        rfqs: state.rfqs.map(rfq =>
          rfq.id === rfqId
            ? { ...rfq, attachments: [...(rfq.attachments || []), filename] }
            : rfq
        ),
      })),

      removeAttachment: (rfqId, filename) => set((state) => ({
        rfqs: state.rfqs.map(rfq =>
          rfq.id === rfqId
            ? { ...rfq, attachments: (rfq.attachments || []).filter(f => f !== filename) }
            : rfq
        ),
      })),

      respondToRfq: (receivedRfqId, response) => set((state) => ({
        receivedRfqs: state.receivedRfqs.map(r =>
          r.id === receivedRfqId
            ? {
                ...r,
                status: 'responded',
                myResponse: {
                  ...response,
                  respondedAt: new Date().toISOString().split('T')[0],
                },
              }
            : r
        ),
      })),

      declineRfq: (receivedRfqId) => set((state) => ({
        receivedRfqs: state.receivedRfqs.map(r =>
          r.id === receivedRfqId ? { ...r, status: 'declined' } : r
        ),
      })),
    }),
    {
      name: 'strefex-rfq-storage',
      storage: createTenantStorage(),
    }
  )
)

export default useRfqStore
