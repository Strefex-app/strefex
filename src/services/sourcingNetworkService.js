/**
 * Load seller / service-provider accounts for Intelligent Sourcing maps from Supabase.
 */
import { isSupabaseConfigured, supabase } from '../config/supabase'
import { sourcingNetworkRowToAccount } from '../utils/companyTaxonomyPayload'
import { publishAccountsToNetworkDirectory } from '../utils/accountSourcingCompleteness'

export async function fetchSourcingNetworkAccounts({ limit = 500 } = {}) {
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
    byKey.set(k, {
      ...local,
      ...remote,
      /* Prefer non-empty local edits that may be fresher than RPC lag */
      industries: (remote.industries?.length ? remote.industries : local.industries) || [],
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
      country: remote.country || local.country || '',
      city: remote.city || local.city || '',
      address: remote.address || local.address || '',
      source: remote.source || local.source || 'database',
    })
  })
  const merged = [...byKey.values()]
  try {
    publishAccountsToNetworkDirectory(merged)
  } catch { /* best-effort */ }
  return merged
}
