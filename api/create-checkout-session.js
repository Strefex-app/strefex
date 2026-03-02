import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

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
      successUrl,
      cancelUrl,
    } = body

    const serverPriceIdByTier = {
      basic: process.env.STRIPE_PRICE_ID_BASIC || '',
      standard: process.env.STRIPE_PRICE_ID_STANDARD || '',
      premium: process.env.STRIPE_PRICE_ID_PREMIUM || '',
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
    }
    const resolvedTier = String(tier || '').trim().toLowerCase()
    const priceId = incomingPriceId || serverPriceIdByTier[resolvedTier]

    if (!priceId) {
      return res.status(400).json({ error: 'Stripe price is not configured for this tier' })
    }

    const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:5173'
    const success = successUrl || `${origin}/plans?success=true`
    const cancel = cancelUrl || `${origin}/plans?canceled=true`

    const metadata = {
      user_id: userId || '',
      industry: industry || 'general',
      tier: resolvedTier || '',
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

    return res.status(200).json({ sessionId: session.id })
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Failed to create checkout session' })
  }
}
