import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useTranslation } from '../i18n/useTranslation'
import { tenantKey } from '../utils/tenantStorage'
import Icon from './Icon'
import './AppLayout.css'

/*
 * Sidebar items with optional gating:
 *   minRole      — RBAC role requirement (unchanged)
 *   requiredPlan — subscription feature flag key from plan.limits
 *                  Items with requiredPlan are hidden if the feature is false.
 *
 * Order: common items first, then admin, then utility at the bottom.
 * Management modules (Project, Production, Enterprise, Cost) are grouped
 * under a single "Management" item that links to the /management hub page.
 * The hub page shows all modules — locked ones display an upgrade prompt.
 */
const SIDEBAR_NAV = [
  { id: 'home', tKey: 'nav.home', path: '/main-menu', icon: 'home' },
  { id: 'profile', tKey: 'nav.profile', path: '/profile', icon: 'profile' },
  { id: 'buyer-workspace', label: 'Buyer Workspace', path: '/dashboard/buyer', icon: 'management' },
  { id: 'supplier-workspace', label: 'Supplier Workspace', path: '/dashboard/supplier', icon: 'vendors' },
  { id: 'supplier-dashboard', label: 'Supplier Dashboard', path: '/supplier-dashboard', icon: 'vendors' },
  { id: 'management', tKey: 'nav.management', path: '/management', icon: 'management' },
  { id: 'service-requests', tKey: 'nav.serviceRequests', path: '/service-requests', icon: 'service-requests' },
  { id: 'messenger', tKey: 'nav.messenger', path: '/messenger', icon: 'messenger', requiredPlan: 'messenger' },
  { id: 'notifications', tKey: 'nav.notifications', path: '/notifications', icon: 'notifications' },
  { id: 'support', tKey: 'nav.support', path: '/support', icon: 'support' },
  { id: 'ai-insights', label: 'AI Insights', path: '/ai-insights', icon: 'ai', requiredPlan: 'aiInsights', minRole: 'manager' },
  { id: 'templates', label: 'Templates', path: '/templates', icon: 'templates', requiredPlan: 'templateLibrary' },
  { id: 'admin-approvals', label: 'Admin Approvals', path: '/admin/approvals', icon: 'admin-dashboard', minRole: 'admin' },
  { id: 'supplier-governance', label: 'Supplier Governance', path: '/admin/supplier-governance', icon: 'admin-dashboard', minRole: 'superadmin' },
  { id: 'data-ingestion', label: 'Data Ingestion', path: '/admin/data-ingestion', icon: 'admin-dashboard', minRole: 'superadmin' },
  { id: 'payment', tKey: 'nav.payment', path: '/payment', icon: 'card' },
  { id: 'plans', tKey: 'nav.plans', path: '/plans', icon: 'plan' },
  { id: 'settings', tKey: 'nav.settings', path: '/settings', icon: 'settings' },
  { id: 'admin-dashboard', tKey: 'nav.adminDashboard', path: '/admin-dashboard', icon: 'admin-dashboard', minRole: 'superadmin', hideInPreview: true },
  { id: 'developer', tKey: 'nav.developer', path: '/developer', icon: 'developer', minRole: 'superadmin', hideInPreview: true },
]

/* getNavIcon — uses centralised Icon component */
const getNavIcon = (iconName) => <Icon name={iconName} size={24} />

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const role = useAuthStore((state) => state.role)
  const hasRole = useAuthStore((state) => state.hasRole)
  const user = useAuthStore((state) => state.user)
  const theme = useSettingsStore((s) => s.theme)
  const { t } = useTranslation()

  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const currentPlanId = useSubscriptionStore((s) => s.planId)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const requestNotifSummary = useServiceRequestStore((s) =>
    s.getNotificationSummary(user?.email)
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [previewTimeLeft, setPreviewTimeLeft] = useState(null) // seconds remaining
  const unreadNotificationCount = requestNotifSummary?.unreadCount || 0

  /* Keep data-theme in sync on every render */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  /* Close mobile drawer on navigation */
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  /* Always start each route at the top */
  useEffect(() => {
    const resetScrollTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      const appMain = document.querySelector('.app-main')
      if (appMain) appMain.scrollTop = 0
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
    resetScrollTop()
    const raf = requestAnimationFrame(resetScrollTop)
    return () => cancelAnimationFrame(raf)
  }, [location.pathname, location.search])

  /* ── Preview session countdown (10-min) ─────────────────── */
  useEffect(() => {
    const previewKey = tenantKey('strefex-preview-expires')
    const expiresRaw = localStorage.getItem(previewKey)
    if (!expiresRaw) { setPreviewTimeLeft(null); return }
    const expiresAt = Number(expiresRaw)
    if (isNaN(expiresAt)) { setPreviewTimeLeft(null); return }

    const tick = () => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000))
      if (remaining <= 0) {
        // Session expired — clean up and log out
        localStorage.removeItem(previewKey)
        setPreviewTimeLeft(null)
        logout()
        navigate('/login')
        return
      }
      setPreviewTimeLeft(remaining)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [logout, navigate])

  const handleLogout = () => {
    localStorage.removeItem(tenantKey('strefex-preview-expires'))
    logout()
    navigate('/login')
  }

  const displayName = user?.fullName || user?.name || user?.email || 'User'
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const roleLabels = { superadmin: 'Super Admin', auditor_external: 'Auditor (External)', admin: 'Admin', auditor_internal: 'Auditor (Internal)', manager: 'Manager', user: 'User' }
  const roleLabel = roleLabels[role] || 'User'

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Icon name="menu" size={24} />
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/assets/strefex-logo.png" alt="STREFEX" className="sidebar-logo-img" />
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {SIDEBAR_NAV
            .filter((item) => !item.minRole || hasRole(item.minRole))
            .filter((item) => !item.requiredPlan || hasFeature(item.requiredPlan))
            .filter((item) => !item.hideInPreview || previewTimeLeft === null)
            .map((item) => {
              const isActive = location.pathname === item.path ||
                (item.id === 'management' && (
                  location.pathname.startsWith('/management') ||
                  location.pathname.startsWith('/team') ||
                  location.pathname.startsWith('/project-management') ||
                  location.pathname.startsWith('/production') ||
                  location.pathname.startsWith('/cost-management') ||
                  location.pathname.startsWith('/enterprise')
                )) ||
                (item.id === 'templates' && location.pathname.startsWith('/templates')) ||
                (item.id === 'ai-insights' && location.pathname.startsWith('/ai-insights'))
              return (
                <button
                  key={item.id}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className="sidebar-nav-icon">
                    {getNavIcon(item.icon)}
                    {item.id === 'notifications' && unreadNotificationCount > 0 && (
                      <span className="sidebar-notif-badge">+{unreadNotificationCount > 99 ? '99' : unreadNotificationCount}</span>
                    )}
                  </span>
                  <span className="sidebar-nav-label">{item.tKey ? t(item.tKey) : item.label}</span>
                </button>
              )
            })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-profile" onClick={() => navigate('/profile')}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{user?.name || 'User'}</span>
              <span className="sidebar-profile-role">
                {roleLabel}
                <span
                  className="sidebar-plan-badge"
                  onClick={(e) => { e.stopPropagation(); navigate('/plans') }}
                  title="Click to manage subscription"
                >
                  {accountType === 'buyer' ? 'B' : accountType === 'service_provider' ? 'SP' : accountType === 'auditor' ? 'A' : 'S'} · {currentPlanId === 'start' ? 'Free' : currentPlanId.charAt(0).toUpperCase() + currentPlanId.slice(1)}
                </span>
              </span>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <Icon name="logout" size={20} />
            <span className="sidebar-logout-label">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
      <main className="app-main">
        {/* Preview session countdown banner */}
        {previewTimeLeft !== null && previewTimeLeft > 0 && (
          <div className={`preview-timer-banner ${previewTimeLeft <= 60 ? 'preview-timer-urgent' : ''}`}>
            <Icon name="clock" size={16} />
            <span>
              Preview session — <strong>{Math.floor(previewTimeLeft / 60)}:{(previewTimeLeft % 60).toString().padStart(2, '0')}</strong> remaining
            </span>
            <span className="preview-timer-note">Supplier names are hidden</span>
            <button
              type="button"
              className="preview-timer-register-btn"
              onClick={() => { localStorage.removeItem(tenantKey('strefex-preview-expires')); logout(); navigate('/register') }}
            >
              Register Now
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
