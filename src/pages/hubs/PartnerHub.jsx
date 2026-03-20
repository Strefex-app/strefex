import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import Icon from '../../components/Icon'
import { useAuthStore } from '../../store/authStore'
import { useSubscriptionStore } from '../../services/featureFlags'
import '../../styles/app-page.css'
import './HubPages.css'

/**
 * Single entry for suppliers (sellers) and service providers:
 * RFQ workspace, supplier profile dashboard, service delivery, and seller overview.
 */
export default function PartnerHub() {
  const role = useAuthStore((s) => s.role)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const isSuperAdmin = role === 'superadmin'
  const isServiceProvider = accountType === 'service_provider' || isSuperAdmin

  return (
    <AppLayout>
      <div className="app-page hub-landing">
        <div className="app-page-card">
          <h1 className="hub-landing__title">Partners</h1>
          <p className="hub-landing__subtitle">
            Suppliers and service providers — RFQs, profiles, and service delivery in one place.
          </p>
        </div>

        <div className="app-page-card">
          <h2 className="hub-landing__section-label">Supplier (seller)</h2>
          <div className="hub-landing__grid">
            <Link to="/dashboard/supplier" className="hub-landing__card stx-click-feedback">
              <span className="hub-landing__card-icon" style={{ background: 'rgba(0,8,136,.1)', color: '#000888' }}>
                <Icon name="document" size={22} />
              </span>
              <h3 className="hub-landing__card-title">Supplier workspace</h3>
              <p className="hub-landing__card-desc">
                Choose membership, respond to RFQ invitations, and view notifications.
              </p>
            </Link>
            <Link to="/supplier-dashboard" className="hub-landing__card stx-click-feedback">
              <span className="hub-landing__card-icon" style={{ background: 'rgba(46,125,50,.12)', color: '#2e7d32' }}>
                <Icon name="vendors" size={22} />
              </span>
              <h3 className="hub-landing__card-title">Supplier profile &amp; catalog</h3>
              <p className="hub-landing__card-desc">
                Company profile, products, certifications — what buyers see in search.
              </p>
            </Link>
            {(accountType === 'seller' || isSuperAdmin) && (
              <Link to="/seller-dashboard" className="hub-landing__card stx-click-feedback">
                <span className="hub-landing__card-icon" style={{ background: 'rgba(25,42,86,.1)', color: '#192a56' }}>
                  <Icon name="management" size={22} />
                </span>
                <h3 className="hub-landing__card-title">Seller dashboard</h3>
                <p className="hub-landing__card-desc">
                  Overview for seller accounts — RFQs received, awards, and activity.
                </p>
              </Link>
            )}
          </div>
        </div>

        <div className="app-page-card">
          <h2 className="hub-landing__section-label">Service provider</h2>
          <div className="hub-landing__grid">
            {isServiceProvider && (
              <>
                <Link to="/service-requests" className="hub-landing__card stx-click-feedback">
                  <span className="hub-landing__card-icon" style={{ background: 'rgba(230,81,0,.12)', color: '#e65100' }}>
                    <Icon name="service-requests" size={22} />
                  </span>
                  <h3 className="hub-landing__card-title">Service requests</h3>
                  <p className="hub-landing__card-desc">
                    Manage incoming service work and client requests.
                  </p>
                </Link>
                <Link to="/service-provider-dashboard" className="hub-landing__card stx-click-feedback">
                  <span className="hub-landing__card-icon" style={{ background: 'rgba(155,89,182,.12)', color: '#8e44ad' }}>
                    <Icon name="management" size={22} />
                  </span>
                  <h3 className="hub-landing__card-title">Service provider dashboard</h3>
                  <p className="hub-landing__card-desc">
                    Summary of assignments, status, and provider metrics.
                  </p>
                </Link>
              </>
            )}
            {!isServiceProvider && !isSuperAdmin && (
              <p className="app-page-subtitle" style={{ margin: 0 }}>
                Service provider tools appear here when your account type includes service delivery.
              </p>
            )}
          </div>
        </div>

        {isSuperAdmin && accountType !== 'seller' && accountType !== 'service_provider' && (
          <div className="app-page-card app-page-callout">
            <p className="app-page-body" style={{ margin: 0 }}>
              Superadmin: use <strong>Supplier workspace</strong> and <strong>Supplier profile</strong> above with a supplier
              membership or <code style={{ fontSize: 12 }}>supplierId</code> on the profile dashboard URL.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
