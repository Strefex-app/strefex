import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import { useAuthStore } from '../../store/authStore'
import { useSubscriptionStore } from '../../services/featureFlags'
import { useIndustryStore } from '../../store/industryStore'
import { getEffectiveLimits } from '../../services/stripeService'
import {
  PLATFORM_HUB_INDUSTRY_SLUGS,
  displayHubIndustryFromSlug,
} from '../../data/platformHubIndustries'

/**
 * Step 1 on Buyers / Partners hubs — register one or more industries in-app.
 */
export default function HubIndustryRegistration({ audience = 'buyer' }) {
  const { t } = useTranslation()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const accountType = useSubscriptionStore((s) => s.accountType)
  const planId = useSubscriptionStore((s) => s.planId)
  const limits = getEffectiveLimits(planId, accountType)
  const maxIndustries = isSuperAdmin ? Infinity : (limits.maxIndustries ?? 1)

  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const isSelected = useIndustryStore((s) => s.isSelected)
  const selectIndustry = useIndustryStore((s) => s.selectIndustry)
  const deselectIndustry = useIndustryStore((s) => s.deselectIndustry)

  const [limitHint, setLimitHint] = useState('')

  const atLimit = maxIndustries !== Infinity && selectedIndustries.length >= maxIndustries
  const limitLabel = maxIndustries === Infinity
    ? 'Unlimited on your plan'
    : maxIndustries === 1
      ? '1 industry on your plan'
      : `Up to ${maxIndustries} industries on your plan`

  const handleToggle = (slug) => {
    if (isSelected(slug)) {
      deselectIndustry(slug)
      setLimitHint('')
      return
    }
    const added = selectIndustry(slug, maxIndustries)
    if (!added) {
      setLimitHint(`Your plan allows ${maxIndustries} ${maxIndustries === 1 ? 'industry' : 'industries'}. Upgrade on Plans to add more.`)
      return
    }
    setLimitHint('')
  }

  const audienceHint = audience === 'seller'
    ? 'Choose the industries where you supply equipment or services. Buyers will find you within these sectors.'
    : 'Choose the industries you source from. Your tools and supplier search are scoped to these sectors.'

  return (
    <div className="app-page-card hub-step hub-step--industries">
      <div className="hub-step__head">
        <span className="hub-step__badge">Step 1</span>
        <h2 className="hub-step__title">Register your industries</h2>
        <p className="hub-step__hint stx-text-wrap">{audienceHint}</p>
        <p className="hub-step__meta">
          {selectedIndustries.length} selected · {limitLabel}
        </p>
      </div>

      <div className="hub-industry-grid" role="group" aria-label="Industry selection">
        {PLATFORM_HUB_INDUSTRY_SLUGS.map((slug) => {
          const active = isSelected(slug)
          const locked = !active && atLimit
          const label = displayHubIndustryFromSlug(slug, t)
          return (
            <button
              key={slug}
              type="button"
              className={`hub-industry-btn ${active ? 'hub-industry-btn--active' : ''} ${locked ? 'hub-industry-btn--locked' : ''}`}
              onClick={() => !locked && handleToggle(slug)}
              disabled={locked}
              aria-pressed={active}
            >
              <span className="hub-industry-btn__check" aria-hidden="true">
                {active ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                )}
              </span>
              <span className="hub-industry-btn__label stx-text-wrap">{label}</span>
            </button>
          )
        })}
      </div>

      {limitHint && (
        <p className="hub-step__notice hub-step__notice--warn stx-text-wrap">
          {limitHint}{' '}
          <Link to="/plans">View plans</Link>
        </p>
      )}

      {selectedIndustries.length === 0 ? (
        <p className="hub-step__notice stx-text-wrap">
          Select at least one industry to unlock your workspace tools below.
        </p>
      ) : (
        <div className="hub-industry-links">
          <span className="hub-industry-links__label">Open an industry hub:</span>
          <div className="hub-industry-links__row">
            {selectedIndustries.map((slug) => (
              <Link key={slug} to={`/industry/${slug}`} className="hub-industry-links__chip stx-click-feedback">
                {displayHubIndustryFromSlug(slug, t)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Service providers register service categories, not industries. */
export function HubServiceProviderNotice() {
  return (
    <div className="app-page-card hub-step hub-step--industries">
      <div className="hub-step__head">
        <span className="hub-step__badge">Step 1</span>
        <h2 className="hub-step__title">Register your service categories</h2>
        <p className="hub-step__hint stx-text-wrap">
          Service provider accounts work by service type, not industry. Open the Service Hub to pick the categories you deliver.
        </p>
      </div>
      <Link to="/service-hub" className="hub-step__primary-link stx-click-feedback">
        Open Service Hub →
      </Link>
    </div>
  )
}
