/**
 * Stripe initialisation.
 * Only loads Stripe.js if the publishable key is configured.
 */
import { loadStripe } from '@stripe/stripe-js'
import env from './env'

export const isStripeConfigured = Boolean(env.STRIPE_PUBLISHABLE_KEY)

let stripePromise = null

/**
 * Lazy-load the Stripe instance (loads the script from stripe.com on first call).
 */
export function getStripe() {
  if (!isStripeConfigured) {
    console.warn('[Stripe] Not configured — set VITE_STRIPE_PUBLISHABLE_KEY in .env')
    return null
  }
  if (!stripePromise) {
    stripePromise = loadStripe(env.STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}
