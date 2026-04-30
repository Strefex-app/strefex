import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import Icon from '../../components/Icon'
import { useAuthStore } from '../../store/authStore'
import '../../styles/app-page.css'
import './HubPages.css'

/**
 * Single entry for all buyer-side tools: sourcing workspace, tenant directory,
 * and superadmin platform contact registries.
 */
export default function ProcurementHub() {
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')

  return (
    <AppLayout>
      <div className="app-page hub-landing">
        <div className="app-page-card">
          <h1 className="hub-landing__title">Buyers</h1>
          <p className="hub-landing__subtitle">
            Sourcing, RFQs, shortlists, and your company contacts — plus platform directories for superadmin.
          </p>
        </div>

        <div className="app-page-card">
          <h2 className="hub-landing__section-label">Core</h2>
          <div className="hub-landing__grid">
            <Link to="/dashboard/buyer" className="hub-landing__card stx-click-feedback">
              <span className="hub-landing__card-icon" style={{ background: 'rgba(46,125,50,.12)', color: '#2e7d32' }}>
                <Icon name="search" size={22} />
              </span>
              <h3 className="hub-landing__card-title">Sourcing &amp; RFQs</h3>
              <p className="hub-landing__card-desc">
                Search suppliers, shortlist, compare, build RFQs, and track responses.
              </p>
            </Link>
            <Link to="/dashboard/buyer/account-directory" className="hub-landing__card stx-click-feedback">
              <span className="hub-landing__card-icon" style={{ background: 'rgba(0,8,136,.1)', color: '#000888' }}>
                <Icon name="document" size={22} />
              </span>
              <h3 className="hub-landing__card-title">Account directory</h3>
              <p className="hub-landing__card-desc">
                Your organisation’s contacts, customers, and equipment suppliers — import and manage in one place.
              </p>
            </Link>
            <Link to="/service-hub" className="hub-landing__card stx-click-feedback">
              <span className="hub-landing__card-icon" style={{ background: 'rgba(230,81,0,.12)', color: '#e65100' }}>
                <Icon name="service-requests" size={22} />
              </span>
              <h3 className="hub-landing__card-title">Order platform services</h3>
              <p className="hub-landing__card-desc">
                Project management, supplier services, and quality — place a service request without registering as a service provider.
              </p>
            </Link>
            <Link to="/service-requests" className="hub-landing__card stx-click-feedback">
              <span className="hub-landing__card-icon" style={{ background: 'rgba(46,125,50,.12)', color: '#2e7d32' }}>
                <Icon name="check-square" size={22} />
              </span>
              <h3 className="hub-landing__card-title">My service requests</h3>
              <p className="hub-landing__card-desc">
                Track status of service orders you have submitted (reference numbers B-…).
              </p>
            </Link>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="app-page-card app-page-callout">
            <h2 className="hub-landing__section-label">Platform (superadmin)</h2>
            <p className="app-page-subtitle" style={{ marginTop: 0 }}>
              Confidential registries — not shown to buyers or other roles.
            </p>
            <div className="hub-landing__grid">
              <Link to="/dashboard/buyer/platform-directory" className="hub-landing__card stx-click-feedback">
                <span className="hub-landing__card-icon" style={{ background: 'rgba(142,68,173,.12)', color: '#8e44ad' }}>
                  <Icon name="building" size={22} />
                </span>
                <h3 className="hub-landing__card-title">Platform buyer contacts</h3>
                <p className="hub-landing__card-desc">
                  Legacy PDFs and company-list imports (e.g. Plastic, Stamping, 2025 list).
                </p>
              </Link>
              <Link to="/dashboard/buyer/registered-suppliers" className="hub-landing__card stx-click-feedback">
                <span className="hub-landing__card-icon" style={{ background: 'rgba(230,81,0,.12)', color: '#e65100' }}>
                  <Icon name="vendors" size={22} />
                </span>
                <h3 className="hub-landing__card-title">Platform supplier registry</h3>
                <p className="hub-landing__card-desc">
                  Mirrored and imported supplier rows — same structure as buyer contacts, XLSX/CSV import.
                </p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
