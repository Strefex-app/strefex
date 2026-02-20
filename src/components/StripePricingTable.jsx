import { useEffect, useRef } from 'react'
import env from '../config/env'

const SCRIPT_SRC = 'https://js.stripe.com/v3/pricing-table.js'

/**
 * Embeds Stripe's hosted Pricing Table.
 * Loads the external script once and renders the <stripe-pricing-table> custom element.
 *
 * @param {{ customerEmail?: string, clientReferenceId?: string }} props
 */
export default function StripePricingTable({ customerEmail, clientReferenceId }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!env.STRIPE_PRICING_TABLE_ID || !env.STRIPE_PUBLISHABLE_KEY) return

    let script = document.querySelector(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      document.head.appendChild(script)
    }

    const el = document.createElement('stripe-pricing-table')
    el.setAttribute('pricing-table-id', env.STRIPE_PRICING_TABLE_ID)
    el.setAttribute('publishable-key', env.STRIPE_PUBLISHABLE_KEY)
    if (customerEmail) el.setAttribute('customer-email', customerEmail)
    if (clientReferenceId) el.setAttribute('client-reference-id', clientReferenceId)

    const container = containerRef.current
    if (container) {
      container.innerHTML = ''
      container.appendChild(el)
    }

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [customerEmail, clientReferenceId])

  if (!env.STRIPE_PRICING_TABLE_ID || !env.STRIPE_PUBLISHABLE_KEY) {
    return null
  }

  return <div ref={containerRef} className="stripe-pricing-table-wrapper" />
}
