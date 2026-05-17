/**
 * Workspace-level seller/supplier corpus: one canonical store per COMPANY (tenant), shared across
 * buyer / seller / service_provider sessions. Audit Pro, Vendor Master, and directory imports write here;
 * **`SUPPLIER_DATABASE` is off by default**; see `src/config/supplierDataMode.js`.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { createTenantStorage, getTenantId } from '../utils/tenantStorage'

const REGISTRY_KEY = 'strefex-account-registry'
const STORAGE_NAME = 'strefex-workspace-seller-corpus'
const LEGACY_MIGRATION_VERSION = 1

function normSellerCorpusEmail(em) {
  return String(em || '').trim().toLowerCase()
}

function isSyntheticVendorPlaceholderEmail(em) {
  return typeof em === 'string' && em.endsWith('@vendor-master.strefex')
}

/** Heuristic: rows created by Audit Pro / Vendor Master sync stored in scoped account registry slices. */
export function isLikelyWorkspaceImportedSellerAccount(acct) {
  if (!acct || acct.status === 'canceled') return false
  const id = String(acct.id || '')
  if (
    !!(acct.vendorMasterId && String(acct.vendorMasterId).trim()) ||
    id.startsWith('audit-reg-') ||
    id.startsWith('vendor-vm-') ||
    isSyntheticVendorPlaceholderEmail(acct.email) ||
    acct.workspaceCorpusSource === true
  ) {
    return true
  }
  return acct.migratedIntoWorkspaceCorpus === true
}

/** @param {unknown[]} accounts */
function collectLegacySlicesForTenant(tenantSanitized) {
  const out = []
  if (!tenantSanitized || tenantSanitized === 'guest') return out
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(`${REGISTRY_KEY}::`)) continue
    const parts = key.split('::')
    if (parts.length < 3 || parts[0] !== REGISTRY_KEY) continue
    if (parts[1] !== tenantSanitized) continue
    try {
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const arr = JSON.parse(raw)
      if (!Array.isArray(arr)) continue
      arr.forEach((a) => {
        if (isLikelyWorkspaceImportedSellerAccount(a)) out.push({ ...a, migratedIntoWorkspaceCorpus: true })
      })
    } catch {
      /* skip slice */
    }
  }
  return out
}

function mergeCorpusUpsert(entries, nextAccount) {
  const vm = String(nextAccount.vendorMasterId || '').trim()
  const em = normSellerCorpusEmail(nextAccount.email)

  let idx = -1
  if (vm) idx = entries.findIndex((a) => String(a.vendorMasterId || '').trim() === vm)
  if (idx < 0 && em) idx = entries.findIndex((a) => normSellerCorpusEmail(a.email) === em)

  const next = [...entries]
  if (idx >= 0) next[idx] = { ...next[idx], ...nextAccount, workspaceCorpusSource: true }
  else next.push({ ...nextAccount, workspaceCorpusSource: true })
  return next
}

export const useWorkspaceSellerCorpusStore = create(
  persist(
    (set, get) => ({
      /** @type {{ id: string, email?: string }[]} */
      entries: [],
      /** Bump when migrating localStorage layouts. */
      migrationVersion: 0,

      /**
       * One upsert keyed by vendorMasterId, else normalized email (matches supplierSellerRegistrySync).
       */
      upsertSellerAccount(payload) {
        set((state) => ({ entries: mergeCorpusUpsert(state.entries, payload) }))
      },

      /** Call before exporting workspace sellers for merges; idempotent after full migrationVersion. */
      ensureLegacySlicesMigratedIntoCorpus() {
        const tid = getTenantId()
        if (!tid || tid === 'guest') return
        if (get().migrationVersion >= LEGACY_MIGRATION_VERSION) return
        const scraped = collectLegacySlicesForTenant(tid)
        if (scraped.length === 0) {
          set({ migrationVersion: LEGACY_MIGRATION_VERSION })
          return
        }
        set((state) => {
          let next = state.entries
          for (const acct of scraped) {
            next = mergeCorpusUpsert(next, acct)
          }
          return { entries: next, migrationVersion: LEGACY_MIGRATION_VERSION }
        })
      },

      /** Seller / service_provider shaped accounts for supplierDatabase merge. */
      getCorpusAccountsForSupplierMerge() {
        get().ensureLegacySlicesMigratedIntoCorpus()
        return (get().entries || []).filter(
          (a) => a && (a.accountType === 'seller' || a.accountType === 'service_provider') && a.status !== 'canceled',
        )
      },

      getByVendorMasterId(vendorMasterId) {
        const v = String(vendorMasterId || '').trim()
        if (!v) return undefined
        return get().entries.find((a) => String(a.vendorMasterId || '').trim() === v)
      },

      getByEmail(email) {
        const e = normSellerCorpusEmail(email)
        if (!e) return undefined
        return get().entries.find((a) => normSellerCorpusEmail(a.email) === e)
      },
    }),
    {
      name: STORAGE_NAME,
      storage: createJSONStorage(() => createTenantStorage()),
      partialize: (s) => ({ entries: s.entries, migrationVersion: s.migrationVersion }),
    },
  ),
)
