/**
 * Legacy seeded supplier directory (`supplierDatabase.js`) is off unless explicitly enabled.
 * Intelligent Sourcing never shows canvas demo sellers — lists/indicators use registered
 * accounts from the platform registry / database only.
 */

export function isSeededSupplierDirectoryEnabled(env = import.meta.env) {
  return String(env.VITE_SEED_SUPPLIER_DIRECTORY || '').toLowerCase() === 'true'
}

/** @deprecated Sourcing demo seed is permanently disabled. */
export function isLocalhostTestingHost() {
  return false
}

/** Sourcing canvas / directory demo sellers are never shown. */
export function isSourcingDemoSeedAllowed() {
  return false
}
