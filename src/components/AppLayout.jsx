import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useTranslation } from '../i18n/useTranslation'
import { LANGUAGES } from '../i18n/languages'
import { useSettingsStore } from '../store/settingsStore'
import { tenantKey } from '../utils/tenantStorage'
import NavIcon from './NavIcon'
import GlobalPageBreadcrumb from './shared/GlobalPageBreadcrumb'
import DemoModeBanner from './DemoModeBanner'
import SyncErrorBanner from './SyncErrorBanner'
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
  { id: 'calendar', tKey: 'nav.calendar', path: '/calendar', icon: 'calendar' },
  { id: 'home', tKey: 'nav.home', path: '/main-menu', icon: 'home' },
  { id: 'profile', tKey: 'nav.profile', path: '/profile', icon: 'profile' },
  /* Hubs: Buyers, Manufacturers (seller + SP), Admin */
  { id: 'procurement-hub', label: 'Buyers', path: '/hub/procurement', icon: 'package' },
  { id: 'partner-hub', label: 'Manufacturers', path: '/hub/partner', icon: 'vendors', supplierSide: true },
  { id: 'management', tKey: 'nav.management', path: '/management', icon: 'management' },
  { id: 'messenger', tKey: 'nav.messenger', path: '/messenger', icon: 'messenger', requiredPlan: 'messenger' },
  { id: 'notifications', tKey: 'nav.notifications', path: '/notifications', icon: 'notifications' },
  { id: 'support', tKey: 'nav.support', path: '/support', icon: 'support' },
  { id: 'ai-insights', label: 'AI Insights', path: '/management/platform/ai-insights', icon: 'ai', requiredPlan: 'aiInsights', minRole: 'manager' },
  { id: 'governance-hub', label: 'Admin', path: '/hub/governance', icon: 'shield', minRole: 'admin' },
  { id: 'plans', tKey: 'nav.plans', path: '/plans', icon: 'plan' },
  { id: 'settings', tKey: 'nav.settings', path: '/settings', icon: 'settings' },
]

/* getNavIcon — chrome glyphs only (NavIcon), not the full page icon map */
const getNavIcon = (iconName) => <NavIcon name={iconName} size={24} />

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const sessionMode = useAuthStore((state) => state.sessionMode)
  const isDemoSession = sessionMode === 'demo'
  const role = useAuthStore((state) => state.role)
  const hasRole = useAuthStore((state) => state.hasRole)
  const user = useAuthStore((state) => state.user)
  const { t } = useTranslation()
  const theme = useSettingsStore((s) => s.theme)
  const toggleTheme = useSettingsStore((s) => s.toggleTheme)
  const language = useSettingsStore((s) => s.language)
  const setLanguage = useSettingsStore((s) => s.setLanguage)

  const hasFeature = useSubscriptionStore((s) => s.hasFeature)
  const currentPlanId = useSubscriptionStore((s) => s.planId)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const requestNotifSummary = useServiceRequestStore((s) =>
    s.getNotificationSummary(user?.email)
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const [previewTimeLeft, setPreviewTimeLeft] = useState(null) // seconds remaining
  const unreadNotificationCount = requestNotifSummary?.unreadCount || 0

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
        navigate('/', { replace: true })
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
    navigate('/', { replace: true })
  }

  const displayName = user?.fullName || user?.name || user?.email || 'User'
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const roleLabels = { superadmin: 'Super Admin', auditor_external: 'Auditor (External)', admin: 'Admin', auditor_internal: 'Auditor (Internal)', manager: 'Manager', user: 'User' }
  const roleLabel = roleLabels[role] || 'User'

  const showSupplierSideNav =
    role === 'superadmin' || accountType === 'seller' || accountType === 'service_provider'

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <NavIcon name="menu" size={24} />
      </button>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <img src="/assets/strefex-logo-user-exact.png" alt="STREFEX" className="sidebar-logo-img" />
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <NavIcon name="close" size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {SIDEBAR_NAV
            .filter((item) => !item.supplierSide || showSupplierSideNav)
            .filter((item) => !item.minRole || hasRole(item.minRole))
            .filter((item) => !item.requiredPlan || hasFeature(item.requiredPlan))
            .filter((item) => !item.hideInPreview || previewTimeLeft === null)
            .map((item) => {
              const isActive = location.pathname === item.path ||
                (item.id === 'procurement-hub' && (
                  location.pathname.startsWith('/hub/procurement') ||
                  location.pathname.startsWith('/dashboard/buyer')
                )) ||
                (item.id === 'partner-hub' && (
                  location.pathname.startsWith('/hub/partner') ||
                  location.pathname.startsWith('/dashboard/supplier') ||
                  location.pathname.startsWith('/supplier-dashboard') ||
                  location.pathname.startsWith('/service-requests') ||
                  location.pathname.startsWith('/service-provider-dashboard') ||
                  location.pathname.startsWith('/seller-dashboard')
                )) ||
                (item.id === 'governance-hub' && (
                  location.pathname.startsWith('/hub/governance') ||
                  location.pathname.startsWith('/admin/approvals') ||
                  location.pathname.startsWith('/admin/approve') ||
                  location.pathname.startsWith('/admin/supplier-governance') ||
                  location.pathname.startsWith('/admin/data-ingestion') ||
                  location.pathname.startsWith('/admin-dashboard') ||
                  location.pathname.startsWith('/developer')
                )) ||
                (item.id === 'management' && (
                  location.pathname.startsWith('/management') ||
                  location.pathname.startsWith('/team') ||
                  location.pathname.startsWith('/project-management') ||
                  location.pathname.startsWith('/production') ||
                  location.pathname.startsWith('/cost-management') ||
                  location.pathname.startsWith('/enterprise')
                )) ||
                (item.id === 'ai-insights' && (
                  location.pathname.startsWith('/management/platform/ai-insights') ||
                  location.pathname.startsWith('/ai-insights')
                )) ||
                (item.id === 'calendar' && location.pathname === '/calendar')
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
          <div className="sidebar-footer-user-row">
            <div className="sidebar-profile sidebar-profile--avatar-only" onClick={() => navigate('/profile')}>
              <div className="sidebar-avatar-wrap" tabIndex={0}>
                <div className="sidebar-avatar">{initials}</div>
                <div className="sidebar-profile-tooltip" role="tooltip">
                  <div className="sidebar-profile-tooltip-name">{displayName}</div>
                  <div className="sidebar-profile-tooltip-meta">{roleLabel}</div>
                  <div className="sidebar-profile-tooltip-plan">
                    <button
                      type="button"
                      className="sidebar-profile-tooltip-plan-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate('/plans')
                      }}
                    >
                      {accountType === 'buyer' ? 'Buyer' : accountType === 'service_provider' ? 'Service Provider' : accountType === 'auditor' ? 'Auditor' : 'Seller'}
                      {' · '}
                      {currentPlanId === 'start' ? 'Free' : currentPlanId.charAt(0).toUpperCase() + currentPlanId.slice(1)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="sidebar-footer-quick"
              onClick={(e) => e.stopPropagation()}
              role="group"
              aria-label={t('settings.appearance')}
            >
              <button
                type="button"
                className={`sidebar-pill-toggle ${theme === 'dark' ? 'on' : ''}`}
                onClick={() => toggleTheme()}
                aria-label={theme === 'dark' ? t('nav.switchToLight') : t('nav.switchToDark')}
                aria-pressed={theme === 'dark'}
              >
                <span className="sidebar-pill-toggle-knob" />
              </button>
              <div className="sidebar-lang-pill">
                <label className="sidebar-visually-hidden" htmlFor="sidebar-lang-select">{t('settings.language')}</label>
                <select
                  id="sidebar-lang-select"
                  className="sidebar-lang-select-inner"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  aria-label={t('settings.language')}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <NavIcon name="logout" size={20} />
            <span className="sidebar-logout-label">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
      <main className="app-main">
        {/* Preview session countdown banner */}
        {isDemoSession && <DemoModeBanner onExit={handleLogout} />}
        <SyncErrorBanner />
        {previewTimeLeft !== null && previewTimeLeft > 0 && !isDemoSession && (
          <div className={`preview-timer-banner ${previewTimeLeft <= 60 ? 'preview-timer-urgent' : ''}`}>
            <NavIcon name="clock" size={16} />
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
        <GlobalPageBreadcrumb />
        {children}
      </main>
    </div>
  )
}
