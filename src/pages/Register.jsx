import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Elements } from '@stripe/react-stripe-js'
import { useAuthStore } from '../store/authStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { useTranslation } from '../i18n/useTranslation'
import { getStripe, isStripeConfigured } from '../config/stripe'
import authService from '../services/authService'
import stripeService, { PLANS, ACCOUNT_TYPES, getPlansForAccountType, getPlanPrice, getPlanFeatures, BUYER_TRIAL_DAYS } from '../services/stripeService'
import { rememberOfficialRegistrationCode, resolveRegistrationCodeForDashboard } from '../utils/platformRegistrationCode'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import './Login.css'
import './Register.css'

const INDUSTRIES = [
  { id: 'general', label: 'General / Other' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'medical', label: 'Medical' },
  { id: 'raw-materials', label: 'Raw Materials' },
  { id: 'oil-gas', label: 'Oil & Gas' },
  { id: 'green-energy', label: 'Green Energy' },
  { id: 'household-products', label: 'Household Products' },
  { id: 'nuclear', label: 'Nuclear' },
]
const SERVICE_EXPERTISE_OPTIONS = [
  { id: 'project-management', label: 'Project Management' },
  { id: 'supplier-services', label: 'Supplier Services' },
  { id: 'quality-services', label: 'Quality & Compliance' },
]
const AUDITOR_EXPERTISE_OPTIONS = [
  { id: 'supplier-audit', label: 'Supplier Audit' },
]
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'icloud.com', 'aol.com', 'protonmail.com', 'mail.com', 'gmx.com', 'yandex.com', 'yandex.ru',
])

/* ── Inner form (needs Stripe context) ───────────────────── */
function RegisterForm() {
  const [step, setStep] = useState(1) // 1 = account, 2 = plan, 3 = check-email
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [company, setCompany] = useState('')
  const [accountTypes, setAccountTypes] = useState(['seller'])
  const [selectedPlan, setSelectedPlan] = useState('start')
  const [selectedIndustry, setSelectedIndustry] = useState('')
  const [selectedServiceCategories, setSelectedServiceCategories] = useState([])
  const [auditorDocuments, setAuditorDocuments] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showAgreementModal, setShowAgreementModal] = useState(false)

  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isDomainIndustryRegistered = useAccountRegistry((s) => s.isDomainIndustryRegistered)
  const registerAccount = useAccountRegistry((s) => s.registerAccount)
  const { t } = useTranslation()

  const primaryAccountType = accountTypes[0] || 'seller'
  const primaryIndustry = selectedIndustry
  const availablePlans = getPlansForAccountType(primaryAccountType)
  const selectedTier = selectedPlan === 'start' ? 'free' : selectedPlan

  const getDefaultPlanForAccountType = (type) => {
    const plansForType = getPlansForAccountType(type)
    if (type === 'buyer') return plansForType.find((p) => p.id === 'basic')?.id || plansForType[0]?.id || 'basic'
    return plansForType.find((p) => p.id === 'start')?.id || plansForType[0]?.id || 'start'
  }

  useEffect(() => {
    if (isAuthenticated) navigate('/main-menu', { replace: true })
  }, [isAuthenticated, navigate])

  const selectedPlanObj = PLANS.find((p) => p.id === selectedPlan) || PLANS[0]
  const displayPrice = getPlanPrice(selectedPlanObj, primaryAccountType)
  const isBuyerBasicTrial = primaryAccountType === 'buyer' && selectedPlan === 'basic'
  const isPaidPlan = displayPrice > 0 && !isBuyerBasicTrial

  const handleAccountTypeSelect = (type) => {
    // Registration is for one account direction at a time.
    setAccountTypes([type])
    setSelectedPlan(getDefaultPlanForAccountType(type))
    if (type === 'auditor') {
      setSelectedServiceCategories(['supplier-audit'])
      return
    }
    if (type !== 'service_provider') setSelectedServiceCategories([])
  }

  useEffect(() => {
    if (!availablePlans.some((plan) => plan.id === selectedPlan)) {
      setSelectedPlan(getDefaultPlanForAccountType(primaryAccountType))
    }
  }, [availablePlans, selectedPlan, primaryAccountType])

  const toggleServiceCategory = (serviceId) => {
    setSelectedServiceCategories((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const accountTypeLabels = accountTypes
    .map((type) => ACCOUNT_TYPES.find((t) => t.id === type)?.label || type)
    .join(', ')

  const isBusinessEmail = (value) => {
    const normalized = String(value || '').trim().toLowerCase()
    const parts = normalized.split('@')
    if (parts.length !== 2) return false
    const domain = parts[1]
    return Boolean(domain && domain.includes('.') && !PUBLIC_EMAIL_DOMAINS.has(domain))
  }

  /* ── Step 1 validation ─────────────────────────────────── */
  const validateAccount = () => {
    if (!fullName.trim() || fullName.trim().length < 2) return 'Full name must be at least 2 characters'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address'
    if (!isBusinessEmail(email)) return 'Please use a business email domain (public email providers are not allowed).'
    if (!phone.trim() || phone.trim().length < 7) return 'Please enter a valid phone number (minimum 7 digits)'
    if (!/^[+\d\s\-()]+$/.test(phone.trim())) return 'Phone number can only contain digits, spaces, dashes, and parentheses'
    if (!password || password.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    if (password !== confirmPassword) return 'Passwords do not match'
    if (!accountTypes.length) return 'Please select at least one account type'
    if (!agreedToTerms) return 'You must accept the Platform Agreement & NDA to continue'
    return null
  }

  /* ── Go to step 2 ──────────────────────────────────────── */
  const handleNext = (e) => {
    e.preventDefault()
    setError('')
    const err = validateAccount()
    if (err) { setError(err); return }
    setStep(2)
  }

  /* ── Step 2 submit — signup + tier subscription flow ─────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!selectedIndustry) {
      setError('Please choose one industry.')
      return
    }
    if (!availablePlans.some((plan) => plan.id === selectedPlan)) {
      setError('Please choose a valid plan for this account type.')
      return
    }
    if (primaryAccountType === 'service_provider' && selectedServiceCategories.length === 0) {
      setError('Please select at least one service expertise category.')
      return
    }
    if (primaryAccountType === 'auditor' && auditorDocuments.trim().length < 20) {
      setError('Please provide auditor verification documents/details for superadmin review (minimum 20 characters).')
      return
    }
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const emailDomain = normalizedEmail.split('@')[1]?.toLowerCase() || ''
    if (emailDomain && isDomainIndustryRegistered(emailDomain, primaryAccountType, primaryIndustry)) {
      setError('This business domain is already registered for the selected account type and industry. Choose another industry.')
      return
    }

    setLoading(true)
    try {
      const result = await authService.register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        company: company.trim() || undefined,
        selectedPlan,
        accountType: primaryAccountType,
        accountTypes,
        selectedIndustry: primaryIndustry,
        selectedServiceCategories,
        auditorDocuments: primaryAccountType === 'auditor' ? auditorDocuments.trim() : '',
        selectedTier,
      })

      const registrationStatus = result?.emailConfirmationPending
        ? 'pending_confirmation'
        : primaryAccountType === 'auditor'
          ? 'pending_verification'
          : (selectedTier === 'free' ? 'active' : 'pending_payment')

      const registrationCodeFromServer =
        result?.registrationCode ||
        result?.profile?.companies?.registration_code ||
        null

      const platformRegistrationLabel =
        typeof registrationCodeFromServer === 'string' && registrationCodeFromServer.trim() !== ''
          ? registrationCodeFromServer.trim()
          : resolveRegistrationCodeForDashboard({
              email: normalizedEmail,
              accountType: primaryAccountType,
              companyId: result?.profile?.company_id ?? null,
              hints: {},
            })

      if (typeof registrationCodeFromServer === 'string' && registrationCodeFromServer.trim() !== '') {
        rememberOfficialRegistrationCode(
          normalizedEmail,
          registrationCodeFromServer.trim(),
          result?.profile?.company_id ?? null,
        )
      }

      registerAccount({
        id: result?.user?.id || `pending-${Date.now()}`,
        company: company.trim() || fullName.trim() || normalizedEmail.split('@')[0] || 'Business',
        email: normalizedEmail,
        contactName: fullName.trim(),
        accountType: primaryAccountType,
        plan: selectedPlan,
        status: registrationStatus,
        industries: [primaryIndustry],
        categories: {},
        serviceCategories: primaryAccountType === 'service_provider' ? selectedServiceCategories : [],
        auditorDocuments: primaryAccountType === 'auditor' ? auditorDocuments.trim() : '',
        registeredAt: new Date().toISOString(),
        registrationCode: platformRegistrationLabel,
      })

      if (result?.emailConfirmationPending) {
        setStep(3)
        return
      }

      // FREE tier activates immediately; paid tiers require Stripe confirmation.
      if (selectedTier !== 'free') {
        const checkout = await stripeService.checkout(selectedTier, {
          userId: result?.user?.id || '',
          userEmail: normalizedEmail,
          industry: primaryIndustry || 'general',
        })
        if (checkout?.error) {
          setError(checkout.error)
          return
        }
        return
      }

      navigate('/main-menu')
    } catch (err) {
      const msg = err?.message || err?.detail || 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-header">
        <div className="login-logo">
          <img src="/assets/strefex-logo-reference.png" alt="STREFEX Logo" className="logo-image" />
        </div>
      </div>

      <div className="login-content" style={{ maxWidth: step === 2 ? 720 : 500 }}>
        <div className="login-card">
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">
            {step === 1
              ? 'Get started with STREFEX Platform'
              : step === 2
              ? `Choose your ${accountTypeLabels} plan`
              : 'Almost there!'}
          </p>

          {/* Step indicator */}
          <div className="reg-steps">
            <div className={`reg-step ${step >= 1 ? 'active' : ''}`}>
              <span className="reg-step-num">1</span>
              <span className="reg-step-label">Account</span>
            </div>
            <div className="reg-step-line" />
            <div className={`reg-step ${step >= 2 ? 'active' : ''}`}>
              <span className="reg-step-num">2</span>
              <span className="reg-step-label">Plan & Payment</span>
            </div>
            <div className="reg-step-line" />
            <div className={`reg-step ${step >= 3 ? 'active' : ''}`}>
              <span className="reg-step-num">3</span>
              <span className="reg-step-label">Confirm</span>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* ── Step 1: Account Details ─────────────────── */}
          {step === 1 && (
            <form onSubmit={handleNext} className="login-form" noValidate>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required disabled={loading} />
              </div>
              <div className="form-group">
                <label htmlFor="reg-email">{t('login.email')}</label>
                <input type="email" id="reg-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required disabled={loading} />
              </div>
              <div className="form-group">
                <label htmlFor="reg-phone">Phone Number</label>
                <input
                  type="tel"
                  id="reg-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="company">Company (optional)</label>
                <input type="text" id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Your Company" disabled={loading} />
              </div>
              <div className="form-group">
                <label>Account Type</label>
                <div className="reg-account-type-toggle reg-account-type-3col">
                  <button
                    type="button"
                    className={`reg-account-type-btn ${accountTypes.includes('seller') ? 'active' : ''}`}
                    onClick={() => handleAccountTypeSelect('seller')}
                    disabled={loading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16 7V5a4 4 0 0 0-8 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <div>
                      <div className="reg-account-type-label">Seller</div>
                      <div className="reg-account-type-desc">Sell equipment & services</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`reg-account-type-btn ${accountTypes.includes('buyer') ? 'active' : ''}`}
                    onClick={() => handleAccountTypeSelect('buyer')}
                    disabled={loading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <circle cx="9" cy="21" r="1" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="20" cy="21" r="1" stroke="currentColor" strokeWidth="2"/>
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <div className="reg-account-type-label">Buyer</div>
                      <div className="reg-account-type-desc">Source equipment & suppliers</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`reg-account-type-btn ${accountTypes.includes('service_provider') ? 'active' : ''}`}
                    onClick={() => handleAccountTypeSelect('service_provider')}
                    disabled={loading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <div className="reg-account-type-label">Service Provider</div>
                      <div className="reg-account-type-desc">Provide services & maintenance</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`reg-account-type-btn ${accountTypes.includes('auditor') ? 'active' : ''}`}
                    onClick={() => handleAccountTypeSelect('auditor')}
                    disabled={loading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M12 2l7 4v6c0 5-3.4 9.4-7 10-3.6-.6-7-5-7-10V6l7-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div>
                      <div className="reg-account-type-label">Auditor</div>
                      <div className="reg-account-type-desc">Independent supplier audit company</div>
                    </div>
                  </button>
                </div>
                <div className="reg-domain-hint">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  One business domain can register as Seller, Buyer, Service Provider, and Auditor separately. Invite team members from within the platform.
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="reg-password">{t('login.password')}</label>
                <input type="password" id="reg-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 number" required disabled={loading} />
              </div>
              <div className="form-group">
                <label htmlFor="reg-confirm">Confirm Password</label>
                <input type="password" id="reg-confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm password" required disabled={loading} />
              </div>

              {/* ── Platform Agreement & NDA ────────────── */}
              <div className="reg-agreement-section">
                <div className="reg-agreement-checkbox">
                  <ToggleCheckButton
                    compact
                    checked={agreedToTerms}
                    onChange={setAgreedToTerms}
                    disabled={loading}
                    aria-label="I agree to the Platform Agreement and NDA"
                  />
                  <span className="reg-agreement-text">
                    I have read and agree to the{' '}
                    <button
                      type="button"
                      className="reg-agreement-link"
                      onClick={() => setShowAgreementModal(true)}
                    >
                      Platform Agreement &amp; NDA
                    </button>
                  </span>
                </div>
              </div>

              <button type="submit" className="login-button" disabled={loading || !agreedToTerms}>
                Next — Choose Plan
              </button>

              <div className="login-divider"><span>Business email registration only</span></div>
            </form>
          )}

          {/* ── Step 2: Plan Selection + Payment ────────── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="reg-account-type-indicator">
                Registering as <strong>{accountTypeLabels}</strong>
                <button
                  type="button"
                  className="reg-change-type-link"
                  onClick={() => { setStep(1); setError('') }}
                >
                  Change
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="reg-industry">Industry</label>
                <div className="reg-account-type-toggle reg-account-type-3col">
                  {INDUSTRIES.map((industry) => {
                    const active = selectedIndustry === industry.id
                    return (
                      <button
                        key={industry.id}
                        type="button"
                        className={`reg-account-type-btn ${active ? 'active' : ''}`}
                        onClick={() => setSelectedIndustry(industry.id)}
                        disabled={loading}
                        style={{ minHeight: 62 }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div className="reg-account-type-label">{industry.label}</div>
                          {active && <span className="home-industry-badge">Selected</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="reg-domain-hint" style={{ marginTop: 8 }}>
                  Registration is one industry at a time. After login, choose categories in your industry dashboard according to your plan.
                </div>
                <div className="reg-domain-hint" style={{ marginTop: 6 }}>
                  Selected industry: <strong>{INDUSTRIES.find((x) => x.id === primaryIndustry)?.label || primaryIndustry}</strong>
                </div>
              </div>

              {primaryAccountType === 'service_provider' && (
                <div className="form-group">
                  <label>Service Expertise</label>
                  <div className="reg-account-type-toggle reg-account-type-3col">
                    {SERVICE_EXPERTISE_OPTIONS.map((service) => {
                      const active = selectedServiceCategories.includes(service.id)
                      return (
                        <button
                          key={service.id}
                          type="button"
                          className={`reg-account-type-btn ${active ? 'active' : ''}`}
                          onClick={() => toggleServiceCategory(service.id)}
                          disabled={loading}
                          style={{ minHeight: 62 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <div className="reg-account-type-label">{service.label}</div>
                            {active && <span className="home-industry-badge">Selected</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="reg-domain-hint" style={{ marginTop: 8 }}>
                    Select what your company provides (project management, supplier services, quality/buy-off).
                  </div>
                </div>
              )}

              {primaryAccountType === 'auditor' && (
                <div className="form-group">
                  <label>Auditor Service Expertise</label>
                  <div className="reg-account-type-toggle reg-account-type-3col">
                    {AUDITOR_EXPERTISE_OPTIONS.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        className="reg-account-type-btn active"
                        disabled
                        style={{ minHeight: 62, cursor: 'default' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <div className="reg-account-type-label">{service.label}</div>
                          <span className="home-industry-badge">Required</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="reg-domain-hint" style={{ marginTop: 8 }}>
                    Auditor companies are registered for Supplier Audit requests.
                  </div>
                </div>
              )}

              {primaryAccountType === 'auditor' && (
                <div className="form-group">
                  <label htmlFor="reg-auditor-docs">Verification Documents / Credentials</label>
                  <textarea
                    id="reg-auditor-docs"
                    value={auditorDocuments}
                    onChange={(e) => setAuditorDocuments(e.target.value)}
                    placeholder="List audit certificates, legal entity details, accreditation IDs, and links for superadmin verification."
                    rows={4}
                    disabled={loading}
                  />
                  <div className="reg-domain-hint" style={{ marginTop: 8 }}>
                    Submission is reviewed by platform superadmin before auditor nomination.
                  </div>
                </div>
              )}

              <div className="reg-plans" style={{ gridTemplateColumns: `repeat(${availablePlans.length}, 1fr)` }}>
                {availablePlans.map((plan) => {
                  const price = getPlanPrice(plan, primaryAccountType)
                  const features = getPlanFeatures(plan, primaryAccountType)
                  const isBuyerTrial = primaryAccountType === 'buyer' && plan.id === 'basic'
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      className={`reg-plan-card ${selectedPlan === plan.id ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
                      onClick={() => setSelectedPlan(plan.id)}
                    >
                      {isBuyerTrial && <span className="reg-plan-badge" style={{ background: '#2e7d32' }}>Free Trial</span>}
                      {!isBuyerTrial && plan.popular && <span className="reg-plan-badge">Popular</span>}
                      <span className="reg-plan-name">{plan.name}</span>
                      <span className="reg-plan-price">
                        {isBuyerTrial
                          ? <><span style={{ fontSize: '0.7em', fontWeight: 400 }}>Free for</span> {BUYER_TRIAL_DAYS} days</>
                          : price === 0 ? 'Free' : `$${price}/mo`}
                      </span>
                      <ul className="reg-plan-features">
                        {features.slice(0, 3).map((f, i) => (
                          <li key={i}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#2e7d32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            {f}
                          </li>
                        ))}
                        {features.length > 3 && (
                          <li className="reg-plan-more">+{features.length - 3} more</li>
                        )}
                      </ul>
                    </button>
                  )
                })}
              </div>

              {isPaidPlan && (
                <div className="reg-free-note" style={{ borderColor: 'var(--callout-warn-border)', background: 'var(--callout-warn-bg)', color: 'var(--callout-warn-text)' }}>
                  Paid tier selected. After account creation you will be redirected to Stripe Checkout.
                  Access activates only after webhook confirmation. Each industry registration is billed separately.
                </div>
              )}

              {!isPaidPlan && (
                <div className="reg-free-note">
                  {isBuyerBasicTrial
                    ? `No payment required — enjoy a free ${BUYER_TRIAL_DAYS}-day trial of the Basic plan. You can upgrade or subscribe anytime from the Plans page.`
                    : 'No payment required for the Start plan. You can upgrade anytime from the Plans page.'}
                </div>
              )}

              <div className="reg-form-actions">
                <button
                  type="button"
                  className="login-button login-button-google"
                  onClick={() => { setStep(1); setError('') }}
                  disabled={loading}
                  style={{ flex: '0 0 auto', width: 'auto', padding: '14px 24px' }}
                >
                  Back
                </button>
                <button type="submit" className="login-button" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Email Confirmation Pending ─────── */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#e8f5e9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2" stroke="#2e7d32" strokeWidth="2"/>
                  <path d="M22 7l-10 7L2 7" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#333', marginBottom: '0.75rem' }}>
                Check Your Email
              </h2>
              <p style={{ fontSize: '0.95rem', color: '#666', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                We've sent a confirmation link to
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#00d4ff', marginBottom: '1.5rem' }}>
                {email}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.6, marginBottom: '2rem' }}>
                Click the link in the email to activate your account, then come back here to sign in.
                If you don't see it, check your spam folder.
              </p>
              <Link
                to="/login"
                className="login-button"
                style={{
                  display: 'inline-block', textDecoration: 'none', textAlign: 'center',
                  padding: '14px 32px', width: 'auto'
                }}
              >
                Go to Sign In
              </Link>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#00d4ff', fontWeight: 500, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>
        </div>

      </div>

      {/* ── Platform Agreement & NDA Modal ───────────────── */}
      {showAgreementModal && (
        <div className="reg-agreement-overlay" onClick={() => setShowAgreementModal(false)}>
          <div className="reg-agreement-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reg-agreement-modal-header">
              <h2>STREFEX Platform Agreement &amp; NDA</h2>
              <button type="button" className="reg-agreement-close" onClick={() => setShowAgreementModal(false)} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="reg-agreement-modal-body">
              <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Last updated: February 2026</p>

              <h3>1. General Terms</h3>
              <p>
                By registering an account on the STREFEX Platform ("Platform"), you ("User") agree to the terms and conditions
                outlined in this Platform Agreement &amp; Non-Disclosure Agreement ("Agreement"). This Agreement constitutes a
                legally binding contract between the User and STREFEX ("Company").
              </p>

              <h3>2. Account Information &amp; Data Usage</h3>
              <p>
                The User hereby grants STREFEX the right to collect, store, process, and use the account information provided
                during registration and platform usage, including but not limited to:
              </p>
              <ul>
                <li>Company name, address, and contact details</li>
                <li>Contact person name, email, and phone number</li>
                <li>Industry affiliations and service/product categories</li>
                <li>Certifications, capabilities, and company descriptions</li>
                <li>Submitted requests, quotes, and communication records</li>
              </ul>
              <p>
                This information may be shared with registered Buyers, Sellers, and Service Providers on the Platform for
                the purpose of facilitating business connections, supplier selection, quote requests, audits, and related
                commercial activities.
              </p>

              <h3>3. Purpose of Data Sharing</h3>
              <p>STREFEX may use and share User account information for the following purposes:</p>
              <ul>
                <li>Presenting supplier profiles and capabilities to potential Buyers</li>
                <li>Facilitating Request for Quote (RFQ) and supplier selection processes</li>
                <li>Enabling audit requests, service requests, and project management activities</li>
                <li>Providing Executive Summaries and market analysis to authorized users</li>
                <li>Compliance with legal obligations and regulatory requirements</li>
                <li>Improving Platform services and user experience</li>
              </ul>

              <h3>4. Non-Disclosure Agreement (NDA)</h3>
              <p>
                All parties registered on the Platform agree to treat any confidential information shared through the Platform
                with the same degree of care as their own confidential information. Confidential information includes, but is
                not limited to:
              </p>
              <ul>
                <li>Pricing information, cost breakdowns, and financial data</li>
                <li>Technical specifications, drawings, and manufacturing processes</li>
                <li>Business strategies, client lists, and proprietary methods</li>
                <li>Any information explicitly marked as confidential</li>
              </ul>
              <p>
                Users agree not to disclose, reproduce, or use confidential information obtained through the Platform for any
                purpose other than the specific business transaction for which it was shared, unless expressly authorized in
                writing by the information owner.
              </p>

              <h3>5. Intellectual Property</h3>
              <p>
                All content, trademarks, and intellectual property displayed on the Platform remain the property of their
                respective owners. The User retains ownership of all information and materials they submit. STREFEX is granted
                a non-exclusive license to display and process such materials solely for the operation of the Platform.
              </p>

              <h3>6. Limitation of Liability</h3>
              <p>
                STREFEX provides the Platform on an "as-is" basis. While we strive to ensure accuracy and security, STREFEX
                shall not be liable for any indirect, incidental, or consequential damages arising from the use of the Platform,
                including but not limited to data loss, business interruption, or unauthorized access by third parties.
              </p>

              <h3>7. Account Termination</h3>
              <p>
                STREFEX reserves the right to suspend or terminate any account that violates this Agreement. Upon termination,
                the User's data will be retained for a period required by applicable law and then securely deleted, unless
                the User requests earlier deletion in compliance with data protection regulations.
              </p>

              <h3>8. Data Protection &amp; Privacy</h3>
              <p>
                STREFEX complies with applicable data protection laws including GDPR. Users have the right to access, correct,
                or request deletion of their personal data. For data protection inquiries, contact the STREFEX Data Protection
                Officer at <strong>privacy@strefex.com</strong>.
              </p>

              <h3>9. Amendments</h3>
              <p>
                STREFEX reserves the right to modify this Agreement at any time. Users will be notified of material changes
                and may be required to re-accept the updated terms to continue using the Platform.
              </p>

              <h3>10. Governing Law</h3>
              <p>
                This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which
                STREFEX is incorporated, without regard to conflict of law provisions.
              </p>
            </div>

            <div className="reg-agreement-modal-footer">
              <button
                type="button"
                className="reg-agreement-decline-btn"
                onClick={() => setShowAgreementModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="reg-agreement-accept-btn"
                onClick={() => { setAgreedToTerms(true); setShowAgreementModal(false) }}
              >
                I Accept &amp; Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


/* ── Wrapper with Stripe Elements provider ───────────────── */
export default function Register() {
  const stripePromise = isStripeConfigured ? getStripe() : null

  return (
    <Elements stripe={stripePromise}>
      <RegisterForm />
    </Elements>
  )
}
