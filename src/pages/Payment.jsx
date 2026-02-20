import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useTranslation } from '../i18n/useTranslation'
import { useSubscriptionStore } from '../services/featureFlags'
import { useTransactionStore, getCompanyDomain } from '../store/transactionStore'
import { useAuthStore } from '../store/authStore'
import stripeService, { PLANS, getPlanPrice, getBillingLabel } from '../services/stripeService'
import '../styles/app-page.css'
import './Payment.css'

// Service/Product catalog - will be connected to database later
const SERVICE_CATALOG = [
  { 
    id: 'supplier-selection',
    category: 'Supplier Services',
    name: 'Supplier Selection Package',
    description: 'Complete supplier evaluation and selection service',
    price: 2500,
    currency: 'USD',
  },
  { 
    id: 'supplier-audit',
    category: 'Supplier Services',
    name: 'Supplier Audit',
    description: 'On-site supplier quality audit',
    price: 3500,
    currency: 'USD',
  },
  { 
    id: 'rfq-management',
    category: 'Supplier Services',
    name: 'RFQ Management',
    description: 'Full RFQ process management',
    price: 1500,
    currency: 'USD',
  },
  { 
    id: 'production-followup',
    category: 'Supplier Services',
    name: 'Production Follow Up',
    description: 'On-site production monitoring and quality control',
    price: 2800,
    currency: 'USD',
  },
  { 
    id: 'equipment-acceptance',
    category: 'Supplier Services',
    name: 'Equipment Acceptance',
    description: 'Equipment inspection, testing and acceptance verification',
    price: 4500,
    currency: 'USD',
  },
  { 
    id: 'shipment-acceptance',
    category: 'Supplier Services',
    name: 'Shipment Acceptance',
    description: 'Shipment inspection, documentation and acceptance',
    price: 1800,
    currency: 'USD',
  },
  { 
    id: 'project-basic',
    category: 'Project Management',
    name: 'Project Management - Basic',
    description: 'Basic project oversight and reporting',
    price: 5000,
    currency: 'USD',
  },
  { 
    id: 'project-standard',
    category: 'Project Management',
    name: 'Project Management - Standard',
    description: 'Standard project management with regular reporting',
    price: 9500,
    currency: 'USD',
  },
  { 
    id: 'project-premium',
    category: 'Project Management',
    name: 'Project Management - Premium',
    description: 'Full project management with dedicated team',
    price: 15000,
    currency: 'USD',
  },
  { 
    id: 'consulting-hourly',
    category: 'Consulting',
    name: 'Consulting - Hourly',
    description: 'Expert consulting per hour',
    price: 250,
    currency: 'USD',
  },
  { 
    id: 'consulting-daily',
    category: 'Consulting',
    name: 'Consulting - Daily Rate',
    description: 'Full day consulting service',
    price: 1800,
    currency: 'USD',
  },
  { 
    id: 'subscription-monthly',
    category: 'Subscription',
    name: 'Platform Subscription - Monthly',
    description: 'Full platform access per month',
    price: 499,
    currency: 'USD',
  },
  { 
    id: 'subscription-annual',
    category: 'Subscription',
    name: 'Platform Subscription - Annual',
    description: 'Full platform access per year (2 months free)',
    price: 4990,
    currency: 'USD',
  },
]

// Payment methods configuration
const PAYMENT_METHODS = [
  {
    id: 'card',
    name: 'Credit / Debit Card',
    icon: 'card',
    description: 'Visa, Mastercard, American Express',
    processingTime: 'Instant',
    fee: '2.9% + $0.30',
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    icon: 'bank',
    description: 'Direct bank wire transfer',
    processingTime: '2-5 business days',
    fee: 'No fee',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: 'paypal',
    description: 'Pay with PayPal account',
    processingTime: 'Instant',
    fee: '3.49% + $0.49',
  },
  {
    id: 'crypto-btc',
    name: 'Bitcoin (BTC)',
    icon: 'bitcoin',
    description: 'Pay with Bitcoin',
    processingTime: '10-60 minutes',
    fee: 'Network fee only',
  },
  {
    id: 'crypto-eth',
    name: 'Ethereum (ETH)',
    icon: 'ethereum',
    description: 'Pay with Ethereum',
    processingTime: '1-5 minutes',
    fee: 'Gas fee only',
  },
  {
    id: 'crypto-usdt',
    name: 'USDT (Tether)',
    icon: 'usdt',
    description: 'Pay with USDT stablecoin',
    processingTime: '1-5 minutes',
    fee: 'Network fee only',
  },
]

// Transaction history is now sourced from transactionStore

// Bank account info placeholder - will be connected to company data later
const BANK_INFO = {
  bankName: '[Bank Name]',
  accountName: 'STREFEX LLC',
  accountNumber: '[Account Number]',
  routingNumber: '[Routing Number]',
  swiftCode: '[SWIFT Code]',
  iban: '[IBAN]',
  reference: 'STR-[Invoice ID]',
}

// Crypto wallet addresses placeholder
const CRYPTO_WALLETS = {
  btc: '[Bitcoin Wallet Address]',
  eth: '[Ethereum Wallet Address]',
  usdt: '[USDT Wallet Address (ERC-20)]',
}

export default function Payment() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const currentPlan = useSubscriptionStore((s) => s.planId)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const subStatus = useSubscriptionStore((s) => s.status)
  const setPlan = useSubscriptionStore((s) => s.setPlan)
  const user = useAuthStore((s) => s.user)
  const role = useAuthStore((s) => s.role)
  const isSuperAdmin = role === 'superadmin'
  const isCompanyAdmin = role === 'admin' || isSuperAdmin
  const allTransactions = useTransactionStore((s) => s.transactions)
  const addTransaction = useTransactionStore((s) => s.addTransaction)
  const markPlanPaid = useTransactionStore((s) => s.markPlanPaid)

  // Company-scoped transaction history: superadmin sees all, company admin sees company, user sees own
  const myDomain = getCompanyDomain(user?.email)
  const userTransactions = isSuperAdmin
    ? allTransactions
    : isCompanyAdmin && myDomain
    ? allTransactions.filter((tx) => (tx.companyDomain || getCompanyDomain(tx.userEmail)) === myDomain)
    : allTransactions.filter((tx) => tx.userEmail === user?.email)

  // ── Plan checkout from SubscriptionPlans page ──────────
  const checkoutPlanId = searchParams.get('plan')
  const checkoutBilling = searchParams.get('billing') || 'monthly'
  const checkoutPlan = checkoutPlanId ? PLANS.find((p) => p.id === checkoutPlanId) : null
  const checkoutTxId = searchParams.get('txId') // When admin pays for an approved user request
  const [planPaymentSubmitted, setPlanPaymentSubmitted] = useState(false)

  // Sync subscription on mount
  useEffect(() => {
    stripeService.getSubscription().then((sub) => {
      if (sub?.plan_id) setPlan(sub.plan_id, sub.status, sub.trial_ends_at || null)
    })
  }, [setPlan])

  const [selectedService, setSelectedService] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [selectedMethod, setSelectedMethod] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [activeTab, setActiveTab] = useState(checkoutPlan ? 'plan-checkout' : 'payment') // 'payment', 'plan-checkout', 'history', 'billing'
  
  // Card form state
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    cardHolder: '',
    expiry: '',
    cvv: '',
  })
  
  // Billing info state
  const [billingInfo, setBillingInfo] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    vatNumber: '',
  })
  
  // Get selected service details
  const service = SERVICE_CATALOG.find(s => s.id === selectedService)
  const subtotal = service ? service.price * quantity : 0
  const paymentMethod = PAYMENT_METHODS.find(m => m.id === selectedMethod)
  
  // Calculate fee
  const calculateFee = () => {
    if (!paymentMethod || !subtotal) return 0
    if (selectedMethod === 'card') return subtotal * 0.029 + 0.30
    if (selectedMethod === 'paypal') return subtotal * 0.0349 + 0.49
    return 0
  }
  
  const fee = calculateFee()
  const total = subtotal + fee
  
  // Group services by category
  const servicesByCategory = SERVICE_CATALOG.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = []
    acc[service.category].push(service)
    return acc
  }, {})
  
  // Handle payment submission
  const handlePayment = (e) => {
    e.preventDefault()
    if (!service) return
    // Record the transaction
    addTransaction({
      type: 'service_payment',
      service: service.name,
      amount: total,
      method: selectedMethod,
      status: selectedMethod === 'bank' || selectedMethod.startsWith('crypto') ? 'pending' : 'paid',
      userEmail: user?.email || 'unknown',
      companyName: user?.companyName || '',
      accountType: accountType || 'seller',
    })
    alert(`Payment of ${formatCurrency(total)} for "${service.name}" has been recorded.${selectedMethod === 'bank' || selectedMethod.startsWith('crypto') ? ' Status: Pending confirmation.' : ' Status: Paid.'}`)
    // Reset form
    setSelectedService('')
    setQuantity(1)
    setSelectedMethod('')
    setShowPaymentForm(false)
    setActiveTab('history')
  }

  // Handle plan checkout payment — only company admins can pay
  const handlePlanPayment = (e) => {
    e.preventDefault()
    if (!checkoutPlan || !selectedMethod) return
    if (!isCompanyAdmin) return // Only company admins can process plan payments

    const price = getPlanPrice(checkoutPlan, accountType, checkoutBilling)
    const prevPlan = currentPlan
    const billingLabel = getBillingLabel(checkoutBilling)

    if (checkoutTxId) {
      // Admin is paying for an existing user request that was company-approved
      markPlanPaid(checkoutTxId, user?.email, selectedMethod)
    } else {
      // Admin initiated upgrade directly (no prior user request)
      addTransaction({
        type: 'plan_upgrade',
        service: `Plan ${checkoutPlan.name} — ${billingLabel}`,
        amount: price,
        method: selectedMethod,
        status: 'pending_platform_approval', // STREFEX superuser must approve
        userEmail: user?.email || 'unknown',
        companyName: user?.companyName || '',
        companyDomain: getCompanyDomain(user?.email),
        planFrom: prevPlan,
        planTo: checkoutPlan.id,
        accountType: accountType || 'seller',
        billingPeriod: checkoutBilling,
        paidBy: user?.email,
        paidAt: new Date().toISOString(),
      })
    }

    setPlanPaymentSubmitted(true)
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }
  
  // Render payment method icon
  const renderMethodIcon = (iconType) => {
    switch (iconType) {
      case 'card':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      case 'bank':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )
      case 'paypal':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M7.5 21L9 12h4.5c3 0 5.5-2.5 5.5-5.5S16.5 1 13.5 1H7l-3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 16l.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
      case 'bitcoin':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M9 8h4a2 2 0 0 1 0 4H9V8zM9 12h5a2 2 0 0 1 0 4H9v-4zM10 6v2M14 6v2M10 16v2M14 16v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
      case 'ethereum':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2l8 10-8 4-8-4 8-10z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M4 12l8 10 8-10-8 4-8-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
        )
      case 'usdt':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 8h8M12 8v10M9 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
      default:
        return null
    }
  }

  const planObj = PLANS.find((p) => p.id === currentPlan)

  return (
    <AppLayout>
      <div className="app-page payment-page">
        {/* Subscription banner */}
        <div className="app-page-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600 }}>Current Plan</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginTop: 4 }}>
              {planObj?.name || 'Start'} {subStatus === 'trialing' ? '(Trial)' : ''}
            </div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
              {planObj?.price === 0 ? 'Free' : `$${planObj?.price}/month`}
            </div>
          </div>
          <button className="pm-checkout-btn" onClick={() => navigate('/plans')} style={{ padding: '10px 20px', borderRadius: 8, background: '#000888', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
            {currentPlan === 'start' ? 'Upgrade Plan' : 'Manage Subscription'}
          </button>
        </div>

        {/* Header */}
        <div className="app-page-card">
          <h2 className="app-page-title">{t('payment.title')}</h2>
          <p className="app-page-subtitle">{t('payment.subtitle')}</p>
          
          {/* Tabs */}
          <div className="payment-tabs">
            {checkoutPlan && (
              <button 
                type="button"
                className={`payment-tab ${activeTab === 'plan-checkout' ? 'active' : ''}`}
                onClick={() => setActiveTab('plan-checkout')}
                style={activeTab === 'plan-checkout' ? { borderColor: '#e65100', color: '#e65100' } : {}}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Plan Upgrade
              </button>
            )}
            <button 
              type="button"
              className={`payment-tab ${activeTab === 'payment' ? 'active' : ''}`}
              onClick={() => setActiveTab('payment')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M2 10h20" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Make Payment
            </button>
            <button 
              type="button"
              className={`payment-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Transaction History
            </button>
            <button 
              type="button"
              className={`payment-tab ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Billing Info
            </button>
          </div>
        </div>

        {/* ── Plan Checkout Tab ── */}
        {activeTab === 'plan-checkout' && checkoutPlan && (
          <div className="payment-content">
            {!isCompanyAdmin ? (
              <div className="app-page-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff3e0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M12 9v2m0 4h.01M5.07 19h13.86c1.1 0 1.8-1.17 1.25-2.12l-6.93-12a1.44 1.44 0 0 0-2.5 0l-6.93 12c-.55.95.15 2.12 1.25 2.12z" stroke="#e65100" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>Admin Access Required</h2>
                <p style={{ fontSize: 15, color: '#666', margin: '0 0 24px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                  Only company administrators can process plan payments. Please ask your company admin to approve and pay for this upgrade.
                </p>
                <button
                  type="button"
                  style={{ padding: '10px 24px', borderRadius: 8, background: '#000888', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                  onClick={() => navigate('/plans')}
                >
                  Back to Plans
                </button>
              </div>
            ) : planPaymentSubmitted ? (
              <div className="app-page-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17l-5-5" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>Payment Submitted!</h2>
                <p style={{ fontSize: 15, color: '#666', margin: '0 0 8px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                  Your payment for the <strong>{checkoutPlan.name}</strong> plan has been submitted successfully.
                </p>
                <p style={{ fontSize: 14, color: '#e65100', fontWeight: 600, margin: '0 0 24px' }}>
                  Your plan will be activated once STREFEX confirms the subscription.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button
                    type="button"
                    style={{ padding: '10px 24px', borderRadius: 8, background: '#000888', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                    onClick={() => navigate('/main-menu')}
                  >
                    Back to Home
                  </button>
                  <button
                    type="button"
                    style={{ padding: '10px 24px', borderRadius: 8, background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                    onClick={() => setActiveTab('history')}
                  >
                    View Transaction History
                  </button>
                </div>
              </div>
            ) : (
              <div className="app-page-card">
                <h3 className="payment-section-title">
                  <span className="step-number">1</span>
                  Plan Upgrade — {checkoutPlan.name}
                  {checkoutTxId && <span style={{ fontSize: 12, color: '#888', fontWeight: 400, marginLeft: 8 }}>(Paying for team request)</span>}
                </h3>
                <div style={{ padding: '16px 0', borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>{checkoutPlan.name} Plan</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: '#2e7d32' }}>
                      ${getPlanPrice(checkoutPlan, accountType, checkoutBilling)}
                      <span style={{ fontSize: 13, fontWeight: 400, color: '#888' }}>
                        /mo{checkoutBilling === 'annual' ? ' (billed yearly)' : checkoutBilling === 'triennial' ? ' (billed every 3 years)' : ''}
                      </span>
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#888' }}>
                    Upgrading from: <strong>{PLANS.find((p) => p.id === currentPlan)?.name || currentPlan}</strong>
                  </div>
                  <ul style={{ margin: '12px 0 0', padding: '0 0 0 16px', fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                    {checkoutPlan.features?.slice(0, 5).map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <h3 className="payment-section-title" style={{ marginTop: 16 }}>
                  <span className="step-number">2</span>
                  Select Payment Method
                </h3>
                <div className="payment-methods-grid">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      className={`payment-method-btn ${selectedMethod === method.id ? 'selected' : ''}`}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      <div className="method-icon">
                        {renderMethodIcon(method.icon)}
                      </div>
                      <div className="method-info">
                        <span className="method-name">{method.name}</span>
                        <span className="method-desc">{method.description}</span>
                      </div>
                      {selectedMethod === method.id && (
                        <div className="method-check">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {selectedMethod && (
                  <div style={{ marginTop: 20, padding: 20, background: '#f8f9fa', borderRadius: 10 }}>
                    <div className="order-summary">
                      <h4>Order Summary</h4>
                      <div className="summary-row">
                        <span>{checkoutPlan.name} Plan — {getBillingLabel(checkoutBilling)}</span>
                        <span>{formatCurrency(getPlanPrice(checkoutPlan, accountType, checkoutBilling))}/mo</span>
                      </div>
                      <div className="summary-row total">
                        <span>Total Due Now</span>
                        <span>{formatCurrency(getPlanPrice(checkoutPlan, accountType, checkoutBilling))}</span>
                      </div>
                      <button
                        type="button"
                        className="pay-btn"
                        onClick={handlePlanPayment}
                      >
                        Pay &amp; Subscribe to {checkoutPlan.name}
                      </button>
                      <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
                        Your plan will be activated after STREFEX confirms the subscription.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Make Payment Tab */}
        {activeTab === 'payment' && (
          <div className="payment-content">
            <div className="payment-grid">
              {/* Service Selection */}
              <div className="app-page-card payment-service-card">
                <h3 className="payment-section-title">
                  <span className="step-number">1</span>
                  Select Service
                </h3>
                
                <div className="payment-form-group">
                  <label>What are you paying for?</label>
                  <select 
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="payment-select"
                  >
                    <option value="">-- Select a service --</option>
                    {Object.entries(servicesByCategory).map(([category, services]) => (
                      <optgroup key={category} label={category}>
                        {services.map(service => (
                          <option key={service.id} value={service.id}>
                            {service.name} - {formatCurrency(service.price)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                
                {service && (
                  <div className="service-details">
                    <div className="service-info">
                      <span className="service-category">{service.category}</span>
                      <h4 className="service-name">{service.name}</h4>
                      <p className="service-description">{service.description}</p>
                    </div>
                    
                    <div className="payment-form-group">
                      <label>Quantity</label>
                      <div className="quantity-input">
                        <button 
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                        <button 
                          type="button"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    
                    <div className="price-summary">
                      <div className="price-row">
                        <span>Unit Price</span>
                        <span>{formatCurrency(service.price)}</span>
                      </div>
                      <div className="price-row">
                        <span>Quantity</span>
                        <span>× {quantity}</span>
                      </div>
                      <div className="price-row subtotal">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="app-page-card payment-method-card">
                <h3 className="payment-section-title">
                  <span className="step-number">2</span>
                  Payment Method
                </h3>
                
                <div className="payment-methods-grid">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      className={`payment-method-btn ${selectedMethod === method.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedMethod(method.id)
                        setShowPaymentForm(true)
                      }}
                      disabled={!service}
                    >
                      <div className="method-icon">
                        {renderMethodIcon(method.icon)}
                      </div>
                      <div className="method-info">
                        <span className="method-name">{method.name}</span>
                        <span className="method-desc">{method.description}</span>
                      </div>
                      {selectedMethod === method.id && (
                        <div className="method-check">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                
                {paymentMethod && (
                  <div className="method-details">
                    <div className="method-detail-row">
                      <span>Processing Time:</span>
                      <span>{paymentMethod.processingTime}</span>
                    </div>
                    <div className="method-detail-row">
                      <span>Transaction Fee:</span>
                      <span>{paymentMethod.fee}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Form */}
            {showPaymentForm && selectedMethod && service && (
              <div className="app-page-card payment-form-card">
                <h3 className="payment-section-title">
                  <span className="step-number">3</span>
                  Complete Payment
                </h3>
                
                <div className="payment-form-content">
                  {/* Card Payment Form */}
                  {selectedMethod === 'card' && (
                    <form onSubmit={handlePayment} className="card-form">
                      <div className="form-row">
                        <div className="payment-form-group full">
                          <label>Card Number</label>
                          <input 
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={cardForm.cardNumber}
                            onChange={(e) => setCardForm({...cardForm, cardNumber: e.target.value})}
                            maxLength="19"
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="payment-form-group full">
                          <label>Cardholder Name</label>
                          <input 
                            type="text"
                            placeholder="John Doe"
                            value={cardForm.cardHolder}
                            onChange={(e) => setCardForm({...cardForm, cardHolder: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="form-row two-col">
                        <div className="payment-form-group">
                          <label>Expiry Date</label>
                          <input 
                            type="text"
                            placeholder="MM/YY"
                            value={cardForm.expiry}
                            onChange={(e) => setCardForm({...cardForm, expiry: e.target.value})}
                            maxLength="5"
                          />
                        </div>
                        <div className="payment-form-group">
                          <label>CVV</label>
                          <input 
                            type="text"
                            placeholder="123"
                            value={cardForm.cvv}
                            onChange={(e) => setCardForm({...cardForm, cvv: e.target.value})}
                            maxLength="4"
                          />
                        </div>
                      </div>
                      <div className="card-brands">
                        <span className="brand visa">VISA</span>
                        <span className="brand mastercard">MC</span>
                        <span className="brand amex">AMEX</span>
                      </div>
                    </form>
                  )}

                  {/* Bank Transfer Info */}
                  {selectedMethod === 'bank' && (
                    <div className="bank-info">
                      <p className="bank-instruction">Please transfer the exact amount to the following bank account:</p>
                      <div className="bank-details">
                        <div className="bank-row">
                          <span className="bank-label">Bank Name</span>
                          <span className="bank-value">{BANK_INFO.bankName}</span>
                        </div>
                        <div className="bank-row">
                          <span className="bank-label">Account Name</span>
                          <span className="bank-value">{BANK_INFO.accountName}</span>
                        </div>
                        <div className="bank-row">
                          <span className="bank-label">Account Number</span>
                          <span className="bank-value">{BANK_INFO.accountNumber}</span>
                        </div>
                        <div className="bank-row">
                          <span className="bank-label">Routing Number</span>
                          <span className="bank-value">{BANK_INFO.routingNumber}</span>
                        </div>
                        <div className="bank-row">
                          <span className="bank-label">SWIFT Code</span>
                          <span className="bank-value">{BANK_INFO.swiftCode}</span>
                        </div>
                        <div className="bank-row">
                          <span className="bank-label">IBAN</span>
                          <span className="bank-value">{BANK_INFO.iban}</span>
                        </div>
                        <div className="bank-row highlight">
                          <span className="bank-label">Reference</span>
                          <span className="bank-value">{BANK_INFO.reference}</span>
                        </div>
                      </div>
                      <p className="bank-note">Please include the reference number in your transfer. Your order will be processed once the payment is confirmed.</p>
                    </div>
                  )}

                  {/* PayPal */}
                  {selectedMethod === 'paypal' && (
                    <div className="paypal-info">
                      <div className="paypal-logo">
                        <svg width="80" height="24" viewBox="0 0 100 30">
                          <text x="0" y="22" fill="#003087" fontFamily="Arial" fontWeight="bold" fontSize="20">Pay</text>
                          <text x="35" y="22" fill="#009cde" fontFamily="Arial" fontWeight="bold" fontSize="20">Pal</text>
                        </svg>
                      </div>
                      <p>You will be redirected to PayPal to complete your payment securely.</p>
                      <button type="button" className="paypal-btn" onClick={handlePayment}>
                        Pay with PayPal
                      </button>
                    </div>
                  )}

                  {/* Crypto Payment */}
                  {selectedMethod.startsWith('crypto') && (
                    <div className="crypto-info">
                      <p className="crypto-instruction">Send the exact amount to the following wallet address:</p>
                      
                      {selectedMethod === 'crypto-btc' && (
                        <div className="crypto-details">
                          <div className="crypto-network">Network: Bitcoin (BTC)</div>
                          <div className="crypto-address">
                            <span className="address-label">Wallet Address</span>
                            <div className="address-box">
                              <code>{CRYPTO_WALLETS.btc}</code>
                              <button type="button" className="copy-btn" onClick={() => navigator.clipboard.writeText(CRYPTO_WALLETS.btc)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="crypto-qr">
                            <div className="qr-placeholder">[QR Code]</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedMethod === 'crypto-eth' && (
                        <div className="crypto-details">
                          <div className="crypto-network">Network: Ethereum (ERC-20)</div>
                          <div className="crypto-address">
                            <span className="address-label">Wallet Address</span>
                            <div className="address-box">
                              <code>{CRYPTO_WALLETS.eth}</code>
                              <button type="button" className="copy-btn" onClick={() => navigator.clipboard.writeText(CRYPTO_WALLETS.eth)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="crypto-qr">
                            <div className="qr-placeholder">[QR Code]</div>
                          </div>
                        </div>
                      )}
                      
                      {selectedMethod === 'crypto-usdt' && (
                        <div className="crypto-details">
                          <div className="crypto-network">Network: USDT (ERC-20)</div>
                          <div className="crypto-address">
                            <span className="address-label">Wallet Address</span>
                            <div className="address-box">
                              <code>{CRYPTO_WALLETS.usdt}</code>
                              <button type="button" className="copy-btn" onClick={() => navigator.clipboard.writeText(CRYPTO_WALLETS.usdt)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="crypto-qr">
                            <div className="qr-placeholder">[QR Code]</div>
                          </div>
                        </div>
                      )}
                      
                      <p className="crypto-note">
                        <strong>Important:</strong> Send only the specified cryptocurrency to this address. 
                        Sending any other currency may result in permanent loss of funds.
                      </p>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="order-summary">
                    <h4>Order Summary</h4>
                    <div className="summary-row">
                      <span>{service.name} × {quantity}</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {fee > 0 && (
                      <div className="summary-row fee">
                        <span>Processing Fee</span>
                        <span>{formatCurrency(fee)}</span>
                      </div>
                    )}
                    <div className="summary-row total">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    
                    {selectedMethod === 'card' && (
                      <button type="button" className="pay-btn" onClick={handlePayment}>
                        Pay {formatCurrency(total)}
                      </button>
                    )}
                    
                    {selectedMethod === 'bank' && (
                      <button type="button" className="pay-btn secondary" onClick={handlePayment}>
                        I've Made the Transfer
                      </button>
                    )}
                    
                    {selectedMethod.startsWith('crypto') && (
                      <button type="button" className="pay-btn secondary" onClick={handlePayment}>
                        I've Sent the Payment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transaction History Tab */}
        {activeTab === 'history' && (
          <div className="app-page-card">
            <h3 className="payment-section-title">Transaction History</h3>
            {userTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#888' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 12px' }}>
                  <path d="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" stroke="#ccc" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#666' }}>No transactions yet</p>
                <p style={{ fontSize: 13 }}>Your payment history will appear here once you make a purchase or upgrade your plan.</p>
              </div>
            ) : (
              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Service</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      {isSuperAdmin && <th>User</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {userTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="invoice-id">{tx.invoiceId || tx.id}</td>
                        <td>{tx.date ? new Date(tx.date).toLocaleDateString() : '—'}</td>
                        <td>
                          <span className={`method-badge ${tx.type === 'plan_upgrade' ? 'card' : tx.type === 'plan_downgrade' ? 'bank' : ''}`}>
                            {tx.type === 'plan_upgrade' ? 'Upgrade' : tx.type === 'plan_downgrade' ? 'Downgrade' : tx.type === 'service_payment' ? 'Service' : tx.type === 'subscription_renewal' ? 'Renewal' : tx.type || '—'}
                          </span>
                        </td>
                        <td>{tx.service || '—'}</td>
                        <td className="amount">{formatCurrency(tx.amount || 0)}</td>
                        <td>
                          <span className={`method-badge ${tx.method || ''}`}>
                            {PAYMENT_METHODS.find(m => m.id === tx.method)?.name || tx.method || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${tx.status || ''}`}>
                            {tx.status || '—'}
                          </span>
                        </td>
                        {isSuperAdmin && <td style={{ fontSize: 12, color: '#666' }}>{tx.userEmail || '—'}<br/>{tx.companyName || ''}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Billing Info Tab */}
        {activeTab === 'billing' && (
          <div className="app-page-card">
            <h3 className="payment-section-title">Billing Information</h3>
            <form className="billing-form" onSubmit={(e) => { e.preventDefault(); alert('Billing info saved!') }}>
              <div className="form-section">
                <h4>Company Details</h4>
                <div className="form-row two-col">
                  <div className="payment-form-group">
                    <label>Company Name</label>
                    <input 
                      type="text"
                      value={billingInfo.companyName}
                      onChange={(e) => setBillingInfo({...billingInfo, companyName: e.target.value})}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className="payment-form-group">
                    <label>VAT / Tax Number</label>
                    <input 
                      type="text"
                      value={billingInfo.vatNumber}
                      onChange={(e) => setBillingInfo({...billingInfo, vatNumber: e.target.value})}
                      placeholder="Enter VAT number"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h4>Contact Information</h4>
                <div className="form-row two-col">
                  <div className="payment-form-group">
                    <label>Contact Name</label>
                    <input 
                      type="text"
                      value={billingInfo.contactName}
                      onChange={(e) => setBillingInfo({...billingInfo, contactName: e.target.value})}
                      placeholder="Enter contact name"
                    />
                  </div>
                  <div className="payment-form-group">
                    <label>Email Address</label>
                    <input 
                      type="email"
                      value={billingInfo.email}
                      onChange={(e) => setBillingInfo({...billingInfo, email: e.target.value})}
                      placeholder="Enter email"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="payment-form-group">
                    <label>Phone Number</label>
                    <input 
                      type="tel"
                      value={billingInfo.phone}
                      onChange={(e) => setBillingInfo({...billingInfo, phone: e.target.value})}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h4>Billing Address</h4>
                <div className="form-row">
                  <div className="payment-form-group full">
                    <label>Street Address</label>
                    <input 
                      type="text"
                      value={billingInfo.address}
                      onChange={(e) => setBillingInfo({...billingInfo, address: e.target.value})}
                      placeholder="Enter street address"
                    />
                  </div>
                </div>
                <div className="form-row three-col">
                  <div className="payment-form-group">
                    <label>City</label>
                    <input 
                      type="text"
                      value={billingInfo.city}
                      onChange={(e) => setBillingInfo({...billingInfo, city: e.target.value})}
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="payment-form-group">
                    <label>Country</label>
                    <input 
                      type="text"
                      value={billingInfo.country}
                      onChange={(e) => setBillingInfo({...billingInfo, country: e.target.value})}
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="payment-form-group">
                    <label>Postal Code</label>
                    <input 
                      type="text"
                      value={billingInfo.postalCode}
                      onChange={(e) => setBillingInfo({...billingInfo, postalCode: e.target.value})}
                      placeholder="Enter postal code"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="save-btn">Save Billing Information</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
