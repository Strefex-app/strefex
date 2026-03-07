import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
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

function assertAllowedOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  return getAllowedOrigins(req).has(origin)
}

function setApiHeaders(req, res) {
  const origin = req.headers.origin
  if (origin && assertAllowedOrigin(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Stripe-Signature,X-Request-Id')
  res.setHeader('Cache-Control', 'no-store')
}

function getRequestId(req) {
  return req.headers['x-request-id'] || `wh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function logEvent(level, requestId, message, fields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    requestId,
    route: 'stripe-webhook',
    message,
    ...fields,
  }
  if (level === 'error') {
    console.error(JSON.stringify(payload))
    return
  }
  console.log(JSON.stringify(payload))
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function reserveWebhookEvent(event) {
  if (!supabaseAdmin) return { duplicate: false }
  const payload = {
    event_id: event.id,
    event_type: event.type,
    processed_at: new Date().toISOString(),
  }
  const { error } = await supabaseAdmin.from('stripe_webhook_events').insert(payload)
  if (!error) return { duplicate: false }

  const msg = String(error.message || '').toLowerCase()
  if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('already exists')) {
    return { duplicate: true }
  }
  throw error
}

async function upsertSubscriptionRow({
  userId,
  industry = 'general',
  industries = [],
  tier = '',
  stripeSubscriptionId = null,
  stripeCustomerId = null,
  status,
}) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured')
  }

  if (!userId) {
    if (stripeSubscriptionId) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .update({
          status,
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', stripeSubscriptionId)
      if (error) throw error
      return
    }
    return
  }

  const normalizedIndustries = Array.isArray(industries) && industries.length > 0
    ? [...new Set(industries.map((v) => String(v || '').trim().toLowerCase()).filter(Boolean))]
    : [String(industry || 'general').trim().toLowerCase()]

  for (const industryId of normalizedIndustries) {
  const payload = {
    user_id: userId,
    industry: industryId || 'general',
    tier: tier || 'basic',
    plan_id: tier || 'basic',
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: stripeCustomerId,
    status,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(payload, { onConflict: 'user_id,industry' })

  if (error) throw error
  }
}

function normalizeStatus(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'active' || s === 'trialing' || s === 'past_due' || s === 'unpaid') return s
  if (s === 'canceled' || s === 'cancelled') return 'canceled'
  if (s === 'incomplete' || s === 'incomplete_expired') return 'inactive'
  return 'inactive'
}

function extractMetadata(obj) {
  const metadata = obj?.metadata || {}
  const parsedIndustries = String(metadata.industries_csv || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return {
    userId: metadata.user_id || obj?.client_reference_id || '',
    industry: metadata.industry || 'general',
    industries: parsedIndustries,
    tier: metadata.tier || '',
  }
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

  if (!stripe || !webhookSecret) {
    logEvent('error', requestId, 'webhook_not_configured')
    return res.status(500).json({ error: 'Stripe webhook is not configured', requestId })
  }

  let event
  try {
    const signature = req.headers['stripe-signature']
    if (!signature) {
      logEvent('warn', requestId, 'missing_signature')
      return res.status(400).json({ error: 'Missing Stripe signature', requestId })
    }
    const rawBody = await readRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    logEvent('warn', requestId, 'verification_failed', { error: err.message })
    return res.status(400).json({ error: `Webhook verification failed: ${err.message}`, requestId })
  }

  try {
    const reservation = await reserveWebhookEvent(event)
    if (reservation.duplicate) {
      logEvent('info', requestId, 'duplicate_event', { eventId: event.id, eventType: event.type })
      return res.status(200).json({ received: true, duplicate: true, requestId })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { userId, industry, industries, tier } = extractMetadata(session)
      await upsertSubscriptionRow({
        userId,
        industry,
        industries,
        tier,
        stripeSubscriptionId: session.subscription || null,
        stripeCustomerId: session.customer || null,
        status: 'active',
      })
    }

    if (
      event.type === 'customer.subscription.created'
      || event.type === 'customer.subscription.updated'
      || event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object
      const { userId, industry, industries, tier } = extractMetadata(subscription)
      await upsertSubscriptionRow({
        userId,
        industry,
        industries,
        tier,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer || null,
        status: normalizeStatus(
          event.type === 'customer.subscription.deleted'
            ? 'canceled'
            : subscription.status
        ),
      })
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object
      await upsertSubscriptionRow({
        userId: null,
        industry: 'general',
        tier: '',
        stripeSubscriptionId: invoice?.subscription || null,
        stripeCustomerId: invoice?.customer || null,
        status: 'past_due',
      })
    }

    logEvent('info', requestId, 'event_processed', { eventId: event.id, eventType: event.type })
    return res.status(200).json({ received: true, requestId })
  } catch (err) {
    logEvent('error', requestId, 'handler_failed', {
      eventId: event?.id || null,
      eventType: event?.type || null,
      error: err?.message || 'Webhook handler failed',
    })
    return res.status(500).json({ error: err?.message || 'Webhook handler failed', requestId })
  }
}
