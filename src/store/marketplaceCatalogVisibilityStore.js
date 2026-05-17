/**
 * Tenant preference for superadmins: include seeded marketplace catalog suppliers (`source: database`)
 * in executive summaries and industry lists. Non-superadmin sessions ignore this — they only see vendor master,
 * audit registry, B2B directory, corpus, and signups.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage } from '../utils/tenantStorage'

export const useMarketplaceCatalogVisibilityStore = create(
  persist(
    (set, get) => ({
      showMarketplaceCatalog: true,
      setShowMarketplaceCatalog: (v) => set({ showMarketplaceCatalog: !!v }),
      toggleMarketplaceCatalog: () => set({ showMarketplaceCatalog: !get().showMarketplaceCatalog }),
    }),
    {
      name: 'strefex-marketplace-catalog-visibility',
      storage: createTenantStorage(),
      partialize: (s) => ({ showMarketplaceCatalog: s.showMarketplaceCatalog }),
    },
  ),
)
