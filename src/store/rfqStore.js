import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole } from '../utils/tenantStorage'
import { filterByCompanyRole, canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'
import { isSupabaseConfigured, rfqsService } from '../services/supabaseService'

const normalizeEmail = (value) => String(value || '').trim().toLowerCase()
const toArray = (value) => (Array.isArray(value) ? value : [])
const normalizeId = (value) => String(value || '').trim().toLowerCase()

const getAuthSnapshot = () => {
  try {
    return JSON.parse(localStorage.getItem('strefex-auth') || '{}')
  } catch {
    return {}
  }
}

const getAuthCompanyId = () => getAuthSnapshot()?.tenant?.id || null
const getAuthUserDbId = () => getAuthSnapshot()?.user?.id || null

function findAccountEmailById(accountId) {
  const targetId = normalizeId(accountId)
  if (!targetId) return ''
  try {
    const rows = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key === 'strefex-account-registry' || key.startsWith('strefex-account-registry::')) {
        const raw = localStorage.getItem(key)
        const parsed = raw ? JSON.parse(raw) : []
        if (Array.isArray(parsed)) rows.push(...parsed)
      }
    }
    const matched = rows.find((acct) => normalizeId(acct?.id) === targetId)
    return normalizeEmail(matched?.email)
  } catch {
    return ''
  }
}

function getSafeReceivedForCurrentUser(rows) {
  const role = getUserRole()
  const userId = normalizeEmail(getUserId())
  if (role === 'superadmin' || role === 'auditor_external') return rows
  if (role === 'admin' || role === 'auditor_internal') return rows
  return toArray(rows).filter((r) => {
    const sellerEmail = normalizeEmail(r?.sellerEmail)
    const sellerId = normalizeId(r?.sellerId)
    return (sellerEmail && sellerEmail === userId) || (sellerId && sellerId === userId)
  })
}

const toDbRfqPayload = (rfq) => ({
  company_id: getAuthCompanyId(),
  created_by: getAuthUserDbId(),
  title: rfq?.title || '',
  industry_id: rfq?.industryId || null,
  category_id: rfq?.categoryId || null,
  buyer_email: normalizeEmail(rfq?.buyerEmail || rfq?._createdBy),
  buyer_company: rfq?.buyerCompany || rfq?.companyName || null,
  due_date: rfq?.dueDate || null,
  status: rfq?.status || 'draft',
  suppliers: Array.isArray(rfq?.suppliers) ? rfq.suppliers : [],
  requirements: rfq?.requirements || {},
  attachments: Array.isArray(rfq?.attachments) ? rfq.attachments : [],
  responses: Array.isArray(rfq?.sellerResponses) ? rfq.sellerResponses : [],
  metadata: { local_id: rfq?.id || null, response_count: Number(rfq?.responses || 0) },
  sent_at: rfq?.sentAt || null,
  created_at: rfq?.createdAt || null,
  updated_at: new Date().toISOString(),
})

const persistRfqsToDatabase = async (rfqs) => {
  if (!isSupabaseConfigured) return
  const companyId = getAuthCompanyId()
  if (!companyId) return
  const rows = Array.isArray(rfqs) ? rfqs : []
  for (let i = 0; i < rows.length; i += 1) {
    const payload = toDbRfqPayload(rows[i])
    if (!payload.company_id) continue
    try {
      const existing = await rfqsService.list(companyId, {
        limit: 1,
        filters: [['metadata->>local_id', 'eq', String(rows[i]?.id || '')]],
      })
      const match = Array.isArray(existing) ? existing[0] : null
      if (match?.id) {
        await rfqsService.update(match.id, payload)
      } else {
        await rfqsService.create(payload)
      }
    } catch {
      // Keep local fallback behavior.
    }
  }
}

const useRfqStore = create(
  persist(
    (set, get) => ({
      rfqs: [],
      receivedRfqs: [],

      getSafeRfqs: () => filterByCompanyRole(get().rfqs, { creatorField: 'buyerEmail' }),
      getSafeReceivedRfqs: () => getSafeReceivedForCurrentUser(get().receivedRfqs),
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

      addRfq: (rfq) => {
        const created = {
          ...rfq,
          id: `rfq-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
          _createdBy: getUserId(),
          buyerEmail: normalizeEmail(rfq?.buyerEmail || getUserId()),
          status: 'draft',
          responses: 0,
          attachments: rfq.attachments || [],
          sellerResponses: [],
        }
        set((state) => ({
          rfqs: [...state.rfqs, created],
        }))
        void persistRfqsToDatabase([...get().rfqs, created])
        return created
      },

      updateRfq: (id, updates) => set((state) => {
        const rfqs = state.rfqs.map(rfq =>
          rfq.id === id ? { ...rfq, ...updates } : rfq
        )
        void persistRfqsToDatabase(rfqs)
        return { rfqs }
      }),

      sendRfq: (id) => set((state) => {
        const sentAt = new Date().toISOString().split('T')[0]
        const target = state.rfqs.find((rfq) => rfq.id === id)
        if (!target) return state

        const updatedRfqs = state.rfqs.map((rfq) =>
          rfq.id === id
            ? { ...rfq, status: 'sent', sentAt }
            : rfq
        )

        const invited = toArray(target.suppliers)
        const existingKeys = new Set(
          state.receivedRfqs.map((r) => `${r.rfqId || ''}::${String(r.sellerId || '').toLowerCase()}::${normalizeEmail(r.sellerEmail)}`)
        )
        const generatedReceived = invited.map((supplier, idx) => {
          if (typeof supplier === 'string') {
            const resolvedEmail = findAccountEmailById(supplier)
            return {
              id: `rrfq-${Date.now()}-${idx}`,
              rfqId: target.id,
              title: target.title,
              buyerCompany: target.buyerCompany || target.companyName || 'Buyer',
              buyerEmail: normalizeEmail(target.buyerEmail || target._createdBy),
              industryId: target.industryId,
              categoryId: target.categoryId,
              requirements: target.requirements || {},
              dueDate: target.dueDate || null,
              receivedAt: sentAt,
              status: 'pending',
              sellerId: supplier,
              sellerEmail: resolvedEmail,
            }
          }
          return {
            id: `rrfq-${Date.now()}-${idx}`,
            rfqId: target.id,
            title: target.title,
            buyerCompany: target.buyerCompany || target.companyName || 'Buyer',
            buyerEmail: normalizeEmail(target.buyerEmail || target._createdBy),
            industryId: target.industryId,
            categoryId: target.categoryId,
            requirements: target.requirements || {},
            dueDate: target.dueDate || null,
            receivedAt: sentAt,
            status: 'pending',
            sellerId: String(supplier?.id || supplier?.sellerId || ''),
            sellerEmail: normalizeEmail(supplier?.email || supplier?.sellerEmail),
          }
        })
        const receivedToAdd = generatedReceived.filter((r) => {
          const key = `${r.rfqId || ''}::${String(r.sellerId || '').toLowerCase()}::${normalizeEmail(r.sellerEmail)}`
          if (existingKeys.has(key)) return false
          existingKeys.add(key)
          return true
        })

        const next = {
          rfqs: updatedRfqs,
          receivedRfqs: [...state.receivedRfqs, ...receivedToAdd],
        }
        void persistRfqsToDatabase(next.rfqs)
        return next
      }),

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

      respondToRfq: (receivedRfqId, response) => set((state) => {
        const responderEmail = normalizeEmail(getUserId())
        const respondedAt = new Date().toISOString().split('T')[0]
        const target = state.receivedRfqs.find((r) => r.id === receivedRfqId)
        if (!target) return state

        const receivedRfqs = state.receivedRfqs.map((r) =>
          r.id === receivedRfqId
            ? {
                ...r,
                status: 'responded',
                sellerEmail: normalizeEmail(r.sellerEmail || responderEmail),
                myResponse: {
                  ...response,
                  respondedAt,
                },
              }
            : r
        )

        const rfqs = state.rfqs.map((rfq) => {
          if (rfq.id !== target.rfqId) return rfq
          const nextResponses = toArray(rfq.sellerResponses).filter((entry) => {
            const entryEmail = normalizeEmail(entry?.sellerEmail)
            if (entryEmail) return entryEmail !== responderEmail
            return String(entry?.sellerId || '') !== String(target.sellerId || '')
          })
          nextResponses.push({
            sellerId: target.sellerId || responderEmail,
            sellerName: target.sellerName || target.sellerCompany || target.sellerEmail || responderEmail || 'Seller',
            sellerEmail: normalizeEmail(target.sellerEmail || responderEmail),
            price: Number(response?.price || 0),
            leadTime: Number(response?.leadTime || 0),
            warranty: response?.warranty || '',
            notes: response?.notes || '',
            respondedAt,
          })
          return {
            ...rfq,
            status: rfq.status === 'draft' ? 'active' : rfq.status,
            sellerResponses: nextResponses,
            responses: nextResponses.length,
          }
        })

        void persistRfqsToDatabase(rfqs)
        return { receivedRfqs, rfqs }
      }),

      declineRfq: (receivedRfqId) => set((state) => {
        const declinerEmail = normalizeEmail(getUserId())
        const declinedAt = new Date().toISOString().split('T')[0]
        const target = state.receivedRfqs.find((r) => r.id === receivedRfqId)
        if (!target) return state
        const receivedRfqs = state.receivedRfqs.map((r) =>
          r.id === receivedRfqId ? { ...r, status: 'declined', sellerEmail: normalizeEmail(r.sellerEmail || declinerEmail), declinedAt } : r
        )
        const rfqs = state.rfqs.map((rfq) => {
          if (rfq.id !== target.rfqId) return rfq
          const nextResponses = toArray(rfq.sellerResponses).filter((entry) => {
            const entryEmail = normalizeEmail(entry?.sellerEmail)
            if (entryEmail) return entryEmail !== declinerEmail
            return String(entry?.sellerId || '') !== String(target.sellerId || '')
          })
          nextResponses.push({
            sellerId: target.sellerId || declinerEmail,
            sellerName: target.sellerName || target.sellerCompany || target.sellerEmail || declinerEmail || 'Seller',
            sellerEmail: normalizeEmail(target.sellerEmail || declinerEmail),
            status: 'declined',
            notes: 'Seller declined this RFQ.',
            respondedAt: declinedAt,
          })
          return {
            ...rfq,
            sellerResponses: nextResponses,
            responses: nextResponses.length,
          }
        })
        void persistRfqsToDatabase(rfqs)
        return { receivedRfqs, rfqs }
      }),
    }),
    {
      name: 'strefex-rfq-storage',
      storage: createTenantStorage(),
    }
  )
)

export default useRfqStore
