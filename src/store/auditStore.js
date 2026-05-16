/**
 * Audit Store — System-wide audit log tracking for all platform actions.
 * Records: who, what, when, where (module), and details.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole, tenantKey } from '../utils/tenantStorage'
import { filterByCompanyRole, canEdit as guardCanEdit, isAuditor } from '../utils/companyGuard'

const MODULES = [
  'procurement',
  'vendor',
  'contract',
  'subscription',
  'team',
  'security',
  'compliance',
  'settings',
  'erp',
  'audit_management',
]
const SEVERITIES = ['info', 'warning', 'critical']

const useAuditStore = create(
  persist(
    (set, get) => ({
      logs: [],

      getSafeLogs: () => filterByCompanyRole(get().logs, { creatorField: '_createdBy' }),
      canEditAudit: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),
      getAccessLevel: () => getUserRole(),

      getAll: () => get().logs,
      getByModule: (module) => get().logs.filter((l) => l.module === module),
      getByUser: (user) => get().logs.filter((l) => l.user === user),
      getBySeverity: (severity) => get().logs.filter((l) => l.severity === severity),
      getByEntity: (entity) => get().logs.filter((l) => l.entity === entity),

      getRecent: (limit = 50) => get().logs.slice(0, limit),

      search: (query) => {
        const q = query.toLowerCase()
        return get().logs.filter((l) =>
          l.description.toLowerCase().includes(q) ||
          l.user.toLowerCase().includes(q) ||
          l.entity.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q)
        )
      },

      stats: () => {
        const logs = get().logs
        const today = new Date().toISOString().slice(0, 10)
        const todayLogs = logs.filter((l) => l.timestamp.startsWith(today))
        return {
          total: logs.length,
          today: todayLogs.length,
          critical: logs.filter((l) => l.severity === 'critical').length,
          warnings: logs.filter((l) => l.severity === 'warning').length,
          byModule: MODULES.reduce((acc, m) => { acc[m] = logs.filter((l) => l.module === m).length; return acc }, {}),
          uniqueUsers: [...new Set(logs.map((l) => l.user))].length,
        }
      },

      addLog: (log) => {
        const actor = getUserId()
        const entry = {
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: new Date().toISOString(),
          severity: 'info',
          _createdBy: actor,
          ...log,
          user: log?.user || actor,
        }
        set((s) => ({ logs: [entry, ...s.logs] }))
      },

      exportLogs: (filters) => {
        let result = get().logs
        if (filters?.module) result = result.filter((l) => l.module === filters.module)
        if (filters?.severity) result = result.filter((l) => l.severity === filters.severity)
        if (filters?.startDate) result = result.filter((l) => l.timestamp >= filters.startDate)
        if (filters?.endDate) result = result.filter((l) => l.timestamp <= filters.endDate)
        return result
      },

      clearOldLogs: (daysToKeep = 365) => {
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - daysToKeep)
        set((s) => ({ logs: s.logs.filter((l) => new Date(l.timestamp) >= cutoff) }))
      },
    }),
    { name: 'strefex-audit', storage: createTenantStorage() }
  )
)

export { MODULES, SEVERITIES }
export default useAuditStore

if (typeof window !== 'undefined') {
  const starterMarkerKey = tenantKey('strefex-launch-starter-audit-v1')
  if (!localStorage.getItem(starterMarkerKey)) {
    const state = useAuditStore.getState()
    if (!Array.isArray(state.logs) || state.logs.length === 0) {
      useAuditStore.setState({
        logs: [
          {
            id: 'aud-starter-001',
            timestamp: new Date().toISOString(),
            user: 'Admin',
            role: 'admin',
            module: 'settings',
            action: 'platform_initialized',
            entity: 'launch',
            description: 'Starter audit event for launch presentation.',
            details: {},
            severity: 'info',
            _createdBy: getUserId(),
          },
        ],
      })
    }
    localStorage.setItem(starterMarkerKey, '1')
  }
}
