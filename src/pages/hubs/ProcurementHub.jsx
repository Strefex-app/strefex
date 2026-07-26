import AppLayout from '../../components/AppLayout'
import { useAuthStore } from '../../store/authStore'
import { useIndustryStore } from '../../store/industryStore'
import HubIndustryRegistration from '../../components/hubs/HubIndustryRegistration'
import HubToolsSection from '../../components/hubs/HubToolsSection'
import HubToolCard from '../../components/hubs/HubToolCard'
import '../../styles/app-page.css'
import './HubPages.css'

const ICON = {
  search: { background: 'rgba(46,125,50,.12)', color: '#2e7d32' },
  contacts: { background: 'rgba(0, 212, 255,.1)', color: '#00d4ff' },
  browse: { background: 'rgba(25,42,86,.1)', color: '#192a56' },
  services: { background: 'rgba(230,81,0,.12)', color: '#e65100' },
}

/**
 * Buyer hub — register industries first, then sourcing and directory tools.
 */
export default function ProcurementHub() {
  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const hasIndustries = isSuperAdmin || selectedIndustries.length > 0

  return (
    <AppLayout>
      <div className="app-page hub-landing">
        <div className="app-page-card">
          <h1 className="hub-landing__title">Buyers</h1>
          <p className="hub-landing__subtitle stx-text-wrap">
            Start by registering your industries, then use the tools below to source suppliers, manage RFQs, and track service orders.
          </p>
        </div>

        <HubIndustryRegistration audience="buyer" />

        <HubToolsSection
          hasAccess={hasIndustries}
          hint="Everything you need for procurement — search, contacts, catalogs, and platform services."
        >
          <div className="hub-tools-group">
            <h3 className="hub-tools-group__label">Sourcing</h3>
            <div className="hub-landing__grid">
              <HubToolCard
                to="/dashboard/buyer"
                icon="search"
                iconStyle={ICON.search}
                title="Supplier search & RFQs"
                description="Find suppliers, shortlist, compare, send RFQs, and track responses in one workspace."
              />
              <HubToolCard
                to="/dashboard/buyer/account-directory"
                icon="document"
                iconStyle={ICON.contacts}
                title="Your contacts"
                description="Import and manage customers, suppliers, and equipment contacts for your organisation."
              />
            </div>
          </div>

          <div className="hub-tools-group">
            <h3 className="hub-tools-group__label">Browse catalogs</h3>
            <div className="hub-landing__grid">
              <HubToolCard
                to="/equipment-hub"
                icon="wrench"
                iconStyle={ICON.browse}
                title="Equipment"
                description="Browse equipment categories and suppliers across your registered industries."
              />
              <HubToolCard
                to="/product-hub"
                icon="package"
                iconStyle={ICON.browse}
                title="Products"
                description="Explore product categories and supplier catalogs in your industries."
              />
            </div>
          </div>

          <div className="hub-tools-group">
            <h3 className="hub-tools-group__label">Platform services</h3>
            <div className="hub-landing__grid">
              <HubToolCard
                to="/service-hub"
                icon="service-requests"
                iconStyle={ICON.services}
                title="Order a service"
                description="Project management, supplier audits, quality checks — submit a request without extra registration."
              />
              <HubToolCard
                to="/service-requests"
                icon="check-square"
                iconStyle={ICON.search}
                title="Track service orders"
                description="Follow status and updates on service requests you have submitted."
              />
            </div>
          </div>
        </HubToolsSection>
      </div>
    </AppLayout>
  )
}
