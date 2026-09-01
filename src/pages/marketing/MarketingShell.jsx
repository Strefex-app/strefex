import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AUTH_LOGO_WHITE } from '../../constants/authPageAssets'
import { useAuthStore } from '../../store/authStore'
import './Marketing.css'

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/intro/buyers', label: 'For buyers' },
  { to: '/intro/manufacturers', label: 'For manufacturers' },
  { to: '/intro/how-it-works', label: 'How it works' },
]

function AuthActions() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (isAuthenticated) {
    return (
      <Link to="/main-menu" className="mkt-btn mkt-btn--primary mkt-btn--sm">
        Open workspace
      </Link>
    )
  }
  return (
    <>
      <Link to="/login" className="mkt-btn mkt-btn--ghost mkt-btn--sm">Sign in</Link>
      <Link to="/register" className="mkt-btn mkt-btn--primary mkt-btn--sm">Sign up</Link>
    </>
  )
}

export default function MarketingShell() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'

  // Landing page is a full self-contained site (its own header/footer).
  if (isLanding) {
    return (
      <div className="mkt mkt--embed">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="mkt">
      <header className="mkt-nav">
        <Link to="/" className="mkt-nav__brand" aria-label="STREFEX home">
          <img src={AUTH_LOGO_WHITE} alt="STREFEX" className="mkt-nav__logo" width={160} height={48} />
        </Link>
        <nav className="mkt-nav__links" aria-label="Marketing">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mkt-nav__link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mkt-nav__actions">
          <AuthActions />
        </div>
      </header>
      <Outlet />
      <footer className="mkt-footer">
        <div className="mkt-footer__inner">
          <p className="mkt-footer__brand">STREFEX</p>
          <p className="mkt-footer__copy stx-text-wrap">
            Evidence-backed industrial sourcing, plant quality, and company management modules.
          </p>
          <div className="mkt-footer__actions">
            <AuthActions />
          </div>
          <p className="mkt-footer__meta">www.strefex.pro</p>
        </div>
      </footer>
    </div>
  )
}
