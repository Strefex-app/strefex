import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ServiceProviderAvailabilityCard, { SERVICE_CATEGORY_LABELS } from '../components/ServiceProviderAvailabilityCard'
import { useAccountRegistry } from '../store/accountRegistry'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useAuthStore } from '../store/authStore'
import { useFeatureFlag, useSubscriptionStore } from '../services/featureFlags'
import { tenantKey } from '../utils/tenantStorage'
import '../styles/app-page.css'
import './ExecutiveSummary.css'

const INDUSTRIES = [
  { id: 'automotive', label: 'Automotive' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'medical', label: 'Medical' },
  { id: 'raw-materials', label: 'Raw Materials' },
  { id: 'oil-gas', label: 'Oil & Gas' },
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
  const hasFullCompanyVisibility = useFeatureFlag('fullCompanyVisibility')
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

  const canSeeNames = (hasFullCompanyVisibility || isSuperAdmin) && !isPreviewSession
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
    }))
  }, [registeredAuditors])
  const providerRows = useMemo(() => {
    return [...serviceProviderRows, ...auditorRows]
  }, [serviceProviderRows, auditorRows])
  const filteredProviderRows = useMemo(() => {
    if (selectedServiceCategory === 'all') return providerRows
    return providerRows.filter((provider) => (provider.serviceCategories || []).includes(selectedServiceCategory))
  }, [providerRows, selectedServiceCategory])

  const serviceTypeCount = useMemo(() => {
    const set = new Set()
    filteredProviderRows.forEach((p) => (p.serviceCategories || []).forEach((id) => set.add(id)))
    return set.size
  }, [filteredProviderRows])

  const industryLabel = INDUSTRIES.find((x) => x.id === selectedIndustry)?.label || selectedIndustry
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
    if (serviceCategoryId === 'project-management') return ['Project Management — Standard']
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
      <div className="exec-summary-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="exec-summary-header">
          <a className="exec-summary-back" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <h1 className="exec-summary-title" style={{ marginBottom: 6 }}>
            Service Provider Executive Summary
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            Find registered service providers and send targeted service requests by industry.
          </p>
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="exec-btn-secondary"
              onClick={() => navigate(`/auditor-hub/executive-summary?industry=${selectedIndustry}`)}
            >
              Open Auditor Executive Summary
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div className="app-page-card exec-stat-card">
            <div className="exec-stat-info">
              <span className="exec-stat-value">{filteredProviderRows.length}</span>
              <span className="exec-stat-label">{isAuditMode ? 'Matched Auditors' : 'Matched Providers'}</span>
            </div>
          </div>
          <div className="app-page-card exec-stat-card">
            <div className="exec-stat-info">
              <span className="exec-stat-value">{serviceTypeCount}</span>
              <span className="exec-stat-label">Service Types In Selection</span>
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
          subtitle={isAuditMode
            ? 'Select verified auditor companies by industry and send Supplier Audit RFQs.'
            : 'Request project management, buy-off and related supplier services from registered providers in this industry.'}
          onRequestService={canSendRequests ? (serviceId, label) => {
            const p = new URLSearchParams({
              context: 'service',
              serviceCategory: serviceId,
              serviceCategoryLabel: label,
              industry: selectedIndustry,
              industryLabel,
              requestSource: 'executive-summary',
            })
            navigate(`/services?${p.toString()}`)
          } : undefined}
          onRequestProvider={canSendRequests ? (provider, requestMeta) => {
            const targetedServiceId = selectedServiceCategory !== 'all'
              ? selectedServiceCategory
              : (requestMeta?.serviceCategoryId || 'supplier-services')
            const targetedServiceLabel = selectedServiceCategory !== 'all'
              ? (SERVICE_CATEGORY_LABELS[selectedServiceCategory] || selectedServiceCategory)
              : (requestMeta?.serviceCategoryLabel || 'Supplier Services')
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
          } : undefined}
        />

        <div className="app-page-card" style={{ marginTop: 16 }}>
          <div className="exec-table-header-row">
            <h3 className="exec-section-title" style={{ marginBottom: 0 }}>
              {isAuditMode ? 'Auditor Summary' : 'Service Provider Summary'} ({filteredProviderRows.length})
            </h3>
            {canSendRequests && selectedProviderIds.size > 0 && (
              <button type="button" className="exec-multi-rfq-btn" onClick={openRequestModal}>
                Send {isAuditMode ? 'Supplier Audit RFQ' : 'Service Request'} to {selectedProviderIds.size} {selectedEntityLabel}{selectedProviderIds.size > 1 ? 's' : ''}
              </button>
            )}
          </div>
          <div className="exec-table-wrapper">
            <table className="exec-table">
              <thead>
                <tr>
                  <th className="exec-th-check">
                    <input
                      type="checkbox"
                      checked={filteredProviderRows.length > 0 && selectedProviderIds.size === filteredProviderRows.length}
                      onChange={() => {
                        if (selectedProviderIds.size === filteredProviderRows.length) setSelectedProviderIds(new Set())
                        else setSelectedProviderIds(new Set(filteredProviderRows.map((p) => p.id)))
                      }}
                      disabled={!canSendRequests}
                      title="Select all providers"
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
                      <input
                        type="checkbox"
                        checked={selectedProviderIds.has(provider.id)}
                        onChange={() => toggleProviderSelection(provider.id)}
                        disabled={!canSendRequests}
                        title="Select provider"
                      />
                    </td>
                    <td>{canSeeNames ? provider.company : `${isAuditMode ? 'Auditor' : 'Service Provider'} #${String(idx + 1).padStart(2, '0')}`}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(provider.serviceCategories.length > 0 ? provider.serviceCategories : ['supplier-services']).map((serviceId) => (
                          <span
                            key={`${provider.id}-${serviceId}`}
                            style={{
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 12,
                              background: '#f1f5f9',
                              color: '#475569',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {SERVICE_CATEGORY_LABELS[serviceId] || serviceId}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{canSeeNames ? (provider.email || '—') : 'Hidden by plan'}</td>
                    <td>
                      {canSendRequests ? (
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => {
                            setSelectedProviderIds(new Set([provider.id]))
                            setRequestForm((prev) => ({
                              ...prev,
                              serviceCategoryId: selectedServiceCategory !== 'all'
                                ? selectedServiceCategory
                                : (provider?.serviceCategories?.[0] || 'supplier-services'),
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
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32' }}>
              Service request submitted successfully.
            </div>
            <div style={{ fontSize: 13, color: '#4e6b4e', marginTop: 4 }}>
              Your targeted request was sent to selected {isAuditMode ? 'auditors' : 'providers'} from the executive summary.
            </div>
          </div>
        )}

        {showRequestModal && (
          <div className="exec-modal-overlay" onClick={() => !isSubmitting && setShowRequestModal(false)}>
            <div className="exec-modal" onClick={(e) => e.stopPropagation()}>
              <div className="exec-modal-header">
                <h3>{isAuditMode ? 'Create Supplier Audit RFQ' : 'Create Service Request'}</h3>
                <button type="button" className="exec-btn-secondary" onClick={() => setShowRequestModal(false)} disabled={isSubmitting}>
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
                        <option key={id} value={id}>{label}</option>
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
                  This request will be sent to <strong>{selectedProviders.length}</strong> selected {selectedEntityLabel.toLowerCase()}{selectedProviders.length !== 1 ? 's' : ''}.
                </div>
              </div>
              <div className="exec-modal-footer">
                <button type="button" className="exec-btn-secondary" onClick={() => setShowRequestModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="exec-btn-primary"
                  onClick={handleCreateServiceRequest}
                  disabled={isSubmitting || !requestForm.title.trim() || selectedProviders.length === 0}
                >
                  {isSubmitting ? 'Sending...' : `Send to ${selectedProviders.length} ${selectedEntityLabel}${selectedProviders.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
