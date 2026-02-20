/**
 * Supabase Edge Function — Stripe Webhook Handler
 *
 * Validates incoming Stripe webhook events and updates the
 * `subscriptions` table in Supabase accordingly.
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   STRIPE_SECRET_KEY      — sk_live_...
 *   STRIPE_WEBHOOK_SECRET  — whsec_...
 *
 * Handled events:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   invoice.paid
 *   invoice.payment_failed
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

/* ── Plan ID mapping — maps Stripe Price IDs to internal plan IDs ── */
const PRICE_TO_PLAN: Record<string, string> = {
  // Populate with your Stripe Price IDs → STREFEX plan IDs.
  // These will be configured after creating products in the Stripe Dashboard.
  // Example:
  // 'price_xxxBasicMonthly': 'basic',
  // 'price_xxxStandardMonthly': 'standard',
  // 'price_xxxPremiumMonthly': 'premium',
  // 'price_xxxEnterpriseMonthly': 'enterprise',
}

function resolvePlanId(subscription: Stripe.Subscription): string {
  const priceId = subscription.items?.data?.[0]?.price?.id
  if (priceId && PRICE_TO_PLAN[priceId]) return PRICE_TO_PLAN[priceId]

  const product = subscription.items?.data?.[0]?.price?.product
  const productName = typeof product === 'object' ? (product as Stripe.Product).name?.toLowerCase() : ''
  if (productName.includes('enterprise')) return 'enterprise'
  if (productName.includes('premium')) return 'premium'
  if (productName.includes('standard')) return 'standard'
  if (productName.includes('basic')) return 'basic'
  return 'start'
}

function mapStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active': return 'active'
    case 'trialing': return 'trialing'
    case 'past_due': return 'past_due'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled'
    default: return stripeStatus
  }
}

async function upsertSubscription(
  customerId: string,
  subscription: Stripe.Subscription,
  email?: string,
) {
  const planId = resolvePlanId(subscription)
  const status = mapStatus(subscription.status)

  const row: Record<string, unknown> = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan_id: planId,
    status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }

  // Try to resolve user_id / company_id from the profiles table via email
  if (email) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, company_id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (profile) {
      row.user_id = profile.id
      row.company_id = profile.company_id
    }
  }

  // Also try client_reference_id stored by pricing table (company_id)
  const clientRef = (subscription as unknown as Record<string, string>).client_reference_id
  if (clientRef && !row.company_id) {
    row.company_id = clientRef
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'stripe_subscription_id' })

  if (error) console.error('[stripe-webhook] upsert error:', error)
  return !error
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', (err as Error).message)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  console.log(`[stripe-webhook] Received event: ${event.type} (${event.id})`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
            { expand: ['items.data.price.product'] },
          )
          await upsertSubscription(
            session.customer as string,
            subscription,
            session.customer_email || session.customer_details?.email || undefined,
          )
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        const email = (customer as Stripe.Customer).email || undefined
        await upsertSubscription(subscription.customer as string, subscription, email)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string,
            { expand: ['items.data.price.product'] },
          )
          const customer = await stripe.customers.retrieve(subscription.customer as string)
          const email = (customer as Stripe.Customer).email || undefined
          await upsertSubscription(subscription.customer as string, subscription, email)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('stripe_subscription_id', invoice.subscription as string)
        }
        break
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error processing ${event.type}:`, (err as Error).message)
    return new Response(JSON.stringify({ error: 'Webhook handler error' }), { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
