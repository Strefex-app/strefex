import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage } from '../utils/tenantStorage'

/**
 * Superadmin-only UI flag — when false (default), STREFEX demo-kit suppliers/auditors/audits stay out of Audit Pro listings.
 */
export const useAuditProDemoKitStore = create(
  persist(
    (set, get) => ({
      demoKitVisible: false,
      setDemoKitVisible: (v) => set({ demoKitVisible: !!v }),
      toggleDemoKit: () => set({ demoKitVisible: !get().demoKitVisible }),
    }),
    {
      name: 'strefex-audit-pro-demo-kit',
      storage: createTenantStorage(),
      partialize: (s) => ({ demoKitVisible: s.demoKitVisible }),
    },
  ),
)
