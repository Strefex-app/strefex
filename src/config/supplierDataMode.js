/**
 * Control legacy seeded supplier data (thousands of static "marketplace" companies in `supplierDatabase.js`
 * plus equipment/material demo rows). Production should rely on:
 * - Supabase (profiles, companies, directory tables)
 * - `useWorkspaceSellerCorpusStore` (tenant imports)
 * - `useAccountRegistry` (signed-up sellers / buyers / service providers)
 *
 * Opt in to the old seed for local demos only:
 *   VITE_SEED_SUPPLIER_DIRECTORY=true
 */
export function isSeededSupplierDirectoryEnabled() {
  return import.meta.env.VITE_SEED_SUPPLIER_DIRECTORY === 'true'
}
