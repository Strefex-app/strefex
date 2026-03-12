import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

const ALLOWED_TIERS = new Set(['basic', 'standard', 'premium', 'enterprise'])
const LOCAL_RATE_LIMIT_WINDOW_MS = 60 * 1000
const LOCAL_RATE_LIMIT_MAX = 8
const localCheckoutAttempts = new Map()

function getTargetRecurring(billingPeriod) {
  const period = String(billingPeriod || 'monthly').toLowerCase()
  if (period === 'annual' || period === 'yearly') {
    return { interval: 'year', interval_count: 1 }
  }
  if (period === 'triennial' || period === '3y' || period === '3-year' || period === '3years') {
    return { interval: 'year', interval_count: 3 }
  }
  return { interval: 'month', interval_count: 1 }
}

function pickPriceForPeriod(prices, billingPeriod) {
  const target = getTargetRecurring(billingPeriod)
  const recurring = (prices || []).filter((p) => p.type === 'recurring' && p.active)
  const exact = recurring.filter(
    (p) => p.recurring?.interval === target.interval && (p.recurring?.interval_count || 1) === target.interval_count
  )
  const candidates = exact.length > 0 ? exact : recurring
  if (candidates.length === 0) return ''
  candidates.sort((a, b) => (a.unit_amount || 0) - (b.unit_amount || 0))
  return candidates[0]?.id || ''
}

async function resolveCheckoutPriceId(rawRef, billingPeriod = 'monthly') {
  const ref = String(rawRef || '').trim()
  if (!ref) return ''

  // Price ID provided - try to honor requested billing period on same product.
  if (ref.startsWith('price_')) {
    const priceObj = await stripe.prices.retrieve(ref)
    if (!priceObj) return ''
    if (
      priceObj.type === 'recurring' &&
      priceObj.recurring?.interval === getTargetRecurring(billingPeriod).interval &&
      (priceObj.recurring?.interval_count || 1) === getTargetRecurring(billingPeriod).interval_count
    ) {
      return priceObj.id
    }
    if (priceObj.product) {
      const prices = await stripe.prices.list({
        product: priceObj.product,
        active: true,
        limit: 100,
      })
      return pickPriceForPeriod(prices.data || [], billingPeriod)
    }
    return ''
  }

  // Support product IDs by resolving to an active recurring price for the period.
  if (ref.startsWith('prod_')) {
    const prices = await stripe.prices.list({
      product: ref,
      active: true,
      limit: 100,
    })
    return pickPriceForPeriod(prices.data || [], billingPeriod)
  }

  return ''
}

function getTierPriceRef(tier, billingPeriod) {
  const normalizedTier = String(tier || '').trim().toUpperCase()
  const normalizedPeriod = String(billingPeriod || 'monthly').trim().toLowerCase()
  const periodSuffix = normalizedPeriod === 'annual' || normalizedPeriod === 'yearly'
    ? 'ANNUAL'
    : normalizedPeriod === 'triennial' || normalizedPeriod === '3y' || normalizedPeriod === '3-year' || normalizedPeriod === '3years'
      ? 'TRIENNIAL'
      : 'MONTHLY'

  const periodRef = process.env[`STRIPE_PRICE_ID_${normalizedTier}_${periodSuffix}`]
    || process.env[`STRIPE_PRODUCT_ID_${normalizedTier}_${periodSuffix}`]
    || ''
  if (String(periodRef || '').trim()) return String(periodRef).trim()

  const genericRef = process.env[`STRIPE_PRICE_ID_${normalizedTier}`]
    || process.env[`STRIPE_PRODUCT_ID_${normalizedTier}`]
    || ''
  return String(genericRef || '').trim()
}

function sanitizeReturnUrl(inputUrl, origin, fallback) {
  try {
    if (!inputUrl) return fallback
    const parsed = new URL(inputUrl)
    const allowedOrigin = new URL(origin)
    if (parsed.origin !== allowedOrigin.origin) return fallback
    return parsed.toString()
  } catch {
    return fallback
  }
}

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

function assertAllowedOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  const allow = getAllowedOrigins(req)
  return allow.has(origin)
}

function setApiHeaders(req, res) {
  const origin = req.headers.origin
  if (origin && assertAllowedOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
  res.setHeader('Cache-Control', 'no-store')
}

function getRequestId(req) {
  return req.headers['x-request-id'] || `chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function logEvent(level, requestId, message, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    requestId,
    route: 'create-checkout-session',
    message,
    ...fields,
  }
  if (level === 'error') {
    console.error(JSON.stringify(payload))
    return
  }
  console.log(JSON.stringify(payload))
}

function checkLocalRateLimit(userId) {
  const now = Date.now()
  const list = localCheckoutAttempts.get(userId) || []
  const fresh = list.filter((ts) => now - ts <= LOCAL_RATE_LIMIT_WINDOW_MS)
  if (fresh.length >= LOCAL_RATE_LIMIT_MAX) {
    localCheckoutAttempts.set(userId, fresh)
    return false
  }
  fresh.push(now)
  localCheckoutAttempts.set(userId, fresh)
  return true
}

async function checkPersistentRateLimit(userId) {
  if (!supabaseAdmin || !userId) return { allowed: true }
  const nowIso = new Date().toISOString()
  const sinceIso = new Date(Date.now() - LOCAL_RATE_LIMIT_WINDOW_MS).toISOString()

  const { error: insertErr } = await supabaseAdmin
    .from('api_request_log')
    .insert({
      endpoint: 'create_checkout_session',
      user_id: userId,
      created_at: nowIso,
    })
  if (insertErr) {
    return { allowed: checkLocalRateLimit(userId) }
  }

  const { count, error: countErr } = await supabaseAdmin
    .from('api_request_log')
    .select('id', { count: 'exact', head: true })
    .eq('endpoint', 'create_checkout_session')
    .eq('user_id', userId)
    .gte('created_at', sinceIso)

  if (countErr) {
    return { allowed: checkLocalRateLimit(userId) }
  }
  return { allowed: (count || 0) <= LOCAL_RATE_LIMIT_MAX }
}

export default async function handler(req, res) {
  const requestId = getRequestId(req)
  res.setHeader('X-Request-Id', requestId)
  setApiHeaders(req, res)

  if (req.method === 'OPTIONS') {
    logEvent('info', requestId, 'preflight')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    logEvent('warn', requestId, 'invalid_method', { method: req.method })
    return res.status(405).json({ error: 'Method not allowed', requestId })
  }
  if (!assertAllowedOrigin(req)) {
    logEvent('warn', requestId, 'origin_rejected', { origin: req.headers.origin || null })
    return res.status(403).json({ error: 'Origin is not allowed', requestId })
  }
  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    logEvent('warn', requestId, 'missing_xrw_header')
    return res.status(400).json({ error: 'Invalid request headers', requestId })
  }

  if (!stripe) {
    logEvent('error', requestId, 'stripe_not_configured')
    return res.status(500).json({ error: 'Stripe server is not configured', requestId })
  }
  if (!supabase) {
    logEvent('error', requestId, 'supabase_verification_not_configured')
    return res.status(500).json({ error: 'Supabase auth verification is not configured', requestId })
  }

  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      logEvent('warn', requestId, 'missing_auth_token')
      return res.status(401).json({ error: 'Authentication required', requestId })
    }
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData?.user) {
      logEvent('warn', requestId, 'invalid_auth_token')
      return res.status(401).json({ error: 'Invalid or expired authentication token', requestId })
    }
    const authUser = userData.user
    const rateCheck = await checkPersistentRateLimit(authUser.id)
    if (!rateCheck.allowed) {
      logEvent('warn', requestId, 'rate_limited', { userId: authUser.id })
      return res.status(429).json({ error: 'Too many checkout attempts. Please wait a minute and try again.', requestId })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const {
      industry = 'general',
      industries = [],
      tier = '',
      billingPeriod = 'monthly',
      successUrl,
      cancelUrl,
    } = body
    const normalizedIndustries = Array.isArray(industries) && industries.length > 0
      ? [...new Set(industries.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean))]
      : [String(industry || 'general').trim().toLowerCase()]
    const primaryIndustry = normalizedIndustries[0] || 'general'
    const industryCount = 1

    const resolvedTier = String(tier || '').trim().toLowerCase()
    if (!ALLOWED_TIERS.has(resolvedTier)) {
      logEvent('warn', requestId, 'invalid_tier', { tier: resolvedTier || null })
      return res.status(400).json({ error: 'Invalid subscription tier', requestId })
    }
    const configuredRef = getTierPriceRef(resolvedTier, billingPeriod)
    const priceId = await resolveCheckoutPriceId(configuredRef, billingPeriod)

    if (!priceId) {
      logEvent('warn', requestId, 'missing_price_mapping', {
        tier: resolvedTier,
        billingPeriod,
        configuredRef: configuredRef || null,
      })
      return res.status(400).json({
        error: 'Stripe price is not configured for this tier and billing period.',
        requestId,
      })
    }

    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:5173'
    const success = sanitizeReturnUrl(successUrl, origin, `${origin}/plans?success=true`)
    const cancel = sanitizeReturnUrl(cancelUrl, origin, `${origin}/plans?canceled=true`)

    const metadata = {
      user_id: authUser.id,
      industry: primaryIndustry,
      industries_csv: primaryIndustry,
      industries_count: String(industryCount),
      tier: resolvedTier || '',
      billing_period: billingPeriod,
      price_id: priceId,
      user_email: authUser.email || '',
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success,
      cancel_url: cancel,
      customer_email: authUser.email || undefined,
      client_reference_id: authUser.id || undefined,
      metadata,
      subscription_data: {
        metadata,
      },
    })

    logEvent('info', requestId, 'checkout_session_created', {
      userId: authUser.id,
      tier: resolvedTier,
      billingPeriod,
      industries: [primaryIndustry],
      industryCount,
      stripeSessionId: session.id,
    })
    return res.status(200).json({ sessionId: session.id, url: session.url || '', requestId })
  } catch (error) {
    logEvent('error', requestId, 'checkout_session_failed', { error: error?.message || 'unknown_error' })
    return res.status(500).json({ error: error?.message || 'Failed to create checkout session', requestId })
  }
}
