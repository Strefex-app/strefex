import { useAuthStore } from '../store/authStore'
import { useMarketplaceCatalogVisibilityStore } from '../store/marketplaceCatalogVisibilityStore'

/**
 * Seeded marketplace catalog (`source: database`) applies only when the user is **superadmin**
 * and has the visibility toggle on. Everyone else effectively sees only workspace/registry/corpus
 * data — e.g. vendor master and audit-management imports — not the static directory seed.
 */
export function useMarketplaceCatalogVisibilityEffective() {
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const storedShow = useMarketplaceCatalogVisibilityStore((s) => s.showMarketplaceCatalog)
  return Boolean(isSuperAdmin && storedShow)
}
