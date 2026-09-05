import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage } from '../utils/tenantStorage'

export const WORKSPACE_MODES = [
  { id: 'marketplace', label: 'Network', hint: 'Find plants, issue RFQs, and answer buyer requests.' },
  { id: 'company', label: 'Company', hint: 'Plant records, people, purchasing, and IATF control.' },
]

export function defaultModeForAccount(accountType) {
  if (accountType === 'seller' || accountType === 'service_provider') return 'company'
  return 'marketplace'
}

export function availableWorkspaceModes(accountTypes = [], { isSuperAdmin } = {}) {
  if (isSuperAdmin) return ['marketplace', 'company']
  const types = (Array.isArray(accountTypes) ? accountTypes : [accountTypes]).filter(Boolean)
  const modes = []
  if (types.some((type) => type === 'buyer' || type === 'seller')) modes.push('marketplace')
  if (types.some((type) => type === 'buyer' || type === 'seller' || type === 'service_provider')) {
    modes.push('company')
  }
  if (!modes.length) return ['marketplace', 'company']
  return modes
}

const useWorkspaceModeStore = create(
  persist(
    (set, get) => ({
      mode: null,
      setMode: (mode) => {
        if (mode !== 'marketplace' && mode !== 'company') return
        set({ mode })
      },
      resolveMode: (accountType) => get().mode || defaultModeForAccount(accountType),
    }),
    {
      name: 'strefex-workspace-mode',
      storage: createTenantStorage(),
      partialize: (state) => ({ mode: state.mode }),
    },
  ),
)

export default useWorkspaceModeStore
