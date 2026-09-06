import { useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { getManufacturingCategory } from '../data/productCategoriesByIndustry'
import { useAccountRegistry } from '../store/accountRegistry'
import { useAuthStore } from '../store/authStore'
import { tenantKey } from '../utils/tenantStorage'
import WorldMap from '../components/WorldMap'
import { getApproximateLngLatOrFallback } from '../utils/accountApproximateLocation'
import {
  getSuppliersByIndustry,
  getSuppliersByIndustryAndCategory,
  filterSuppliersRespectingCatalogVisibility,
  augmentSupplierListForSuperadminPlatformView,
} from '../data/supplierDatabase'
import { useMarketplaceCatalogVisibilityEffective } from '../hooks/useMarketplaceCatalogVisibilityEffective'
import { MarketplaceCatalogVisibilityControl } from '../components/MarketplaceCatalogVisibilityControl'
import ServiceProviderAvailabilityCard from '../components/ServiceProviderAvailabilityCard'
import '../styles/app-page.css'
import './ExecutiveSummary.css'

const INDUSTRY_LABELS = {
  automotive: 'Automotive',
  machinery: 'Machinery',
  electronics: 'Electronics',
  medical: 'Medical',
  'raw-materials': 'Raw Materials',
  'oil-gas': 'Oil & Gas',
  nuclear: 'Nuclear',
  'green-energy': 'Green Energy',
  'household-products': 'Household Products',
}
export default function ProductExecutiveSummary() {
  const navigate = useNavigate()
  const { industryId, categoryId, processId } = useParams()
  const industryLabel = INDUSTRY_LABELS[industryId] || industryId
  const category = getManufacturingCategory(categoryId, industryId)

  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const isPreviewSession = (() => {
    try {
      const exp = localStorage.getItem(tenantKey('strefex-preview-expires'))
      return exp && Date.now() < Number(exp)
    } catch { return false }
  })()
  // Requesters see anonymized supplier/provider identities; only superadmin can unmask.
  const canSeeNames = isSuperAdmin && !isPreviewSession

  const [activeTab, setActiveTab] = useState('overview')

  const goBack = () => navigate(-1)

  const process = category?.subcategories?.find((s) => s.id === processId) || null
  const processLabel = process?.name || processId || ''

  /** Build URL with pre-filled product context query params */
  const quoteUrl = () => {
    const p = new URLSearchParams({
      industry: industryId,
      industryLabel,
      productCategory: category?.name || categoryId,
      process: processLabel,
      context: 'product',
    })
    return `/equipment-request?${p.toString()}`
  }
  const addSupplierUrl = () => {
    const p = new URLSearchParams({
      industry: industryId,
      industryLabel,
      productCategory: category?.name || categoryId,
      process: processLabel,
      context: 'product',
    })
    return `/add-supplier?${p.toString()}`
  }

  const showMarketplaceCatalog = useMarketplaceCatalogVisibilityEffective()

  const getSellersByCategory = useAccountRegistry((s) => s.getSellersByCategory)
  const getSellersBySubcategory = useAccountRegistry((s) => s.getSellersBySubcategory)
  const registeredSellers = useMemo(() => (
    processId
      ? getSellersBySubcategory(industryId, categoryId, processId)
      : getSellersByCategory(industryId, categoryId)
  ), [processId, industryId, categoryId, getSellersByCategory, getSellersBySubcategory])

  // Merged suppliers: workspace corpus + account registry signup + optional seed (same as equipment executive summary DB)
  const mergedSuppliers = useMemo(() => {
    if (!industryId) return []
    const raw = categoryId
      ? getSuppliersByIndustryAndCategory(industryId, categoryId)
      : getSuppliersByIndustry(industryId)
    const filtered = filterSuppliersRespectingCatalogVisibility(raw, showMarketplaceCatalog)
    const fromDb = augmentSupplierListForSuperadminPlatformView(
      filtered,
      industryId,
      categoryId,
      isSuperAdmin,
    )
    const seen = new Set(fromDb.map((s) => String(s.name || s.email || s.id || '').toLowerCase()).filter(Boolean))
    const fromRegistry = (Array.isArray(registeredSellers) ? registeredSellers : [])
      .filter((a) => {
        const key = String(a.company || a.email || a.id || '').toLowerCase()
        if (!key || seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((a) => ({
        id: a.id,
        name: a.company || a.contactName || a.email || 'Supplier',
        email: a.email || '',
        country: a.country || '',
        city: a.city || '',
        address: a.address || '',
        source: 'registry',
      }))
    return [...fromDb, ...fromRegistry]
  }, [industryId, categoryId, processId, showMarketplaceCatalog, isSuperAdmin, registeredSellers])

  const registeredServiceProviders = useAccountRegistry((s) => s.getRegisteredServiceProviders(industryId))
  const serviceProviderRows = useMemo(() => {
    const all = Array.isArray(registeredServiceProviders) ? registeredServiceProviders : []
    return all.map((provider) => ({
      id: provider.id,
      company: provider.company || provider.contactName || provider.email || 'Service Provider',
      serviceCategories: Array.isArray(provider.serviceCategories) ? provider.serviceCategories : [],
      email: provider.email || '',
    }))
  }, [registeredServiceProviders])

  const sellerMapLocations = useMemo(() =>
    mergedSuppliers
      .map((s, idx) => {
        const coords = getApproximateLngLatOrFallback({ country: s.country, city: s.city, address: s.address, seed: s.id })
        const name = canSeeNames ? (s.name || 'Supplier') : `Supplier #${String(idx + 1).padStart(2, '0')}`
        return { id: s.id, name, coordinates: coords, city: s.city, country: s.country }
      })
      .filter(Boolean),
  [mergedSuppliers, canSeeNames])

  if (!category || !process) {
    return (
      <AppLayout>
        <div className="app-page">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); goBack() }}>← Back</a>
          <div className="app-page-card" style={{ textAlign: 'center', padding: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>Not Found</h2>
            <p style={{ color: '#888' }}>The requested manufacturing process was not found.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'market', label: 'Market Analysis' },
    { id: 'quality', label: 'Quality & Compliance' },
  ]

  return (
    <AppLayout>
      <div className="exec-summary-page">
        {/* Header */}
        <div className="exec-summary-header">
          <a className="exec-summary-back" href="#" onClick={(e) => { e.preventDefault(); goBack() }}>
            ← Back
          </a>
          <div className="exec-summary-brand">
            <img
              src={`${import.meta.env.BASE_URL}assets/strefex-logo-executive-summary.png`}
              alt="STREFEX"
              className="exec-logo-img exec-logo-img--executive"
            />
            <p className="exec-subtitle">EXECUTIVE SUMMARY</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 className="exec-summary-title" style={{ margin: 0 }}>
              Executive Summary — {processLabel}
            </h1>
            <span style={{
              fontSize: 10, padding: '3px 8px', borderRadius: 4,
              background: `${category.color}14`, color: category.color, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              {industryLabel} · {category.name}
            </span>
          </div>
          <p style={{ color: '#666', fontSize: 14, margin: 0 }}>
            {process.description}
          </p>
          <div style={{ marginTop: 12 }}>
            <MarketplaceCatalogVisibilityControl compact />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', paddingBottom: 2 }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: activeTab === tab.id ? category.color : '#f1f5f9',
                color: activeTab === tab.id ? '#fff' : '#475569',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                transition: 'all .15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div className="app-page-widgets-dash">
            {/* KPI Cards */}
            <div className="app-page-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Registered Suppliers</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#1a1a2e' }}>{mergedSuppliers.length}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>For {processLabel} in {industryLabel}</div>
            </div>
            <div className="app-page-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Avg Lead Time</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#1a1a2e' }}>--</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Weeks (avg across suppliers)</div>
            </div>
            <div className="app-page-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Avg Rating</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#1a1a2e' }}>--</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Based on 0 reviews</div>
            </div>
            <div className="app-page-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Active RFQs</div>
              <div style={{ fontSize: 28, fontWeight: 600, color: '#1a1a2e' }}>0</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Quote requests in progress</div>
            </div>

            {/* Process Details Card */}
            <div className="app-page-card" style={{ padding: 20, gridColumn: '1 / -1' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Process Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }}>Manufacturing Category</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{category.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }}>Process</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{processLabel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }}>Industry</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{industryLabel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 4 }}>Description</div>
                  <div style={{ fontSize: 14, color: '#475569', lineHeight: 1.5 }}>{process.description}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="app-page-card" style={{ padding: 20, gridColumn: '1 / -1' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Actions</h3>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => navigate(quoteUrl())} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: category.color, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Request a Quote
                </button>
                <button type="button" onClick={() => navigate(addSupplierUrl())} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8,
                  border: `1px solid ${category.color}`, background: 'var(--bg-card)',
                  color: category.color, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Add Supplier
                </button>
                <button type="button" onClick={() => navigate(`/auditor-hub/executive-summary?industry=${industryId}`)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 20px', borderRadius: 8,
                  border: '1px solid var(--border-color)', background: 'var(--bg-card)',
                  color: '#475569', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Request Audit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── SUPPLIERS TAB ─── */}
        {activeTab === 'suppliers' && (
          <div>
            <ServiceProviderAvailabilityCard
              industryLabel={industryLabel}
              canSeeNames={canSeeNames}
              providers={serviceProviderRows}
              cardStyle={{ marginBottom: 16 }}
              onRequestService={(serviceId, label) => {
                const p = new URLSearchParams({
                  context: 'service',
                  serviceCategory: serviceId,
                  serviceCategoryLabel: label,
                  industry: industryId || '',
                  industryLabel: industryLabel || '',
                  requestSource: 'executive-summary',
                })
                navigate(`/services?${p.toString()}`)
              }}
              onRequestProvider={(provider, requestMeta) => {
                const p = new URLSearchParams({
                  context: 'service',
                  serviceCategory: requestMeta?.serviceCategoryId || 'supplier-services',
                  serviceCategoryLabel: requestMeta?.serviceCategoryLabel || 'Supplier Services',
                  industry: industryId || '',
                  industryLabel: industryLabel || '',
                  preferredProviderId: String(provider?.id || ''),
                  preferredProviderName: String(provider?.company || ''),
                  preferredProviderEmail: String(provider?.email || ''),
                  requestSource: 'executive-summary',
                })
                navigate(`/services?${p.toString()}`)
              }}
            />

            <div className="app-page-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600 }}>Registered Suppliers — {processLabel}</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666' }}>
                Suppliers registered for {processLabel} in the {industryLabel} industry (workspace registry, signups, and imports).
                {!canSeeNames && <span style={{ color: '#e65100', fontWeight: 600 }}> Requester view keeps identities masked. Superadmin can view full details.</span>}
              </p>

              {mergedSuppliers.length > 0 ? (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {mergedSuppliers.map((s, i) => (
                    <li
                      key={s.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-card)',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14 }} className="stx-text-wrap">
                        {canSeeNames ? (s.name || 'Supplier') : `Supplier #${String(i + 1).padStart(2, '0')}`}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }} className="stx-text-wrap">
                        {[s.country, s.city].filter(Boolean).join(' · ') || '—'}
                        {s.source ? ` · ${s.source}` : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{
                  padding: '24px 20px', borderRadius: 12, background: '#f8fafc',
                  border: '1px dashed #cbd5e1', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.3 }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 6 }}>No suppliers registered yet</div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                    Be the first to register as a <strong>{processLabel}</strong> supplier for the <strong>{industryLabel}</strong> industry.
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => navigate(quoteUrl())} style={{
                      padding: '9px 20px', borderRadius: 8, border: 'none',
                      background: category.color, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}>
                      Request a Quote
                    </button>
                    <button type="button" onClick={() => navigate(addSupplierUrl())} style={{
                      padding: '9px 20px', borderRadius: 8,
                      border: `1px solid ${category.color}`, background: 'var(--bg-card)',
                      color: category.color, fontWeight: 600, fontSize: 13, cursor: 'pointer',
                    }}>
                      Add Supplier
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MARKET ANALYSIS TAB ─── */}
        {activeTab === 'market' && (
          <div className="app-page-widgets-dash" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
            <div className="app-page-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Price Index</h3>
              <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 12 }}>Relative pricing for {processLabel} in {industryLabel} compared to global average.</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 600, color: 'var(--color-primary)' }}>100</span>
                <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>/ 100 baseline</span>
              </div>
              <div style={{ marginTop: 12, height: 6, borderRadius: 3, background: 'var(--bg-surface)' }}>
                <div style={{ height: '100%', width: '50%', borderRadius: 3, background: category.color }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 6 }}>Data will update as suppliers register and submit pricing</div>
            </div>

            <div className="app-page-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Geographic Distribution</h3>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
                Approximate supplier locations by country/city from registered accounts (exact addresses not shown). Zoom is disabled.
              </div>
              <div className="exec-map-container exec-map-container--landscape">
                <WorldMap variant="executive" locations={sellerMapLocations} />
              </div>
            </div>

            <div className="app-page-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Capacity Utilization</h3>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Average capacity utilization among {processLabel} suppliers.</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 600, color: '#1a1a2e' }}>--</span>
                <span style={{ fontSize: 14, color: '#888' }}>%</span>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Awaiting supplier data</div>
            </div>

            <div className="app-page-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Lead Time Benchmark</h3>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Average lead time for {processLabel} orders.</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 32, fontWeight: 600, color: '#1a1a2e' }}>--</span>
                <span style={{ fontSize: 14, color: '#888' }}>weeks</span>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Will calculate from supplier data</div>
            </div>
          </div>
        )}

        {/* ─── QUALITY TAB ─── */}
        {activeTab === 'quality' && (
          <div className="app-page-widgets-dash" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
            <div className="app-page-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Certifications</h3>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>Common certifications for {processLabel} suppliers in {industryLabel}.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['ISO 9001', 'ISO 14001', 'IATF 16949', 'ISO 13485', 'AS9100'].map((cert) => (
                  <span key={cert} style={{
                    fontSize: 12, padding: '5px 12px', borderRadius: 6,
                    background: '#f1f5f9', color: '#475569', fontWeight: 500, border: '1px solid var(--border-color)',
                  }}>
                    {cert}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 10 }}>Certification data populated from supplier profiles</div>
            </div>

            <div className="app-page-card" style={{ padding: 20 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Quality Metrics</h3>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Average quality KPIs for {processLabel}.</div>
              <div style={{ display: 'grid', gap: 12 }}>
                {[
                  { label: 'Defect Rate (PPM)', value: '--' },
                  { label: 'On-Time Delivery', value: '--' },
                  { label: 'First Pass Yield', value: '--' },
                  { label: 'Customer Complaints', value: '--' },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 13, color: '#475569' }}>{kpi.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{kpi.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 10 }}>Metrics will update with supplier audit data</div>
            </div>

            <div className="app-page-card" style={{ padding: 20, gridColumn: '1 / -1' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600 }}>Risk Assessment</h3>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Supply chain risk indicators for {processLabel} in {industryLabel}.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                {[
                  { label: 'Supply Concentration', level: 'Low', color: '#2e7d32' },
                  { label: 'Geopolitical Risk', level: 'Medium', color: '#e65100' },
                  { label: 'Material Availability', level: 'Stable', color: '#1565c0' },
                  { label: 'Price Volatility', level: 'Moderate', color: '#f9a825' },
                ].map((risk) => (
                  <div key={risk.label} style={{ padding: '12px 16px', borderRadius: 10, background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: 12, color: '#888', fontWeight: 600, marginBottom: 6 }}>{risk.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: risk.color }}>{risk.level}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
