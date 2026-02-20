import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { useServiceStore } from '../store/serviceStore'
import { getEffectiveLimits } from '../services/stripeService'
import '../styles/app-page.css'
import './Home.css'

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
  const maxServiceCategories = isSuperAdmin ? Infinity : (limits.maxServiceCategories ?? 1)
  const allServicesOpen = maxServiceCategories === Infinity

  const selectedServices = useServiceStore((s) => s.selectedServices)
  const selectService = useServiceStore((s) => s.selectService)
  const isServiceSelected = useServiceStore((s) => s.isServiceSelected)

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
            Service
          </h2>
          <p className="app-page-subtitle">
            {isServiceProvider
              ? 'Register your expertise in service categories or request services through Quick Actions.'
              : 'Browse available service categories. Use Quick Actions on the Home page to request a service.'}
          </p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {SERVICE_CATEGORIES.map((cat) => {
            const chosen = isServiceSelected(cat.id)
            const slotsLeft = maxServiceCategories - selectedServices.length
            const canPick = slotsLeft > 0 || allServicesOpen

            return (
              <div key={cat.id} className="app-page-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{
                  padding: '24px 28px',
                  borderLeft: `4px solid ${cat.color}`,
                  display: 'flex', gap: 20, alignItems: 'flex-start',
                }}>
                  <span style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: cat.color, flexShrink: 0,
                  }}>
                    {cat.icon}
                  </span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a1a2e' }}>{cat.label}</h3>
                      {chosen && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}>Registered</span>}
                    </div>
                    <p style={{ margin: '0 0 12px', fontSize: 14, color: '#666', lineHeight: 1.5 }}>{cat.description}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {cat.items.map((item, idx) => (
                        <span key={idx} style={{
                          fontSize: 12, padding: '4px 10px', borderRadius: 6,
                          background: '#f1f5f9', color: '#475569', fontWeight: 500,
                        }}>
                          {item}
                        </span>
                      ))}
                    </div>

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

                      {/* Request Service button (for everyone) */}
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
                        Request a Service
                      </button>

                      {/* Add Supplier button */}
                      <button
                        type="button"
                        onClick={() => {
                          const p = new URLSearchParams({
                            context: 'service',
                            serviceCategory: cat.id,
                            serviceCategoryLabel: cat.label,
                          })
                          navigate(`/add-supplier?${p.toString()}`)
                        }}
                        style={{
                          padding: '8px 20px', borderRadius: 8,
                          border: `1px solid ${cat.color}`, background: 'transparent',
                          color: cat.color, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                        }}
                      >
                        Add Supplier
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
