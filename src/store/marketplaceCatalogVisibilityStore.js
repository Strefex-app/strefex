/**
 * Tenant preference for superadmins: include seeded marketplace catalog suppliers (`source: database`)
 * in executive summaries and industry lists. Defaults **off** — only registered / corpus accounts show.
 * Non-superadmin sessions ignore this — they only see vendor master, audit registry, B2B directory,
 * corpus, and signups. Re-enable only for demos via the superadmin toggle or `VITE_SEED_SUPPLIER_DIRECTORY=true`.
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
