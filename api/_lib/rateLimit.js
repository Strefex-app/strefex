import { supabaseAdmin } from './platformApi.js'

const BUCKET = new Map()

export function checkRateLimit({ key, windowMs = 60_000, max = 120 }) {
  const now = Date.now()
  const timestamps = BUCKET.get(key) || []
  const fresh = timestamps.filter((ts) => now - ts <= windowMs)
  if (fresh.length >= max) {
    BUCKET.set(key, fresh)
    return { allowed: false, remaining: 0 }
  }
  fresh.push(now)
  BUCKET.set(key, fresh)
  return { allowed: true, remaining: Math.max(0, max - fresh.length) }
}

/**
 * In-memory limit plus api_request_log so Vercel instances share a cap.
 * Falls back to local-only when the ledger insert/count fails.
 */
export async function checkSharedRateLimit({
  key,
  endpoint,
  userId = null,
  windowMs = 60_000,
  max = 120,
} = {}) {
  const local = checkRateLimit({ key, windowMs, max })
  if (!local.allowed) return local
  if (!supabaseAdmin) return local

  const sinceIso = new Date(Date.now() - windowMs).toISOString()
  const ledgerKey = `${endpoint}:${key}`.slice(0, 200)
  const { error: insertErr } = await supabaseAdmin.from('api_request_log').insert({
    endpoint: ledgerKey,
    user_id: userId || null,
  })
  if (insertErr) return local

  const { count, error: countErr } = await supabaseAdmin
    .from('api_request_log')
    .select('id', { count: 'exact', head: true })
    .eq('endpoint', ledgerKey)
    .gte('created_at', sinceIso)

  if (countErr) return local
  if ((count || 0) > max) {
    return { allowed: false, remaining: 0 }
  }
  return { allowed: true, remaining: Math.max(0, max - (count || 0)) }
}
