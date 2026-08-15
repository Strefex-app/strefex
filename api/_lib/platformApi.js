import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabasePublic = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

function getAllowedOrigins(req) {
  const envOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const appUrl = process.env.APP_URL ? [process.env.APP_URL] : []
  const vercelUrl = process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []
  const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173']
  return new Set([...envOrigins, ...appUrl, ...vercelUrl, ...devOrigins])
}

/** True when the caller sent a Bearer token, API key, or cron secret. */
export function hasRequestCredential(req) {
  const auth = String(req.headers.authorization || '')
  const apiKey = String(req.headers['x-api-key'] || '')
  const cron = String(req.headers['x-cron-secret'] || '')
  return auth.startsWith('Bearer ') || apiKey.length > 0 || cron.length > 0
}

/**
 * Browser requests must match the allowlist.
 * Non-browser callers (no Origin) must present a credential unless explicitly allowed
 * (Stripe webhooks).
 */
export function assertAllowedOrigin(req, { allowUnauthenticatedNoOrigin = false } = {}) {
  const origin = req.headers.origin
  if (!origin) {
    return allowUnauthenticatedNoOrigin || hasRequestCredential(req)
  }
  return getAllowedOrigins(req).has(origin)
}

export function setApiHeaders(req, res, methods = 'GET,POST,OPTIONS') {
  const origin = req.headers.origin
  if (origin && assertAllowedOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
  res.setHeader('Cache-Control', 'no-store')
}

export function getBearerToken(req) {
  const authHeader = String(req.headers.authorization || '')
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
}

/** Anon-key client scoped to the caller's JWT so RLS applies. */
export function supabaseForRequest(req) {
  const token = getBearerToken(req)
  if (!supabaseUrl || !supabaseAnonKey || !token) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
}

export async function requireAuthUser(req) {
  if (!supabasePublic) return null
  const token = getBearerToken(req)
  if (!token) return null
  const { data, error } = await supabasePublic.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user
}
