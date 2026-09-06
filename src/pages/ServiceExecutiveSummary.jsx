import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ServiceProviderAvailabilityCard, { SERVICE_CATEGORY_LABELS } from '../components/ServiceProviderAvailabilityCard'
import { useAccountRegistry } from '../store/accountRegistry'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { tenantKey } from '../utils/tenantStorage'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import WorldMap from '../components/WorldMap'
import { getApproximateLngLatOrFallback } from '../utils/accountApproximateLocation'
import { PROJECT_MANAGEMENT_SCOPE_LABELS } from '../data/projectManagementScopeServices'
import '../styles/app-page.css'
import './ExecutiveSummary.css'

const INDUSTRIES = [
  { id: 'automotive', label: 'Automotive' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'medical', label: 'Medical' },
  { id: 'raw-materials', label: 'Raw Materials' },
  { id: 'oil-gas', label: 'Oil & Gas' },
  { id: 'nuclear', label: 'Nuclear' },
  { id: 'green-energy', label: 'Green Energy' },
  { id: 'household-products', label: 'Household Products' },
]
const SERVICE_FILTER_IDS = ['project-management', 'supplier-services', 'quality-services']

export default function ServiceExecutiveSummary() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const submitServiceRequest = useServiceRequestStore((s) => s.submitRequest)
  const [selectedIndustry, setSelectedIndustry] = useState('automotive')
  const initialServiceCategory = (() => {
    const fromQuery = String(searchParams.get('serviceCategory') || '').trim().toLowerCase()
    if (fromQuery && SERVICE_CATEGORY_LABELS[fromQuery]) return fromQuery
    return 'all'
  })()
  const [selectedServiceCategory, setSelectedServiceCategory] = useState(initialServiceCategory)
  const [selectedProviderIds, setSelectedProviderIds] = useState(new Set())
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({
    title: '',
    serviceCategoryId: 'supplier-services',
    priority: 'Normal',
    preferredDate: '',
    description: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const isPreviewSession = (() => {
    try {
      const exp = localStorage.getItem(tenantKey('strefex-preview-expires'))
      return exp && Date.now() < Number(exp)
    } catch {
      return false
    }
  })()

  // Requesters see anonymized provider identities; only superadmin can unmask.
  const canSeeNames = isSuperAdmin && !isPreviewSession
  const canSendRequests = isSuperAdmin || accountType === 'buyer' || accountType === 'seller'

  const registeredServiceProviders = useAccountRegistry((s) => s.getRegisteredServiceProviders(selectedIndustry))
  const registeredAuditors = useAccountRegistry((s) => s.getRegisteredAuditors(selectedIndustry, { onlyVerified: true }))

  const serviceProviderRows = useMemo(() => {
    const all = Array.isArray(registeredServiceProviders) ? registeredServiceProviders : []
    return all.map((provider) => ({
      id: provider.id,
      company: provider.company || provider.contactName || provider.email || 'Service Provider',
      serviceCategories: Array.isArray(provider.serviceCategories) ? provider.serviceCategories : [],
      email: provider.email || '',
      providerType: 'service_provider',
      country: provider.country || '',
      city: provider.city || '',
      address: provider.address || '',
      rating: provider.rating,
    }))
  }, [registeredServiceProviders])
  const auditorRows = useMemo(() => {
    const all = Array.isArray(registeredAuditors) ? registeredAuditors : []
    return all.map((auditor) => ({
      id: auditor.id,
      company: auditor.company || auditor.contactName || auditor.email || 'Auditor',
      serviceCategories: ['supplier-audit'],
      email: auditor.email || '',
      providerType: 'auditor',
      country: auditor.country || '',
      city: auditor.city || '',
      address: auditor.address || '',
      rating: auditor.rating,
    }))
  }, [registeredAuditors])
  const providerRows = useMemo(() => {
    return [...serviceProviderRows, ...auditorRows]
  }, [serviceProviderRows, auditorRows])
  const filteredProviderRows = useMemo(() => {
    if (selectedServiceCategory === 'all') return providerRows
    return providerRows.filter((provider) => (provider.serviceCategories || []).includes(selectedServiceCategory))
  }, [providerRows, selectedServiceCategory])

  const registryMapAccounts = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const provider of filteredProviderRows) {
      if (!provider?.id || seen.has(provider.id)) continue
      seen.add(provider.id)
      out.push({
        id: provider.id,
        company: provider.company,
        country: provider.country || '',
        city: provider.city || '',
        address: provider.address || '',
        email: provider.email || '',
        rating: provider.rating,
        providerType: provider.providerType,
      })
    }
    return out
  }, [filteredProviderRows])

  const providerMapLocations = useMemo(
    () =>
      registryMapAccounts.map((p, idx) => {
        const coords = getApproximateLngLatOrFallback({
          country: p.country,
          city: p.city,
          address: p.address,
          seed: p.id,
        })
        const name = canSeeNames
          ? p.company
          : `${p.providerType === 'auditor' ? 'Auditor' : 'Provider'} #${String(idx + 1).padStart(2, '0')}`
        return {
          id: p.id,
          name,
          coordinates: coords,
          city: p.city,
          country: p.country,
          rating: Number(p.rating) > 0 ? Number(p.rating) : undefined,
        }
      }),
    [registryMapAccounts, canSeeNames],
  )

  const mapPinCount = providerMapLocations.length

  const avgQualityPct = useMemo(() => {
    const ratings = registryMapAccounts.map((a) => Number(a.rating)).filter((v) => Number.isFinite(v) && v > 0)
    if (!ratings.length) return 72
    return Math.round((ratings.reduce((x, y) => x + y, 0) / ratings.length / 5) * 100)
  }, [registryMapAccounts])

  const contactReadinessPct = useMemo(() => {
    if (!registryMapAccounts.length) return 0
    const n = registryMapAccounts.filter((a) => String(a.email || '').trim()).length
    return Math.round((n / registryMapAccounts.length) * 100)
  }, [registryMapAccounts])

  const filterMatchPct = useMemo(() => {
    const m = Math.max(1, mapPinCount)
    return Math.min(100, Math.round((filteredProviderRows.length / m) * 100))
  }, [filteredProviderRows.length, mapPinCount])

  const industryLabel = INDUSTRIES.find((x) => x.id === selectedIndustry)?.label || selectedIndustry
  const selectedServiceCategoryLabel =
    selectedServiceCategory === 'all'
      ? 'All service categories'
      : (SERVICE_CATEGORY_LABELS[selectedServiceCategory] || selectedServiceCategory)
  const selectedProviders = filteredProviderRows.filter((p) => selectedProviderIds.has(p.id))
  const isAuditMode = selectedServiceCategory === 'supplier-audit'
  const selectedEntityLabel = isAuditMode ? 'Auditor' : 'Provider'

  useEffect(() => {
    setSelectedProviderIds(new Set())
    setIsSubmitted(false)
  }, [selectedIndustry, selectedServiceCategory])

  const toggleProviderSelection = (providerId) => {
    setSelectedProviderIds((prev) => {
      const next = new Set(prev)
      if (next.has(providerId)) next.delete(providerId)
      else next.add(providerId)
      return next
    })
  }

  const openRequestModal = () => {
    if (selectedProviderIds.size === 0 || !canSendRequests) return
    const first = filteredProviderRows.find((p) => selectedProviderIds.has(p.id))
    const defaultServiceCategory = selectedServiceCategory !== 'all'
      ? selectedServiceCategory
      : (first?.serviceCategories?.[0] || 'supplier-services')
    setRequestForm((prev) => ({
      ...prev,
      serviceCategoryId: defaultServiceCategory,
      title: prev.title || `Service Request — ${industryLabel} (${SERVICE_CATEGORY_LABELS[defaultServiceCategory] || defaultServiceCategory})`,
    }))
    setShowRequestModal(true)
  }

  const getServiceLabelsForCategory = (serviceCategoryId) => {
    if (serviceCategoryId === 'project-management') return [...PROJECT_MANAGEMENT_SCOPE_LABELS]
    if (serviceCategoryId === 'quality-services') return ['Buy Off', 'Shipment Acceptance']
    if (serviceCategoryId === 'supplier-audit') return ['Supplier Audit']
    return ['Supplier Source', 'Audit']
  }

  const handleCreateServiceRequest = () => {
    if (selectedProviders.length === 0 || !requestForm.title.trim()) return
    setIsSubmitting(true)

    const services = getServiceLabelsForCategory(requestForm.serviceCategoryId)
    selectedProviders.forEach((provider) => {
      submitServiceRequest({
        services,
        industryId: selectedIndustry,
        industryLabel,
        companyName: tenant?.name || user?.companyName || '',
        contactName: user?.fullName || user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        address: user?.address || '',
        preferredDate: requestForm.preferredDate,
        priority: requestForm.priority,
        description: `${requestForm.title}\n\n${requestForm.description}`.trim(),
        notes: '',
        attachmentNames: [],
        accountType: accountType || 'unknown',
        serviceCategoryId: requestForm.serviceCategoryId,
        serviceCategoryLabel: SERVICE_CATEGORY_LABELS[requestForm.serviceCategoryId] || requestForm.serviceCategoryId,
        preferredProviderId: provider?.id || null,
        preferredProviderName: provider?.company || null,
        preferredProviderEmail: provider?.email || null,
        requestSource: 'executive-summary',
      })
    })

    setTimeout(() => {
      setIsSubmitting(false)
      setShowRequestModal(false)
      setIsSubmitted(true)
      setSelectedProviderIds(new Set())
      setRequestForm({
        title: '',
        serviceCategoryId: 'supplier-services',
        priority: 'Normal',
        preferredDate: '',
        description: '',
      })
    }, 400)
  }

  return (
    <AppLayout>
      <div className="app-page executive-summary-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <div className="exec-header">
            <div className="exec-header-left">
              <div className="exec-logo-container">
                <img
                  src={`${import.meta.env.BASE_URL}assets/strefex-logo-executive-summary.png`}
                  alt="STREFEX"
                  className="exec-logo-img exec-logo-img--executive"
                />
              </div>
              <p className="exec-subtitle">EXECUTIVE SUMMARY</p>
              <p className="app-page-subtitle">
                {selectedServiceCategoryLabel} — {industryLabel} — Service provider metrics & targeted requests
              </p>
              <p className="exec-map-disclaimer" style={{ marginTop: 8 }}>
                Map shows every registered service provider and auditor (all industries). Table and cards below follow
                your industry and service filters.
              </p>
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="exec-btn-secondary"
                  onClick={() => navigate(`/auditor-hub/executive-summary?industry=${selectedIndustry}`)}
                >
                  Auditor Executive Summary
                </button>
              </div>
            </div>
            <button
              type="button"
              className="exec-rfq-btn"
              disabled={!canSendRequests || selectedProviderIds.size === 0}
              title={selectedProviderIds.size === 0 ? 'Select one or more providers in the table below' : undefined}
              onClick={openRequestModal}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create service request
            </button>
          </div>
        </div>

        <div className="exec-main-indicators">
          <div className="exec-indicator-card">
            <span className="exec-indicator-label">PROVIDER QUALITY INDEX</span>
            <div className="exec-indicator-bar">
              <div className="exec-indicator-fill fit" style={{ width: `${avgQualityPct}%` }} />
            </div>
            <span className="exec-indicator-value">{avgQualityPct}%</span>
          </div>
          <div className="exec-indicator-card">
            <span className="exec-indicator-label">CONTACT READINESS</span>
            <div className="exec-indicator-bar">
              <div className="exec-indicator-fill capacity" style={{ width: `${contactReadinessPct}%` }} />
            </div>
            <span className="exec-indicator-value">{contactReadinessPct}%</span>
          </div>
          <div className="exec-indicator-card">
            <span className="exec-indicator-label">FILTER MATCH (VS REGISTRY)</span>
            <div className="exec-indicator-bar">
              <div className="exec-indicator-fill risk" style={{ width: `${filterMatchPct}%` }} />
            </div>
            <span className="exec-indicator-value">{filterMatchPct}%</span>
          </div>
        </div>

        <div className="exec-content-row">
          <div className="app-page-card exec-map-card">
            <h3 className="exec-section-title">Provider &amp; auditor locations</h3>
            <p className="exec-map-disclaimer">
              Pins use country/city when known; otherwise a non-precise fallback position so every registered account appears. Map is fixed; zoom is disabled.
            </p>
            <div className="exec-map-container">
              <WorldMap variant="executive" locations={providerMapLocations} />
            </div>
            <div className="exec-map-legend">
              <span className="legend-item">
                <span className="legend-dot champagne" /> Registered account location (approx.)
              </span>
            </div>
          </div>

          <div className="exec-rfq-stats">
            <div className="app-page-card exec-stat-card">
              <div className="exec-stat-icon suppliers">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="exec-stat-info">
                <span className="exec-stat-value">{mapPinCount}</span>
                <span className="exec-stat-label">On registry map</span>
              </div>
            </div>
            <div className="app-page-card exec-stat-card">
              <div className="exec-stat-icon active">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" />
                  <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="exec-stat-info">
                <span className="exec-stat-value">{filteredProviderRows.length}</span>
                <span className="exec-stat-label">Matches current filters</span>
              </div>
            </div>
            <div className="app-page-card exec-stat-card">
              <div className="exec-stat-icon responses">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="exec-stat-info">
                <span className="exec-stat-value">{selectedProviderIds.size}</span>
                <span className="exec-stat-label">Selected for request</span>
              </div>
            </div>
          </div>
        </div>

        <div className="app-page-card" style={{ marginBottom: 16 }}>
          <h3 className="exec-section-title" style={{ marginBottom: 10 }}>Industry</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {INDUSTRIES.map((industry) => (
              <button
                key={industry.id}
                type="button"
                className="exec-btn-secondary"
                style={{
                  background: selectedIndustry === industry.id ? '#eef2ff' : undefined,
                  borderColor: selectedIndustry === industry.id ? '#c7d2fe' : undefined,
                }}
                onClick={() => setSelectedIndustry(industry.id)}
              >
                {industry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="app-page-card" style={{ marginBottom: 16 }}>
          <h3 className="exec-section-title" style={{ marginBottom: 10 }}>Service</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="exec-btn-secondary"
              style={{
                background: selectedServiceCategory === 'all' ? '#eef2ff' : undefined,
                borderColor: selectedServiceCategory === 'all' ? '#c7d2fe' : undefined,
              }}
              onClick={() => setSelectedServiceCategory('all')}
            >
              All Services
            </button>
            {SERVICE_FILTER_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className="exec-btn-secondary"
                style={{
                  background: selectedServiceCategory === id ? '#eef2ff' : undefined,
                  borderColor: selectedServiceCategory === id ? '#c7d2fe' : undefined,
                }}
                onClick={() => setSelectedServiceCategory(id)}
              >
                {SERVICE_CATEGORY_LABELS[id]}
              </button>
            ))}
          </div>
        </div>

        <ServiceProviderAvailabilityCard
          industryLabel={industryLabel}
          canSeeNames={canSeeNames}
          providers={filteredProviderRows}
          title={isAuditMode ? `Verified Auditors for ${industryLabel}` : `Service Providers for ${industryLabel}`}
          subtitle={
            isAuditMode
              ? 'Select verified auditor companies by industry and send Supplier Audit RFQs.'
              : 'Request project management, buy-off and related supplier services from registered providers in this industry.'
          }
          onRequestService={
            canSendRequests
              ? (serviceId, label) => {
                  const p = new URLSearchParams({
                    context: 'service',
                    serviceCategory: serviceId,
                    serviceCategoryLabel: label,
                    industry: selectedIndustry,
                    industryLabel,
                    requestSource: 'executive-summary',
                  })
                  navigate(`/services?${p.toString()}`)
                }
              : undefined
          }
          onRequestProvider={
            canSendRequests
              ? (provider, requestMeta) => {
                  const targetedServiceId =
                    selectedServiceCategory !== 'all' ? selectedServiceCategory : requestMeta?.serviceCategoryId || 'supplier-services'
                  const targetedServiceLabel =
                    selectedServiceCategory !== 'all'
                      ? SERVICE_CATEGORY_LABELS[selectedServiceCategory] || selectedServiceCategory
                      : requestMeta?.serviceCategoryLabel || 'Supplier Services'
                  const p = new URLSearchParams({
                    context: 'service',
                    serviceCategory: targetedServiceId,
                    serviceCategoryLabel: targetedServiceLabel,
                    industry: selectedIndustry,
                    industryLabel,
                    preferredProviderId: String(provider?.id || ''),
                    preferredProviderName: String(provider?.company || ''),
                    preferredProviderEmail: String(provider?.email || ''),
                    requestSource: 'executive-summary',
                  })
                  navigate(`/services?${p.toString()}`)
                }
              : undefined
          }
        />

        <div className="app-page-card" style={{ marginTop: 16 }}>
          <div className="exec-table-header-row">
            <h3 className="exec-section-title" style={{ marginBottom: 0 }}>
              {isAuditMode ? 'Auditor Summary' : 'Service Provider Summary'} ({filteredProviderRows.length})
            </h3>
            {canSendRequests && selectedProviderIds.size > 0 && (
              <button type="button" className="exec-multi-rfq-btn" onClick={openRequestModal}>
                Send {isAuditMode ? 'Supplier Audit RFQ' : 'Service Request'} to {selectedProviderIds.size} {selectedEntityLabel}
                {selectedProviderIds.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <div className="exec-table-wrapper">
            <table className="exec-table">
              <thead>
                <tr>
                  <th className="exec-th-check">
                    <ToggleCheckButton
                      compact
                      checked={
                        filteredProviderRows.length > 0 && selectedProviderIds.size === filteredProviderRows.length
                      }
                      onChange={() => {
                        if (selectedProviderIds.size === filteredProviderRows.length)
                          setSelectedProviderIds(new Set())
                        else setSelectedProviderIds(new Set(filteredProviderRows.map((p) => p.id)))
                      }}
                      disabled={!canSendRequests}
                      title="Select all providers"
                      aria-label="Select all providers"
                    />
                  </th>
                  <th>{isAuditMode ? 'Auditor' : 'Provider'}</th>
                  <th>Service Expertise</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProviderRows.map((provider, idx) => (
                  <tr key={provider.id} className={selectedProviderIds.has(provider.id) ? 'rfq-checked' : ''}>
                    <td className="exec-td-check">
                      <ToggleCheckButton
                        compact
                        checked={selectedProviderIds.has(provider.id)}
                        onChange={() => toggleProviderSelection(provider.id)}
                        disabled={!canSendRequests}
                        title="Select provider"
                        aria-label="Select provider"
                      />
                    </td>
                    <td>
                      {canSeeNames
                        ? provider.company
                        : `${isAuditMode ? 'Auditor' : 'Service Provider'} #${String(idx + 1).padStart(2, '0')}`}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(provider.serviceCategories.length > 0 ? provider.serviceCategories : ['supplier-services']).map(
                          (serviceId) => (
                            <span
                              key={`${provider.id}-${serviceId}`}
                              style={{
                                fontSize: 11,
                                padding: '3px 8px',
                                borderRadius: 12,
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {SERVICE_CATEGORY_LABELS[serviceId] || serviceId}
                            </span>
                          ),
                        )}
                      </div>
                    </td>
                    <td>{canSeeNames ? provider.email || '—' : 'Hidden for requester'}</td>
                    <td>
                      {canSendRequests ? (
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => {
                            setSelectedProviderIds(new Set([provider.id]))
                            setRequestForm((prev) => ({
                              ...prev,
                              serviceCategoryId:
                                selectedServiceCategory !== 'all'
                                  ? selectedServiceCategory
                                  : provider?.serviceCategories?.[0] || 'supplier-services',
                              title: prev.title || `Service Request — ${industryLabel}`,
                            }))
                            setShowRequestModal(true)
                          }}
                        >
                          {isAuditMode ? 'Request Audit' : 'Request'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#999' }}>Buyer/Seller only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isSubmitted && (
          <div className="app-page-card" style={{ marginTop: 16, border: '1px solid #c8e6c9', background: '#f1f8e9' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2e7d32' }}>Service request submitted successfully.</div>
            <div style={{ fontSize: 13, color: '#4e6b4e', marginTop: 4 }}>
              Your targeted request was sent to selected {isAuditMode ? 'auditors' : 'providers'} from the executive
              summary.
            </div>
          </div>
        )}

        {showRequestModal && (
          <div className="exec-modal-overlay" onClick={() => !isSubmitting && setShowRequestModal(false)}>
            <div className="exec-modal" onClick={(e) => e.stopPropagation()}>
              <div className="exec-modal-header">
                <h3>{isAuditMode ? 'Create Supplier Audit RFQ' : 'Create Service Request'}</h3>
                <button
                  type="button"
                  className="exec-btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                  disabled={isSubmitting}
                >
                  Close
                </button>
              </div>
              <div className="exec-modal-body">
                <div className="exec-form-group">
                  <label>Request Title</label>
                  <input
                    type="text"
                    value={requestForm.title}
                    onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                    placeholder="Enter service request title"
                  />
                </div>
                <div className="exec-form-row">
                  <div className="exec-form-group">
                    <label>Service Category</label>
                    <select
                      value={requestForm.serviceCategoryId}
                      onChange={(e) => setRequestForm({ ...requestForm, serviceCategoryId: e.target.value })}
                    >
                      {Object.entries(SERVICE_CATEGORY_LABELS).map(([id, label]) => (
                        <option key={id} value={id}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="exec-form-group">
                    <label>Priority</label>
                    <select
                      value={requestForm.priority}
                      onChange={(e) => setRequestForm({ ...requestForm, priority: e.target.value })}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="exec-form-group">
                  <label>Preferred Date</label>
                  <input
                    type="date"
                    value={requestForm.preferredDate}
                    onChange={(e) => setRequestForm({ ...requestForm, preferredDate: e.target.value })}
                  />
                </div>
                <div className="exec-form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    placeholder="Scope, quantity, target timing, key requirements"
                  />
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                  This request will be sent to <strong>{selectedProviders.length}</strong> selected{' '}
                  {selectedEntityLabel.toLowerCase()}
                  {selectedProviders.length !== 1 ? 's' : ''}.
                </div>
              </div>
              <div className="exec-modal-footer">
                <button
                  type="button"
                  className="exec-btn-secondary"
                  onClick={() => setShowRequestModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="exec-btn-primary"
                  onClick={handleCreateServiceRequest}
                  disabled={
                    isSubmitting || !requestForm.title.trim() || selectedProviders.length === 0
                  }
                >
                  {isSubmitting
                    ? 'Sending...'
                    : `Send to ${selectedProviders.length} ${selectedEntityLabel}${selectedProviders.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
