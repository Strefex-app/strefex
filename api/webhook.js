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

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

async function upsertSubscriptionRow({
  userId,
  industry = 'general',
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

  const payload = {
    user_id: userId,
    industry: industry || 'general',
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

function extractMetadata(obj) {
  const metadata = obj?.metadata || {}
  return {
    userId: metadata.user_id || obj?.client_reference_id || '',
    industry: metadata.industry || 'general',
    tier: metadata.tier || '',
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!stripe || !webhookSecret) {
    return res.status(500).json({ error: 'Stripe webhook is not configured' })
  }

  let event
  try {
    const signature = req.headers['stripe-signature']
    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature' })
    }
    const rawBody = await readRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    return res.status(400).json({ error: `Webhook verification failed: ${err.message}` })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { userId, industry, tier } = extractMetadata(session)
      await upsertSubscriptionRow({
        userId,
        industry,
        tier,
        stripeSubscriptionId: session.subscription || null,
        stripeCustomerId: session.customer || null,
        status: 'active',
      })
    }

    if (event.type === 'customer.subscription.created') {
      const subscription = event.data.object
      const { userId, industry, tier } = extractMetadata(subscription)
      await upsertSubscriptionRow({
        userId,
        industry,
        tier,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer || null,
        status: 'active',
      })
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const { userId, industry, tier } = extractMetadata(subscription)
      await upsertSubscriptionRow({
        userId,
        industry,
        tier,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer || null,
        status: 'cancelled',
      })
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'Webhook handler failed' })
  }
}
