import { Link, useNavigate } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import Icon from '../../components/Icon'
import { useAuthStore } from '../../store/authStore'
import '../../styles/app-page.css'
import './HubPages.css'

/**
 * Admin & superadmin tools: approvals, governance, data pipeline, consoles.
 */
export default function GovernanceHub() {
  const navigate = useNavigate()
  const hasRole = useAuthStore((s) => s.hasRole)
  const isSuperAdmin = hasRole('superadmin')
  const isAdmin = hasRole('admin')

  return (
    <AppLayout>
      <div className="app-page hub-landing">
        <button type="button" className="app-page-back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div className="app-page-card">
          <h1 className="hub-landing__title">Admin</h1>
          <p className="hub-landing__subtitle">
            Approvals, governance, data imports, and platform tools — scoped by your role.
          </p>
        </div>

        <div className="app-page-card">
          <h2 className="hub-landing__section-label">Administration</h2>
          <div className="hub-landing__grid">
            {isAdmin && (
              <Link to="/admin/approvals" className="hub-landing__card stx-click-feedback">
                <span className="hub-landing__card-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Icon name="check-square" size={22} />
                </span>
                <h3 className="hub-landing__card-title">Supplier approvals</h3>
                <p className="hub-landing__card-desc">
                  Review onboarding submissions, change status, notify suppliers by email.
                </p>
              </Link>
            )}
            {isSuperAdmin && (
              <>
                <Link to="/admin/supplier-governance" className="hub-landing__card stx-click-feedback">
                  <span className="hub-landing__card-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                    <Icon name="shield" size={22} />
                  </span>
                  <h3 className="hub-landing__card-title">Supplier governance</h3>
                  <p className="hub-landing__card-desc">
                    Ownership rules, claims, and supplier master governance.
                  </p>
                </Link>
                <Link to="/admin/data-ingestion" className="hub-landing__card stx-click-feedback">
                  <span className="hub-landing__card-icon" style={{ background: 'var(--accent-light)', color: 'var(--accent-text)' }}>
                    <Icon name="clipboard" size={22} />
                  </span>
                  <h3 className="hub-landing__card-title">Data pipeline import</h3>
                  <p className="hub-landing__card-desc">
                    CSV upload into the raw supplier ingestion queue (separate from directory XLSX).
                  </p>
                </Link>
                <Link to="/admin-dashboard" className="hub-landing__card stx-click-feedback">
                  <span className="hub-landing__card-icon" style={{ background: 'rgba(176, 96, 255, 0.14)', color: 'var(--rfqi-purple, #b060ff)' }}>
                    <Icon name="admin-dashboard" size={22} />
                  </span>
                  <h3 className="hub-landing__card-title">Super Admin dashboard</h3>
                  <p className="hub-landing__card-desc">
                    Cross-tenant overview, trials, and platform controls.
                  </p>
                </Link>
                <Link to="/developer" className="hub-landing__card stx-click-feedback">
                  <span className="hub-landing__card-icon" style={{ background: 'var(--bg-surface-hover)', color: 'var(--color-muted)' }}>
                    <Icon name="developer" size={22} />
                  </span>
                  <h3 className="hub-landing__card-title">Developer tools</h3>
                  <p className="hub-landing__card-desc">
                    Technical diagnostics and integration utilities.
                  </p>
                </Link>
              </>
            )}
          </div>
          {!isAdmin && !isSuperAdmin && (
            <p className="app-page-alert app-page-alert--error" role="status">
              No governance modules match your role.
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
