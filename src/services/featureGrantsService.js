/**
 * Server-backed feature grants (Supabase). localStorage is a cache for
 * offline/dev only — hasFeature ignores it once grants have been hydrated.
 */
import { isSupabaseConfigured, supabase } from '../config/supabase'
import { setServerFeatureGrants } from '../utils/featureGrants'

function mapGrantRow(row) {
  if (!row) return null
  return {
    id: row.id,
    accountId: row.account_id || '',
    company: row.company || '',
    email: row.email,
    accountType: row.account_type || '',
    plan: row.plan || '',
    featureKey: row.feature_key,
    featureLabel: row.feature_label || row.feature_key,
    grantedAt: row.granted_at,
    expiresAt: row.expires_at,
    periodDays: row.period_days,
    grantedBy: row.granted_by || 'superadmin',
    status: row.status || 'active',
  }
}

export async function listFeatureGrants() {
  if (!isSupabaseConfigured || !supabase) return []
  const { data, error } = await supabase
    .from('feature_grants')
    .select('*')
    .order('granted_at', { ascending: false })
    .limit(2000)
  if (error) throw error
  return (data || []).map(mapGrantRow).filter(Boolean)
}

export async function listMyFeatureGrants() {
  if (!isSupabaseConfigured || !supabase) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return []
  const email = String(user.email).trim().toLowerCase()
  const { data, error } = await supabase
    .from('feature_grants')
    .select('*')
    .eq('email', email)
    .eq('status', 'active')
    .limit(200)
  if (error) throw error
  return (data || []).map(mapGrantRow).filter(Boolean)
}

export async function insertFeatureGrants(grants) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Feature grants require Supabase')
  }
  const rows = grants.map((g) => ({
    account_id: g.accountId || null,
    company: g.company || null,
    email: String(g.email || '').trim().toLowerCase(),
    account_type: g.accountType || null,
    plan: g.plan || null,
    feature_key: g.featureKey,
    feature_label: g.featureLabel || g.featureKey,
    granted_at: g.grantedAt || new Date().toISOString(),
    expires_at: g.expiresAt || null,
    period_days: g.periodDays ?? null,
    status: g.status || 'active',
  }))
  const { data, error } = await supabase.from('feature_grants').insert(rows).select()
  if (error) throw error
  return (data || []).map(mapGrantRow)
}

export async function updateFeatureGrant(grantId, patch) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Feature grants require Supabase')
  }
  const row = {}
  if (patch.expiresAt !== undefined) row.expires_at = patch.expiresAt
  if (patch.periodDays !== undefined) row.period_days = patch.periodDays
  if (patch.status !== undefined) row.status = patch.status
  const { error } = await supabase.from('feature_grants').update(row).eq('id', grantId)
  if (error) throw error
}

export async function deleteFeatureGrant(grantId) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Feature grants require Supabase')
  }
  const { error } = await supabase.from('feature_grants').delete().eq('id', grantId)
  if (error) throw error
}

export async function hydrateFeatureGrantsForSession() {
  if (!isSupabaseConfigured) {
    setServerFeatureGrants(null)
    return
  }
  setServerFeatureGrants([])
  try {
    const grants = await listMyFeatureGrants()
    setServerFeatureGrants(grants)
  } catch {
    setServerFeatureGrants([])
  }
}
