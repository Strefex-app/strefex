import AuthPageBackdrop from './AuthPageBackdrop'
import { AUTH_LOGO_WHITE } from '../constants/authPageAssets'

/**
 * Login / Register / Verify Email — form-focused layout (intro lives on marketing home).
 */
export default function AuthPageShell({
  children,
  contentMaxWidth = 500,
}) {
  return (
    <div className="auth-page-shell">
      <AuthPageBackdrop />
      <div className="auth-page-shell__foreground">
        <header className="auth-page-shell__logo-wrap">
          <img
            src={AUTH_LOGO_WHITE}
            alt="STREFEX"
            className="auth-page-shell__logo"
            width={320}
            height={120}
            decoding="async"
            loading="eager"
          />
        </header>

        <div
          className="auth-page-shell__content"
          style={{ maxWidth: contentMaxWidth }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
