/**
 * Tenant preference for superadmins: include seeded marketplace catalog suppliers (`source: database`)
 * and Intelligent Sourcing canvas demo sellers. Defaults **off** on live — only registered / corpus
 * accounts show. Re-enable for localhost testing or system-update demos via this toggle or
 * `VITE_SEED_SUPPLIER_DIRECTORY=true`.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage } from '../utils/tenantStorage'

export const useMarketplaceCatalogVisibilityStore = create(
  persist(
    (set, get) => ({
      showMarketplaceCatalog: false,
      setShowMarketplaceCatalog: (v) => set({ showMarketplaceCatalog: !!v }),
      toggleMarketplaceCatalog: () => set({ showMarketplaceCatalog: !get().showMarketplaceCatalog }),
    }),
    {
      name: 'strefex-marketplace-catalog-visibility-v2',
      storage: createTenantStorage(),
      partialize: (s) => ({ showMarketplaceCatalog: s.showMarketplaceCatalog }),
    },
  ),
)
