/**
 * Feature flag / tier gating tests.
 * Validates that the subscription tier system correctly gates features,
 * including buyer vs seller account type differences.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useSubscriptionStore } from '../services/featureFlags'
import { PLANS, TIERS, getEffectiveLimits, getPlansForAccountType } from '../services/stripeService'

describe('Subscription Tiers', () => {
  beforeEach(() => {
    // Reset to seller free/start tier before each test
    useSubscriptionStore.getState().setAccountType('seller')
    useSubscriptionStore.getState().downgrade()
  })

  it('should have 5 tiers: start, basic, standard, premium, enterprise', () => {
    expect(PLANS).toHaveLength(5)
    expect(PLANS.map((p) => p.id)).toEqual(['start', 'basic', 'standard', 'premium', 'enterprise'])
  })

  it('should have correct tier hierarchy', () => {
    expect(TIERS.START).toBe(0)
    expect(TIERS.BASIC).toBe(1)
    expect(TIERS.STANDARD).toBe(2)
    expect(TIERS.PREMIUM).toBe(3)
    expect(TIERS.ENTERPRISE).toBe(4)
  })

  it('should default to start tier for sellers', () => {
    const store = useSubscriptionStore.getState()
    expect(store.planId).toBe('start')
    expect(store.accountType).toBe('seller')
    expect(store.status).toBe('active')
  })

  it('should correctly gate features for free (start) tier', () => {
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('costManagement')).toBe(false)
    expect(hasFeature('auditManagement')).toBe(false)
    expect(hasFeature('productionManagement')).toBe(false)
    expect(hasFeature('enterpriseManagement')).toBe(false)
    expect(hasFeature('teamManagement')).toBe(false)
    expect(hasFeature('messenger')).toBe(false)
    expect(hasFeature('profileContacts')).toBe(false)
    expect(hasFeature('multipleIndustries')).toBe(false)
    expect(hasFeature('executiveSummary')).toBe(false)
    expect(hasFeature('basicDashboard')).toBe(true)
    expect(hasFeature('companyProfile')).toBe(true)
  })

  it('should unlock basic features for basic tier', () => {
    useSubscriptionStore.getState().setPlan('basic')
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('teamManagement')).toBe(true)
    expect(hasFeature('basicAnalytics')).toBe(true)
    expect(hasFeature('emailSupport')).toBe(true)
    expect(hasFeature('multipleIndustries')).toBe(true)
    // Not included in basic:
    expect(hasFeature('costManagement')).toBe(false)
    expect(hasFeature('auditManagement')).toBe(false)
    expect(hasFeature('productionManagement')).toBe(false)
    expect(hasFeature('messenger')).toBe(false)
  })

  it('should unlock standard features for standard tier', () => {
    useSubscriptionStore.getState().setPlan('standard')
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('advancedReports')).toBe(true)
    expect(hasFeature('prioritySupport')).toBe(true)
    expect(hasFeature('teamManagement')).toBe(true)
    // Sellers don't get executive summary
    expect(hasFeature('executiveSummary')).toBe(false)
    // Premium-tier features NOT available on Standard:
    expect(hasFeature('auditManagement')).toBe(false)
    expect(hasFeature('productionManagement')).toBe(false)
    expect(hasFeature('projectAuditSchedule')).toBe(false)
    expect(hasFeature('costManagement')).toBe(false)
    expect(hasFeature('enterpriseManagement')).toBe(false)
    expect(hasFeature('messenger')).toBe(false)
    expect(hasFeature('customIntegrations')).toBe(false)
  })

  it('should unlock premium features for premium tier (except Enterprise-only & seller exec summary)', () => {
    useSubscriptionStore.getState().setPlan('premium')
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('costManagement')).toBe(true)
    expect(hasFeature('auditManagement')).toBe(true)
    expect(hasFeature('productionManagement')).toBe(true)
    expect(hasFeature('messenger')).toBe(true)
    expect(hasFeature('profileContacts')).toBe(true)
    expect(hasFeature('customIntegrations')).toBe(true)
    expect(hasFeature('projectAuditSchedule')).toBe(true)
    // Enterprise-only features NOT available on Premium
    expect(hasFeature('enterpriseManagement')).toBe(false)
    expect(hasFeature('procurement')).toBe(false)
    expect(hasFeature('contractManagement')).toBe(false)
    expect(hasFeature('spendAnalysis')).toBe(false)
    expect(hasFeature('complianceEsg')).toBe(false)
    expect(hasFeature('aiInsights')).toBe(false)
    expect(hasFeature('erpIntegrations')).toBe(false)
    expect(hasFeature('templateLibrary')).toBe(false)
    expect(hasFeature('auditLogs')).toBe(false)
    // Sellers never see executive summary
    expect(hasFeature('executiveSummary')).toBe(false)
  })

  it('should unlock everything for enterprise tier (except seller exec summary)', () => {
    useSubscriptionStore.getState().setPlan('enterprise')
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('costManagement')).toBe(true)
    expect(hasFeature('auditManagement')).toBe(true)
    expect(hasFeature('productionManagement')).toBe(true)
    expect(hasFeature('enterpriseManagement')).toBe(true)
    expect(hasFeature('messenger')).toBe(true)
    expect(hasFeature('profileContacts')).toBe(true)
    expect(hasFeature('customIntegrations')).toBe(true)
    expect(hasFeature('projectAuditSchedule')).toBe(true)
    expect(hasFeature('procurement')).toBe(true)
    expect(hasFeature('contractManagement')).toBe(true)
    expect(hasFeature('spendAnalysis')).toBe(true)
    expect(hasFeature('complianceEsg')).toBe(true)
    expect(hasFeature('aiInsights')).toBe(true)
    expect(hasFeature('erpIntegrations')).toBe(true)
    expect(hasFeature('templateLibrary')).toBe(true)
    expect(hasFeature('auditLogs')).toBe(true)
    // Sellers never see executive summary
    expect(hasFeature('executiveSummary')).toBe(false)
  })

  it('should respect numeric limits', () => {
    useSubscriptionStore.getState().setPlan('start')
    const { withinLimit } = useSubscriptionStore.getState()
    expect(withinLimit('maxProjects', 2)).toBe(true)
    expect(withinLimit('maxProjects', 3)).toBe(false) // Limit is 3
    expect(withinLimit('maxUsers', 0)).toBe(true)
    expect(withinLimit('maxUsers', 1)).toBe(false) // Limit is 1
  })

  it('should allow unlimited for premium tier', () => {
    useSubscriptionStore.getState().setPlan('premium')
    const { withinLimit } = useSubscriptionStore.getState()
    expect(withinLimit('maxProjects', 1000)).toBe(true)
    expect(withinLimit('maxUsers', 9999)).toBe(true)
  })

  it('should handle tier comparison correctly', () => {
    useSubscriptionStore.getState().setPlan('standard')
    const { hasTier } = useSubscriptionStore.getState()
    expect(hasTier(TIERS.START)).toBe(true)
    expect(hasTier(TIERS.BASIC)).toBe(true)
    expect(hasTier(TIERS.STANDARD)).toBe(true)
    expect(hasTier(TIERS.PREMIUM)).toBe(false)
    expect(hasTier(TIERS.ENTERPRISE)).toBe(false)
  })

  it('should allow enterprise tier to meet all lower tier requirements', () => {
    useSubscriptionStore.getState().setPlan('enterprise')
    const { hasTier } = useSubscriptionStore.getState()
    expect(hasTier(TIERS.START)).toBe(true)
    expect(hasTier(TIERS.BASIC)).toBe(true)
    expect(hasTier(TIERS.STANDARD)).toBe(true)
    expect(hasTier(TIERS.PREMIUM)).toBe(true)
    expect(hasTier(TIERS.ENTERPRISE)).toBe(true)
  })
})

describe('Buyer Account Type', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().setAccountType('buyer')
    useSubscriptionStore.getState().setPlan('basic')
  })

  it('should not offer Free plan to buyers', () => {
    const buyerPlans = getPlansForAccountType('buyer')
    expect(buyerPlans.map((p) => p.id)).toEqual(['basic', 'standard', 'premium', 'enterprise'])
  })

  it('should offer all plans to sellers', () => {
    const sellerPlans = getPlansForAccountType('seller')
    expect(sellerPlans.map((p) => p.id)).toEqual(['start', 'basic', 'standard', 'premium', 'enterprise'])
  })

  it('should restrict buyer basic to 1 industry, 1 category', () => {
    const limits = getEffectiveLimits('basic', 'buyer')
    expect(limits.maxIndustries).toBe(1)
    expect(limits.maxCategories).toBe(1)
    expect(limits.multipleIndustries).toBe(false)
  })

  it('should restrict buyer standard to 3 industries, 3 categories', () => {
    const limits = getEffectiveLimits('standard', 'buyer')
    expect(limits.maxIndustries).toBe(3)
    expect(limits.maxCategories).toBe(3)
    expect(limits.executiveSummary).toBe(true)
  })

  it('should give buyer premium full access (except Enterprise-only)', () => {
    const limits = getEffectiveLimits('premium', 'buyer')
    expect(limits.maxIndustries).toBe(Infinity)
    expect(limits.maxCategories).toBe(Infinity)
    expect(limits.executiveSummary).toBe(true)
    expect(limits.enterpriseManagement).toBe(false)
    expect(limits.procurement).toBe(false)
  })

  it('should give buyer enterprise full access including all features', () => {
    const limits = getEffectiveLimits('enterprise', 'buyer')
    expect(limits.maxIndustries).toBe(Infinity)
    expect(limits.maxCategories).toBe(Infinity)
    expect(limits.executiveSummary).toBe(true)
    expect(limits.enterpriseManagement).toBe(true)
    expect(limits.procurement).toBe(true)
    expect(limits.contractManagement).toBe(true)
    expect(limits.spendAnalysis).toBe(true)
    expect(limits.aiInsights).toBe(true)
    expect(limits.auditLogs).toBe(true)
  })

  it('should not show executive summary for buyer basic', () => {
    useSubscriptionStore.getState().setPlan('basic')
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('executiveSummary')).toBe(false)
  })

  it('should show executive summary for buyer standard+', () => {
    useSubscriptionStore.getState().setPlan('standard')
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('executiveSummary')).toBe(true)
  })

  it('should always hide executive summary for sellers', () => {
    useSubscriptionStore.getState().setAccountType('seller')
    useSubscriptionStore.getState().setPlan('premium')
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('executiveSummary')).toBe(false)
  })

  it('should downgrade buyer to basic (not start)', () => {
    useSubscriptionStore.getState().setPlan('premium')
    useSubscriptionStore.getState().downgrade()
    expect(useSubscriptionStore.getState().planId).toBe('basic')
  })
})

describe('Free Trial', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().setAccountType('seller')
    useSubscriptionStore.getState().downgrade()
  })

  it('should start a 14-day trial', () => {
    useSubscriptionStore.getState().startTrial()
    const store = useSubscriptionStore.getState()
    expect(store.planId).toBe('enterprise')
    expect(store.status).toBe('trialing')
    expect(store.trialEndsAt).toBeTruthy()
    expect(store.isTrial()).toBe(true)
    expect(store.trialDaysLeft()).toBeGreaterThanOrEqual(13)
    expect(store.trialDaysLeft()).toBeLessThanOrEqual(14)
  })

  it('should have enterprise features during trial', () => {
    useSubscriptionStore.getState().startTrial()
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('customIntegrations')).toBe(true)
    expect(hasFeature('productionManagement')).toBe(true)
    expect(hasFeature('enterpriseManagement')).toBe(true)
    expect(hasFeature('procurement')).toBe(true)
    expect(hasFeature('contractManagement')).toBe(true)
    expect(hasFeature('aiInsights')).toBe(true)
  })

  it('should downgrade on trial expiry', () => {
    // Manually set an expired trial
    useSubscriptionStore.getState().setPlan('enterprise', 'trialing', new Date(Date.now() - 1000).toISOString())
    const { hasFeature } = useSubscriptionStore.getState()
    // Accessing features should trigger auto-downgrade
    expect(hasFeature('customIntegrations')).toBe(false)
    expect(useSubscriptionStore.getState().planId).toBe('start')
  })
})

describe('Downgrade Logic', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().setAccountType('seller')
  })

  it('should revoke all features on seller downgrade', () => {
    useSubscriptionStore.getState().setPlan('premium')
    expect(useSubscriptionStore.getState().hasFeature('customIntegrations')).toBe(true)

    useSubscriptionStore.getState().downgrade()
    expect(useSubscriptionStore.getState().planId).toBe('start')
    expect(useSubscriptionStore.getState().hasFeature('customIntegrations')).toBe(false)
    expect(useSubscriptionStore.getState().hasFeature('costManagement')).toBe(false)
  })

  it('should revoke features when subscription is canceled', () => {
    useSubscriptionStore.getState().setPlan('standard', 'canceled')
    const { hasFeature } = useSubscriptionStore.getState()
    expect(hasFeature('productionManagement')).toBe(false) // Canceled = start-level
  })
})

describe('Dynamic Overrides', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().setAccountType('seller')
    useSubscriptionStore.getState().downgrade()
  })

  it('should override feature flags dynamically', () => {
    useSubscriptionStore.getState().setOverrides({ costManagement: true })
    expect(useSubscriptionStore.getState().hasFeature('costManagement')).toBe(true)
  })

  it('should clear overrides on downgrade', () => {
    useSubscriptionStore.getState().setOverrides({ costManagement: true })
    useSubscriptionStore.getState().downgrade()
    expect(useSubscriptionStore.getState().hasFeature('costManagement')).toBe(false)
  })
})
