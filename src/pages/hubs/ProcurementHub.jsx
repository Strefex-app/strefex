import { Link } from 'react-router-dom'
import AppLayout from '../../components/AppLayout'
import { useAuthStore } from '../../store/authStore'
import { useIndustryStore } from '../../store/industryStore'
import HubIndustryRegistration from '../../components/hubs/HubIndustryRegistration'
import HubToolCard from '../../components/hubs/HubToolCard'
import '../../styles/app-page.css'
import './HubPages.css'

const ICON = {
  search: { background: 'rgba(46,125,50,.12)', color: '#2e7d32' },
  rfq: { background: 'rgba(25,42,86,.1)', color: '#192a56' },
  contacts: { background: 'rgba(0, 212, 255,.1)', color: '#00d4ff' },
}

/**
 * Buyer hub — three primary actions: Find, RFQs, Contacts.
 */
export default function ProcurementHub() {
  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const hasIndustries = isSuperAdmin || selectedIndustries.length > 0

  return (
    <AppLayout>
      <div className="app-page hub-landing">
        <div className="app-page-card">
          <h1 className="hub-landing__title">Sourcing</h1>
          <p className="hub-landing__subtitle stx-text-wrap">
            Find manufacturers with quality evidence, send RFQs, and track responses — one guided flow.
          </p>
        </div>

        <div className="hub-trust-banner">
          <strong>Evidence-backed sourcing</strong>
          <span>See ISO, IATF, and medical standards on file before you invite suppliers. Your data stays tenant-scoped.</span>
        </div>

        <HubIndustryRegistration audience="buyer" />

        {hasIndustries ? (
          <>
            <div className="hub-tools-group">
              <h3 className="hub-tools-group__label">Start here</h3>
              <div className="hub-landing__grid hub-landing__grid--primary">
                <HubToolCard
                  to="/dashboard/buyer?tab=discover"
                  icon="search"
                  iconStyle={ICON.search}
                  title="Find suppliers"
                  description="Browse by industry and category. Filter by quality standards on file."
                />
                <HubToolCard
                  to="/dashboard/buyer?tab=track"
                  icon="check-square"
                  iconStyle={ICON.rfq}
                  title="Track RFQs"
                  description="Follow responses and status for RFQs you have sent."
                />
                <HubToolCard
                  to="/dashboard/buyer/account-directory"
                  icon="document"
                  iconStyle={ICON.contacts}
                  title="Your contacts"
                  description="Import and manage supplier and customer contacts."
                />
              </div>
            </div>

            <div className="hub-tools-group">
              <h3 className="hub-tools-group__label">More</h3>
              <div className="hub-landing__grid">
                <HubToolCard
                  to="/equipment-hub"
                  icon="wrench"
                  iconStyle={ICON.search}
                  title="Equipment catalog"
                  description="Browse equipment categories across your industries."
                />
                <HubToolCard
                  to="/product-hub"
                  icon="package"
                  iconStyle={ICON.search}
                  title="Product catalog"
                  description="Explore product categories and supplier listings."
                />
                <HubToolCard
                  to="/service-hub"
                  icon="service-requests"
                  iconStyle={ICON.contacts}
                  title="Order a service"
                  description="Audits, quality checks, and project support."
                />
              </div>
            </div>
          </>
        ) : (
          <div className="app-page-card hub-tools-locked">
            <p className="stx-text-caption">Register at least one industry above to unlock supplier search and RFQs.</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
