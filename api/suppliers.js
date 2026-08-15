import {
  assertAllowedOrigin,
  requireAuthUser,
  setApiHeaders,
  supabaseAdmin,
  supabaseForRequest,
} from './_lib/platformApi.js'
import { resolveApiKeyContext } from './_lib/apiKeyAuth.js'
import { checkSharedRateLimit } from './_lib/rateLimit.js'

function toInt(value, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.trunc(parsed)
}

export default async function handler(req, res) {
  setApiHeaders(req, res, 'GET,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!assertAllowedOrigin(req)) return res.status(403).json({ error: 'Origin is not allowed' })

  const apiKeyContext = await resolveApiKeyContext(req)
  const user = await requireAuthUser(req)
  if (!user && !apiKeyContext) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const db = user ? supabaseForRequest(req) : supabaseAdmin
  if (!db) return res.status(500).json({ error: 'Supabase is not configured' })

  const limitKey = apiKeyContext?.id || user?.id || req.headers['x-forwarded-for'] || 'anon'
  const rl = await checkSharedRateLimit({
    key: `suppliers:${limitKey}`,
    endpoint: 'suppliers_search',
    userId: user?.id || null,
    windowMs: 60_000,
    max: 240,
  })
  if (!rl.allowed) return res.status(429).json({ error: 'Rate limit exceeded' })

  try {
    const {
      q = '',
      country = '',
      industry = '',
      process = '',
      certification = '',
      minAuditScore = '',
      maxRiskScore = '',
      sortBy = 'score',
      page = '1',
      pageSize = '20',
    } = req.query || {}

    const limit = Math.max(1, Math.min(100, toInt(pageSize, 20)))
    const pageN = Math.max(1, toInt(page, 1))
    const offset = (pageN - 1) * limit

    const { data, error } = await db.rpc('search_suppliers', {
      p_query: String(q || '') || null,
      p_country: String(country || '') || null,
      p_industry: String(industry || '') || null,
      p_process: String(process || '') || null,
      p_certification: String(certification || '') || null,
      p_min_audit_score: minAuditScore === '' ? null : Number(minAuditScore),
      p_max_risk_score: maxRiskScore === '' ? null : Number(maxRiskScore),
      p_sort_by: String(sortBy || 'score'),
      p_limit: limit,
      p_offset: offset,
    })
    if (error) throw error

    return res.status(200).json({
      items: data || [],
      pagination: { page: pageN, pageSize: limit, count: Array.isArray(data) ? data.length : 0 },
    })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Failed to search suppliers' })
  }
}
