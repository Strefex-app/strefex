import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAuthStore } from '../../store/authStore'
import { useSubscriptionStore } from '../../services/featureFlags'
import { useIndustryStore } from '../../store/industryStore'
import HubIndustryRegistration, { HubServiceProviderNotice } from '../../components/hubs/HubIndustryRegistration'
import HubToolsSection from '../../components/hubs/HubToolsSection'
import HubToolCard from '../../components/hubs/HubToolCard'
import '../../styles/app-page.css'
import './HubPages.css'

const ICON = {
  rfq: { background: 'rgba(0, 212, 255,.1)', color: '#00d4ff' },
  profile: { background: 'rgba(46,125,50,.12)', color: '#2e7d32' },
  overview: { background: 'rgba(25,42,86,.1)', color: '#192a56' },
  services: { background: 'rgba(230,81,0,.12)', color: '#e65100' },
  provider: { background: 'rgba(155,89,182,.12)', color: '#8e44ad' },
}

/**
 * Manufacturer hub — suppliers register industries first; service providers use service categories.
 */
export default function PartnerHub() {
  const role = useAuthStore((s) => s.role)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)

  const isSuperAdmin = role === 'superadmin'
  const isServiceProvider = accountType === 'service_provider' && !isSuperAdmin
  const isSeller = accountType === 'seller' || isSuperAdmin
  const hasIndustries = isSuperAdmin || selectedIndustries.length > 0

  const toolsUnlocked = isServiceProvider || hasIndustries

  return (
    <AppLayout>
      <div className="app-page hub-landing">
        <div className="app-page-card">
          <h1 className="hub-landing__title">Quoting tools</h1>
          <p className="hub-landing__subtitle stx-text-wrap">
            {isServiceProvider
              ? 'Day-to-day incoming work lives on Home. Use this page for profile, trust setup, and service requests.'
              : 'Incoming RFQs and award feedback live on Home. Use this page for trust setup, company profile, and services.'}
            {' '}
            <Link to="/main-menu">Open Home quoting desk</Link>
          </p>
        </div>

        {isServiceProvider ? (
          <HubServiceProviderNotice />
        ) : (
          <HubIndustryRegistration audience="seller" />
        )}

        <HubToolsSection
          hasAccess={toolsUnlocked}
          hint={
            isServiceProvider
              ? 'Respond to assignments, keep your provider profile current, and track any orders you submit.'
              : 'Your day-to-day workspace — RFQs, public profile, and platform services in one place.'
          }
        >
          {isSeller && (
            <div className="hub-tools-group">
              <h3 className="hub-tools-group__label">Supplier workspace</h3>
              <div className="hub-landing__grid">
                <HubToolCard
                  to="/dashboard/supplier"
                  icon="document"
                  iconStyle={ICON.rfq}
                  title="RFQ inbox"
                  description="See invitations, respond to buyer RFQs, and check awards."
                />
                <HubToolCard
                  to="/management/ops/trust-setup"
                  icon="check-square"
                  iconStyle={ICON.overview}
                  title="Trust setup"
                  description="15-minute wizard: industry, primary certificate, and publish your Network reliability card."
                />
                <HubToolCard
                  to="/supplier-dashboard"
                  icon="vendors"
                  iconStyle={ICON.profile}
                  title="Company profile & catalog"
                  description="Update what buyers see — company info, products, certifications, and equipment."
                />
              </div>
            </div>
          )}

          <div className="hub-tools-group">
            <h3 className="hub-tools-group__label">Platform services</h3>
            <div className="hub-landing__grid">
              <HubToolCard
                to="/service-hub"
                icon="service-requests"
                iconStyle={ICON.services}
                title="Order a service"
                description="Browse STREFEX services and submit a request — same flow as buyers."
              />
              <HubToolCard
                to="/service-requests"
                icon="check-square"
                iconStyle={ICON.profile}
                title="Service requests"
                description={
                  isServiceProvider
                    ? 'Manage incoming assignments, update status, and track orders you placed.'
                    : 'Track service orders submitted by your account.'
                }
              />
            </div>
          </div>

          {isServiceProvider && (
            <div className="hub-tools-group">
              <h3 className="hub-tools-group__label">Service delivery</h3>
              <div className="hub-landing__grid">
                <HubToolCard
                  to="/service-provider-dashboard"
                  icon="management"
                  iconStyle={ICON.provider}
                  title="Provider dashboard"
                  description="Assignments, metrics, and status overview for your service business."
                />
              </div>
            </div>
          )}
        </HubToolsSection>
      </div>
    </AppLayout>
  )
}
