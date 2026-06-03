import AuthPageBackdrop from './AuthPageBackdrop'
import { AUTH_LOGO_WHITE } from '../constants/authPageAssets'

/**
 * Login / Register layout — navy backdrop + white logo (change only when requested).
 */
export default function AuthPageShell({ children, contentMaxWidth = 500 }) {
  return (
    <div className="auth-page-shell">
      <AuthPageBackdrop />
      <div className="auth-page-shell__foreground" style={{ maxWidth: contentMaxWidth }}>
        <header className="auth-page-shell__logo-wrap">
          <img
            src={AUTH_LOGO_WHITE}
            alt="STREFEX"
            className="auth-page-shell__logo"
            width={320}
            height={120}
            decoding="async"
            loading="lazy"
          />
        </header>
        <div className="auth-page-shell__content">{children}</div>
      </div>
    </div>
  )
}
