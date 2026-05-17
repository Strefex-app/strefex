import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { useIndustryStore } from '../store/industryStore'
import { getEffectiveLimits } from '../services/stripeService'
import authService from '../services/authService'
import { useTranslation } from '../i18n/useTranslation'
import '../styles/app-page.css'
import './Home.css'
import '../styles/hub-two-col-grid.css'

const INDUSTRIES = [
  { id: 'automotive', tKey: 'industry.automotive', path: '/industry/automotive', descKey: 'industry.description' },
  { id: 'machinery', tKey: 'industry.machinery', path: '/industry/machinery', descKey: 'industry.description' },
  { id: 'electronics', tKey: 'industry.electronics', path: '/industry/electronics', descKey: 'industry.description' },
  { id: 'medical', tKey: 'industry.medical', path: '/industry/medical', descKey: 'industry.description' },
  { id: 'raw-materials', tKey: 'industry.rawMaterials', path: '/industry/raw-materials', descKey: 'industry.description' },
  { id: 'oil-gas', tKey: 'industry.oilGas', path: '/industry/oil-gas', descKey: 'industry.description' },
  { id: 'green-energy', tKey: 'industry.greenEnergy', path: '/industry/green-energy', descKey: 'industry.description' },
  { id: 'household-products', tKey: null, label: 'Household Products', path: '/industry/household-products', descKey: 'industry.description' },
]

const INDUSTRY_ICONS = {
  automotive: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <circle cx="7.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="16.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 18h2M14 18h5a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.63l-3.5-4.35A1 1 0 0 0 15.5 8H3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 18h4" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  machinery: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  electronics: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  medical: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M8 2v4M16 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 14v4M10 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  'raw-materials': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'oil-gas': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8 6 4 9.5 4 14a8 8 0 0 0 16 0c0-4.5-4-8-8-12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 18a4 4 0 0 1-4-4c0-2.5 4-6 4-6s4 3.5 4 6a4 4 0 0 1-4 4z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  'green-energy': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'household-products': (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-6v-6H10v6H4a1 1 0 0 1-1-1V10.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
}

export default function EquipmentHub() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const accountType = useSubscriptionStore((s) => s.accountType)
  const planId = useSubscriptionStore((s) => s.planId)
  const limits = getEffectiveLimits(planId, accountType)
  const maxIndustries = isSuperAdmin ? Infinity : (limits.maxIndustries ?? 1)
  void maxIndustries

  const isServiceProvider = accountType === 'service_provider' && !isSuperAdmin

  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const isSelected = useIndustryStore((s) => s.isSelected)

  const [showPicker, setShowPicker] = useState(false)

  return (
    <AppLayout>
      <div className="app-page">
        <a
          className="app-page-back-link"
          href="/main-menu"
          onClick={(e) => { e.preventDefault(); navigate(-1) }}
        >
          ← Back
        </a>

        <div className="app-page-card">
          <h2 className="app-page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0, 212, 255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00d4ff' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Equipment
          </h2>
          <p className="app-page-subtitle">
            Browse equipment categories across industries. Select an industry to view available equipment suppliers and categories.
          </p>
        </div>

        {isServiceProvider ? (
          <div className="app-page-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
            <p style={{ color: '#888', fontSize: 15 }}>Service Provider accounts do not have access to the Equipment page. Please use the Service section instead.</p>
            <button onClick={() => navigate('/service-hub')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, background: '#00d4ff', color: '#0d0e10', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
              Go to Services
            </button>
          </div>
        ) : (
          <div className="app-page-card">
            <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
              {selectedIndustries.length === 0
                ? 'No industry is linked to this account yet. Register one industry during onboarding.'
                : `Registered in ${selectedIndustries.length} ${selectedIndustries.length === 1 ? 'industry' : 'industries'}. To access another industry, create a separate account registration.`}
            </p>

            <div className="hub-two-col-grid">
              {INDUSTRIES.map((item) => {
                const chosen = isSelected(item.id)

                if (isSuperAdmin || chosen) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(`/industry/${item.id}/equipment`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 16,
                        padding: '16px 20px', borderRadius: 12,
                        background: chosen ? 'rgba(0, 212, 255,.04)' : 'var(--bg-card)',
                        border: chosen ? '2px solid #00d4ff' : '1px solid #e2e8f0',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all .15s',
                      }}
                    >
                      <span style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: chosen ? 'rgba(0, 212, 255,.1)' : '#f8fafc',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: chosen ? '#00d4ff' : '#64748b', flexShrink: 0,
                      }}>
                        {INDUSTRY_ICONS[item.id] || INDUSTRY_ICONS.machinery}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>
                          {item.tKey ? t(item.tKey) : item.label || item.id}
                          {chosen && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}>Registered</span>}
                        </div>
                        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Browse equipment categories and suppliers</div>
                      </div>
                      <span style={{ color: '#00d4ff', fontSize: 20, fontWeight: 300 }}>→</span>
                    </button>
                  )
                }

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShowPicker(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '16px 20px', borderRadius: 12,
                      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      opacity: 1, transition: 'all .15s',
                    }}
                  >
                    <span style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#64748b', flexShrink: 0,
                    }}>
                      {INDUSTRY_ICONS[item.id] || INDUSTRY_ICONS.machinery}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>
                        {item.tKey ? t(item.tKey) : item.label || item.id}
                      </div>
                      <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                        Register this industry through a separate account onboarding
                      </div>
                    </div>
                    <span style={{ color: '#00d4ff', fontSize: 20, fontWeight: 300 }}>+</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Registration confirmation modal */}
        {showPicker && (
          <div className="home-modal-overlay" onClick={() => setShowPicker(false)}>
            <div className="home-modal" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>Register Industry</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#666', lineHeight: 1.5 }}>
                To add{' '}
                <strong>
                  {(() => {
                    const sel = INDUSTRIES.find((i) => i.id === showPicker)
                    return sel?.tKey ? t(sel.tKey) : sel?.label || showPicker
                  })()}
                </strong>
                , log out and create a separate registration for this industry.
                <br />
                <span style={{ color: '#e65100', fontSize: 13 }}>
                  Each industry registration has its own plan and Stripe checkout.
                </span>
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowPicker(false)}
                  style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowPicker(false)
                    await authService.logout().catch(() => {})
                    navigate('/register')
                  }}
                  style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#00d4ff', color: '#0d0e10', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  Sign Out & Register
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
