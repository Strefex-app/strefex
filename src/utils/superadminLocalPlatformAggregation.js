/**
 * Read tenant-scoped Zustand persist blobs from localStorage so platform superadmin
 * can review what other company workspaces stored (best-effort offline / demo; cloud remains canonical).
 */
const ZUSTAND = {
  workspaceSellerCorpus: 'strefex-workspace-seller-corpus',
  vendorMaster: 'strefex-vendor-master',
  auditPro: 'strefex-audit-pro-v2',
}

function parsePersistBlob(raw) {
  try {
    const p = JSON.parse(String(raw || '{}'))
    return p && typeof p.state === 'object' ? p.state : null
  } catch {
    return null
  }
}

function forEachTenantStore(storeName, fn) {
  if (typeof localStorage === 'undefined') return
  const prefix = `${storeName}::`
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(prefix)) continue
    const tenantId = key.slice(prefix.length)
    const state = parsePersistBlob(localStorage.getItem(key))
    if (state) fn({ tenantId, key, state })
  }
}

/**
 * Workspace seller / service_provider corpus entries from every tenant slice in this browser.
 * @returns {{ tenantId: string, account: object }[]}
 */
export function collectWorkspaceSellerAccountsFromAllTenants() {
  const out = []
  forEachTenantStore(ZUSTAND.workspaceSellerCorpus, ({ tenantId, state }) => {
    const entries = Array.isArray(state.entries) ? state.entries : []
    for (const account of entries) {
      if (!account) continue
      if (account.status === 'canceled') continue
      if (account.accountType !== 'seller' && account.accountType !== 'service_provider') continue
      out.push({ tenantId, account })
    }
  })
  return out
}

/**
 * Vendor master rows from every tenant slice.
 * @returns {{ tenantId: string, vendor: object }[]}
 */
export function collectVendorMasterRowsFromAllTenants() {
  const out = []
  forEachTenantStore(ZUSTAND.vendorMaster, ({ tenantId, state }) => {
    const vendors = Array.isArray(state.vendors) ? state.vendors : []
    for (const vendor of vendors) {
      if (vendor) out.push({ tenantId, vendor })
    }
  })
  return out
}

/**
 * Audit Pro supplier directory rows from every tenant slice.
 * @returns {{ tenantId: string, supplier: object }[]}
 */
export function collectAuditProSuppliersFromAllTenants() {
  const out = []
  forEachTenantStore(ZUSTAND.auditPro, ({ tenantId, state }) => {
    const suppliers = Array.isArray(state.suppliers) ? state.suppliers : []
    for (const supplier of suppliers) {
      if (supplier) out.push({ tenantId, supplier })
    }
  })
  return out
}
