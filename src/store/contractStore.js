/**
 * Contract Store — Contract tracking, renewal alerts, lifecycle management
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole } from '../utils/tenantStorage'
import { filterByCompanyRole, canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'

/* Seed data removed for production — contracts start empty */

const CONTRACT_TYPES = ['supply', 'service', 'framework', 'nda', 'license', 'lease', 'consulting', 'other']
const CONTRACT_STATUSES = ['draft', 'pending_approval', 'active', 'expiring_soon', 'expired', 'terminated', 'renewed']

const useContractStore = create(
  persist(
    (set, get) => ({
      contracts: [],

      getSafeContracts: () => filterByCompanyRole(get().contracts, { creatorField: '_createdBy' }),
      canEditContract: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),

      getAll: () => get().contracts,
      getById: (id) => get().contracts.find((c) => c.id === id),
      getByStatus: (status) => get().contracts.filter((c) => c.status === status),
      getByVendor: (vendorId) => get().contracts.filter((c) => c.vendorId === vendorId),

      getExpiringContracts: (daysAhead = 90) => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() + daysAhead)
        return get().contracts.filter((c) => {
          if (c.status === 'terminated' || c.status === 'expired') return false
          return new Date(c.endDate) <= cutoff
        })
      },

      getAlerts: () => {
        const now = new Date()
        const alerts = []
        get().contracts.forEach((c) => {
          if (c.status === 'terminated') return
          const endDate = new Date(c.endDate)
          const renewalDate = c.renewalDate ? new Date(c.renewalDate) : null
          const daysToEnd = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
          const daysToRenewal = renewalDate ? Math.ceil((renewalDate - now) / (1000 * 60 * 60 * 24)) : null

          if (daysToEnd < 0) {
            alerts.push({ contractId: c.id, type: 'expired', severity: 'critical', message: `${c.title} expired ${Math.abs(daysToEnd)} days ago`, date: c.endDate })
          } else if (daysToEnd <= 30) {
            alerts.push({ contractId: c.id, type: 'expiring', severity: 'high', message: `${c.title} expires in ${daysToEnd} days`, date: c.endDate })
          } else if (daysToEnd <= 90) {
            alerts.push({ contractId: c.id, type: 'expiring_soon', severity: 'medium', message: `${c.title} expires in ${daysToEnd} days`, date: c.endDate })
          }
          if (daysToRenewal !== null && daysToRenewal <= 0 && daysToEnd > 0) {
            alerts.push({ contractId: c.id, type: 'renewal_overdue', severity: 'high', message: `Renewal decision overdue for ${c.title}`, date: c.renewalDate })
          } else if (daysToRenewal !== null && daysToRenewal <= 30 && daysToRenewal > 0) {
            alerts.push({ contractId: c.id, type: 'renewal_upcoming', severity: 'medium', message: `Renewal decision due in ${daysToRenewal} days for ${c.title}`, date: c.renewalDate })
          }
          c.milestones?.forEach((m) => {
            if (m.status === 'pending') {
              const daysToMs = Math.ceil((new Date(m.date) - now) / (1000 * 60 * 60 * 24))
              if (daysToMs <= 14 && daysToMs >= -7) {
                alerts.push({ contractId: c.id, type: 'milestone', severity: daysToMs < 0 ? 'high' : 'low', message: `${m.title} for ${c.title} ${daysToMs < 0 ? 'was ' + Math.abs(daysToMs) + ' days ago' : 'in ' + daysToMs + ' days'}`, date: m.date })
              }
            }
          })
        })
        return alerts.sort((a, b) => {
          const sev = { critical: 0, high: 1, medium: 2, low: 3 }
          return (sev[a.severity] || 4) - (sev[b.severity] || 4)
        })
      },

      stats: () => {
        const all = get().contracts
        const now = new Date()
        return {
          total: all.length,
          active: all.filter((c) => c.status === 'active').length,
          expiringSoon: all.filter((c) => c.status === 'expiring_soon' || (new Date(c.endDate) - now) / 86400000 <= 90).length,
          expired: all.filter((c) => c.status === 'expired').length,
          totalValue: all.filter((c) => c.status === 'active' || c.status === 'expiring_soon').reduce((s, c) => s + c.value, 0),
          byType: CONTRACT_TYPES.reduce((acc, t) => { acc[t] = all.filter((c) => c.type === t).length; return acc }, {}),
        }
      },

      addContract: (data) => {
        const contract = {
          id: `CTR-2026-${String(get().contracts.length + 6).padStart(3, '0')}`,
          ...data,
          _createdBy: getUserId(),
          status: data.status || 'draft',
          documents: data.documents || [],
          milestones: data.milestones || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({ contracts: [contract, ...s.contracts] }))
        return contract.id
      },

      updateContract: (id, data) =>
        set((s) => ({
          contracts: s.contracts.map((c) => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c),
        })),

      renewContract: (id) => {
        const old = get().getById(id)
        if (!old) return null
        const endDate = new Date(old.endDate)
        const newStart = new Date(endDate)
        newStart.setDate(newStart.getDate() + 1)
        const newEnd = new Date(newStart)
        newEnd.setMonth(newEnd.getMonth() + (old.renewalTermMonths || 12))
        const newRenewal = new Date(newEnd)
        newRenewal.setMonth(newRenewal.getMonth() - 3)
        const newContract = {
          ...old,
          id: `CTR-2026-${String(get().contracts.length + 6).padStart(3, '0')}`,
          startDate: newStart.toISOString().slice(0, 10),
          endDate: newEnd.toISOString().slice(0, 10),
          renewalDate: newRenewal.toISOString().slice(0, 10),
          status: 'active',
          milestones: [{ id: `ms-${Date.now()}`, title: 'New Term Start', date: newStart.toISOString().slice(0, 10), status: 'completed' }],
          documents: [],
          notes: `Renewed from ${old.id}. ${old.notes || ''}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set((s) => ({
          contracts: [newContract, ...s.contracts.map((c) => c.id === id ? { ...c, status: 'renewed', updatedAt: new Date().toISOString() } : c)],
        }))
        return newContract.id
      },

      terminateContract: (id, reason) =>
        set((s) => ({
          contracts: s.contracts.map((c) =>
            c.id === id ? { ...c, status: 'terminated', notes: `${c.notes}\n\nTerminated: ${reason}`, updatedAt: new Date().toISOString() } : c
          ),
        })),
    }),
    { name: 'strefex-contracts', storage: createTenantStorage() }
  )
)

export { CONTRACT_TYPES, CONTRACT_STATUSES }
export default useContractStore
