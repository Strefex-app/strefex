/**
 * Load seller / service-provider accounts for Intelligent Sourcing maps from Supabase.
 */
import { isSupabaseConfigured, supabase } from '../config/supabase'
import { sourcingNetworkRowToAccount } from '../utils/companyTaxonomyPayload'
import { publishAccountsToNetworkDirectory } from '../utils/accountSourcingCompleteness'
import { mergeAccountsPreferFilled } from '../utils/keepExistingAccountFields'

const NETWORK_FETCH_TTL_MS = 90_000

let inflight = null
let cache = { rows: null, at: 0, limit: 0 }

export function resetSourcingNetworkFetchCache() {
  inflight = null
  cache = { rows: null, at: 0, limit: 0 }
}

async function rpcListSourcingNetworkAccounts(limit) {
  if (!isSupabaseConfigured || !supabase) return []
  try {
    const { data, error } = await supabase.rpc('list_sourcing_network_accounts', {
      p_limit: Math.min(Math.max(Number(limit) || 500, 1), 2000),
    })
    if (error) {
      console.warn('[sourcingNetwork] list_sourcing_network_accounts failed:', error.message)
      return []
    }
    return (Array.isArray(data) ? data : [])
      .map(sourcingNetworkRowToAccount)
      .filter((a) => a && a.id && a.status !== 'canceled')
  } catch (err) {
    console.warn('[sourcingNetwork] fetch failed:', err?.message || err)
    return []
  }
}

/**
 * Shared network directory fetch. Home and Sourcing share one in-flight
 * request and a short TTL so keep-alive does not double the RPC traffic.
 */
export async function fetchSourcingNetworkAccounts({ limit = 500, force = false } = {}) {
  const wanted = Math.min(Math.max(Number(limit) || 500, 1), 2000)
  if (!force && inflight) return inflight
  if (
    !force
    && Array.isArray(cache.rows)
    && cache.limit >= wanted
    && (Date.now() - cache.at) < NETWORK_FETCH_TTL_MS
  ) {
    return cache.rows
  }
  inflight = rpcListSourcingNetworkAccounts(wanted)
    .then((rows) => {
      cache = { rows, at: Date.now(), limit: wanted }
      return rows
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/**
 * Merge DB network accounts into the local registry + device network directory.
 * Prefers newer DB taxonomy while keeping local-only rows.
 */
export function mergeSourcingNetworkIntoRegistry(localAccounts = [], networkAccounts = []) {
  const byKey = new Map()
  const keyOf = (a) => {
    const email = String(a?.email || '').toLowerCase()
    if (email) return `e:${email}`
    if (a?.id) return `i:${a.id}`
    return ''
  }
  ;(Array.isArray(localAccounts) ? localAccounts : []).forEach((a) => {
    const k = keyOf(a)
    if (k) byKey.set(k, a)
  })
  ;(Array.isArray(networkAccounts) ? networkAccounts : []).forEach((remote) => {
    const k = keyOf(remote)
    if (!k) return
    const local = byKey.get(k)
    if (!local) {
      byKey.set(k, remote)
      return
    }
    const filled = mergeAccountsPreferFilled(remote, local)
    byKey.set(k, {
      ...filled,
      industries: (remote.industries?.length ? remote.industries : local.industries) || filled.industries || [],
      categories: Object.keys(remote.categories || {}).length ? remote.categories : (local.categories || {}),
      productCategories: Object.keys(remote.productCategories || {}).length
        ? remote.productCategories
        : (local.productCategories || {}),
      equipmentSubcategories: Object.keys(remote.equipmentSubcategories || {}).length
        ? remote.equipmentSubcategories
        : (local.equipmentSubcategories || {}),
      productSubcategories: Object.keys(remote.productSubcategories || {}).length
        ? remote.productSubcategories
        : (local.productSubcategories || {}),
      serviceCategories: (remote.serviceCategories?.length
        ? remote.serviceCategories
        : local.serviceCategories) || [],
      accountTypes: (remote.accountTypes?.length ? remote.accountTypes : local.accountTypes) || [remote.accountType || 'seller'],
      country: filled.country || '',
      city: filled.city || '',
      address: filled.address || '',
      source: remote.source || local.source || 'database',
      /* Sourcing metrics live in profile metadata / registry — RPC rows usually omit them */
      fitLevel: remote.fitLevel ?? local.fitLevel,
      riskLevel: remote.riskLevel ?? local.riskLevel,
      capacityLevel: remote.capacityLevel ?? local.capacityLevel,
      onTimePct: remote.onTimePct ?? local.onTimePct,
      qualityPpm: remote.qualityPpm ?? local.qualityPpm,
      leadTimeDays: remote.leadTimeDays ?? local.leadTimeDays,
      priceIndex: remote.priceIndex ?? local.priceIndex,
      annualSpend: remote.annualSpend ?? local.annualSpend,
      quoteTurnDays: remote.quoteTurnDays ?? local.quoteTurnDays,
      respRate: remote.respRate ?? local.respRate,
      employees: remote.employees ?? local.employees,
      machines: remote.machines ?? local.machines,
      shifts: remote.shifts ?? local.shifts,
      financialGrade: remote.financialGrade ?? local.financialGrade ?? local.fin,
      tariffRegime: remote.tariffRegime ?? local.tariffRegime ?? local.tariff,
      tier2: remote.tier2 ?? local.tier2,
      auditStatus: remote.auditStatus ?? local.auditStatus,
      auditIn: remote.auditIn ?? local.auditIn ?? local.auditDueDays,
      certifications: (Array.isArray(remote.certifications) && remote.certifications.length)
        ? remote.certifications
        : local.certifications,
      languages: remote.languages ?? local.languages ?? local.langs,
      langs: remote.langs ?? local.langs ?? local.languages,
      metadata: {
        ...(local.metadata || {}),
        ...(remote.metadata || {}),
        sourcing_metrics: {
          ...((local.metadata && local.metadata.sourcing_metrics) || {}),
          ...((remote.metadata && remote.metadata.sourcing_metrics) || {}),
        },
      },
    })
  })
  const merged = [...byKey.values()]
  try {
    publishAccountsToNetworkDirectory(merged)
  } catch { /* best-effort */ }
  return merged
}
