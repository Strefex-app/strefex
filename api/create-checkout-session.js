import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

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
    return priceObj.id
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

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe server is not configured' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const {
      priceId: incomingPriceId,
      userId = '',
      userEmail = '',
      industry = 'general',
      tier = '',
      billingPeriod = 'monthly',
      successUrl,
      cancelUrl,
    } = body

    // Accept either price IDs (price_*) or product IDs (prod_*) from env.
    const serverPriceRefByTier = {
      basic: process.env.STRIPE_PRICE_ID_BASIC || process.env.STRIPE_PRODUCT_ID_BASIC || '',
      standard: process.env.STRIPE_PRICE_ID_STANDARD || process.env.STRIPE_PRODUCT_ID_STANDARD || '',
      premium: process.env.STRIPE_PRICE_ID_PREMIUM || process.env.STRIPE_PRODUCT_ID_PREMIUM || '',
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || process.env.STRIPE_PRODUCT_ID_ENTERPRISE || '',
    }
    const resolvedTier = String(tier || '').trim().toLowerCase()
    const incomingRef = String(incomingPriceId || '').trim()
    const configuredRef = String(serverPriceRefByTier[resolvedTier] || '').trim()
    const priceId = await resolveCheckoutPriceId(incomingRef || configuredRef, billingPeriod)

    if (!priceId) {
      return res.status(400).json({
        error: 'Stripe price is not configured for this tier. Use a valid price_* ID or a product with active recurring prices.',
      })
    }

    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:5173'
    const success = successUrl || `${origin}/plans?success=true`
    const cancel = cancelUrl || `${origin}/plans?canceled=true`

    const metadata = {
      user_id: userId || '',
      industry: industry || 'general',
      tier: resolvedTier || '',
      billing_period: billingPeriod,
      price_id: priceId,
      user_email: userEmail || '',
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: success,
      cancel_url: cancel,
      customer_email: userEmail || undefined,
      client_reference_id: userId || undefined,
      metadata,
      subscription_data: {
        metadata,
      },
    })

    return res.status(200).json({ sessionId: session.id, url: session.url || '' })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Failed to create checkout session' })
  }
}
