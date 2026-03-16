import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { useServiceStore } from '../store/serviceStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { getEffectiveLimits } from '../services/stripeService'
import '../styles/app-page.css'
import './Home.css'
import './IndustryHub.css'

const SERVICE_CATEGORIES = [
  {
    id: 'project-management',
    label: 'Project Management',
    description: '2D/3D Design, Engineering, full project lifecycle management',
    color: '#000888',
    bg: 'rgba(0,8,136,.06)',
    items: ['2D/3D Design', 'Engineering', 'Planning', 'Coordination', 'Reporting'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'supplier-services',
    label: 'Supplier Services',
    description: 'Source, audit, trial run, industrialization & production follow-up',
    color: '#e65100',
    bg: 'rgba(230,81,0,.06)',
    items: ['Supplier Source', 'Audit', 'Trial Run', 'Production Follow Up', 'Equipment Acceptance'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'quality-services',
    label: 'Quality & Compliance',
    description: 'Buy-off, shipment acceptance, documentation & quality control',
    color: '#2e7d32',
    bg: 'rgba(46,125,50,.06)',
    items: ['Buy Off', 'Shipment Acceptance', 'Shipment Documentation', 'Industrialization'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
]

export default function ServiceHub() {
  const navigate = useNavigate()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const accountType = useSubscriptionStore((s) => s.accountType)
  const planId = useSubscriptionStore((s) => s.planId)
  const isServiceProvider = accountType === 'service_provider' && !isSuperAdmin
  const limits = getEffectiveLimits(planId, accountType)
  const maxServiceCategories = (isSuperAdmin || isServiceProvider)
    ? Infinity
    : (limits.maxServiceCategories ?? 1)
  const allServicesOpen = maxServiceCategories === Infinity

  const selectedServices = useServiceStore((s) => s.selectedServices)
  const selectService = useServiceStore((s) => s.selectService)
  const isServiceSelected = useServiceStore((s) => s.isServiceSelected)
  const registeredProviders = useAccountRegistry((s) => s.getRegisteredServiceProviders())
  const providerCount = Array.isArray(registeredProviders) ? registeredProviders.length : 0
  const totalServiceItems = useMemo(
    () => SERVICE_CATEGORIES.reduce((sum, cat) => sum + cat.items.length, 0),
    []
  )
  const avgRating = useMemo(() => {
    const ratings = (registeredProviders || [])
      .map((p) => Number(p?.rating))
      .filter((v) => Number.isFinite(v) && v > 0)
    if (ratings.length === 0) return 4.6
    return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
  }, [registeredProviders])

  return (
    <AppLayout>
      <div className="app-page" style={{ maxWidth: 960, margin: '0 auto' }}>
        <a
          className="app-page-back-link"
          href="/main-menu"
          onClick={(e) => { e.preventDefault(); navigate(-1) }}
        >
          ← Back
        </a>

        <div className="app-page-card">
          <h2 className="app-page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(230,81,0,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e65100' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Service Providers
          </h2>
          <p className="app-page-subtitle">
            {isServiceProvider
              ? 'Browse service categories and register your expertise with the same executive summary workflow as Product and Equipment.'
              : 'Browse service provider categories and open executive summary per service path.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div className="industry-hub-indicator-card">
            <div className="industry-hub-indicator-icon blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9L12 2L21 9V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9Z" stroke="currentColor" strokeWidth="2"/><path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
            <div>
              <div className="industry-hub-indicator-value">{SERVICE_CATEGORIES.length}</div>
              <div className="industry-hub-indicator-label">Categories</div>
            </div>
          </div>
          <div className="industry-hub-indicator-card">
            <div className="industry-hub-indicator-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div>
              <div className="industry-hub-indicator-value">{totalServiceItems}</div>
              <div className="industry-hub-indicator-label">Service Items</div>
            </div>
          </div>
          <div className="industry-hub-indicator-card">
            <div className="industry-hub-indicator-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/></svg>
            </div>
            <div>
              <div className="industry-hub-indicator-value">{providerCount > 0 ? `${providerCount}+` : '0'}</div>
              <div className="industry-hub-indicator-label">Providers</div>
            </div>
          </div>
          <div className="industry-hub-indicator-card">
            <div className="industry-hub-indicator-icon orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.7 6.2L21 9l-4.5 4.3L17.5 20 12 16.9 6.5 20l1-6.7L3 9l6.3-.8L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="industry-hub-indicator-value">{avgRating}</div>
              <div className="industry-hub-indicator-label">Avg Rating</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {SERVICE_CATEGORIES.map((cat) => {
            const chosen = isServiceSelected(cat.id)
            const slotsLeft = maxServiceCategories - selectedServices.length
            const canPick = slotsLeft > 0 || allServicesOpen

            return (
              <div
                key={cat.id}
                className="app-page-card"
                style={{
                  padding: '20px 22px',
                  borderRadius: 14,
                  border: '1.5px solid #e2e8f0',
                  background: '#fff',
                }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cat.color, flexShrink: 0,
                  }}>
                    {cat.icon}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>{cat.label}</span>
                      {chosen && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: `${cat.color}16`, color: cat.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Registered</span>}
                    </div>
                    <p style={{ margin: '2px 0 12px', fontSize: 13, color: '#666', lineHeight: 1.45 }}>{cat.description}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                      {cat.items.slice(0, 4).map((item, idx) => (
                        <span key={idx} style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 5,
                          background: '#f1f5f9', color: '#475569', fontWeight: 500,
                        }}>
                          {item}
                        </span>
                      ))}
                      {cat.items.length > 4 && (
                        <span style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 5,
                          background: '#f1f5f9', color: '#888', fontWeight: 500,
                        }}>
                          +{cat.items.length - 4} more
                        </span>
                      )}
                    </div>

                    <span style={{
                      fontSize: 13, fontWeight: 600, color: cat.color,
                      display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10,
                    }}>
                      {cat.items.length} service items → Executive Summary
                    </span>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {/* Service Provider: registration button */}
                      {isServiceProvider && !chosen && (
                        <button
                          type="button"
                          onClick={() => canPick ? selectService(cat.id, maxServiceCategories) : navigate('/plans')}
                          style={{
                            padding: '8px 20px', borderRadius: 8, border: 'none',
                            background: canPick ? cat.color : '#e2e8f0',
                            color: canPick ? '#fff' : '#888',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer',
                          }}
                        >
                          {canPick ? 'Register Expertise' : 'Upgrade to Register'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const p = new URLSearchParams({
                            serviceCategory: cat.id,
                            serviceCategoryLabel: cat.label,
                          })
                          navigate(`/service-hub/executive-summary?${p.toString()}`)
                        }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          padding: '7px 12px', borderRadius: 8, border: 'none',
                          background: cat.color, color: '#fff',
                          fontWeight: 600, fontSize: 12, cursor: 'pointer',
                        }}
                      >
                        Executive Summary
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const p = new URLSearchParams({
                            context: 'service',
                            serviceCategory: cat.id,
                            serviceCategoryLabel: cat.label,
                          })
                          navigate(`/services?${p.toString()}`)
                        }}
                        style={{
                          padding: '8px 20px', borderRadius: 8, border: 'none',
                          background: cat.color, color: '#fff',
                          fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        Browse Services
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const p = new URLSearchParams({
                            context: 'service',
                            serviceCategory: cat.id,
                            serviceCategoryLabel: cat.label,
                          })
                          navigate(`/request-service?${p.toString()}`)
                        }}
                        style={{
                          padding: '8px 20px', borderRadius: 8,
                          border: `1px solid ${cat.color}`, background: 'transparent',
                          color: cat.color, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        Request a Service
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
