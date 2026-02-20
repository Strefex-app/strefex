import { useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useTranslation } from '../i18n/useTranslation'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import '../styles/app-page.css'
import './AuditRequest.css'
import './ServiceList.css'

/* ── Available services ─────────────────────────────────────── */
const SERVICE_OPTIONS = [
  { id: 'supplier-source', label: 'Supplier Source', group: 'Supplier Services' },
  { id: 'audit', label: 'Audit', group: 'Supplier Services' },
  { id: 'trial-run', label: 'Trial Run', group: 'Supplier Services' },
  { id: 'production-follow-up', label: 'Production Follow Up', group: 'Supplier Services' },
  { id: 'equipment-acceptance', label: 'Equipment Acceptance', group: 'Supplier Services' },
  { id: 'shipment-acceptance', label: 'Shipment Acceptance', group: 'Supplier Services' },
  { id: 'buy-off', label: 'Buy Off', group: 'Supplier Services' },
  { id: 'industrialization', label: 'Industrialization', group: 'Supplier Services' },
  { id: 'shipment-documentation', label: 'Shipment Documentation', group: 'Supplier Services' },
  { id: 'project-management-basic', label: 'Project Management — Basic', group: 'Project Management' },
  { id: 'project-management-standard', label: 'Project Management — Standard', group: 'Project Management' },
  { id: 'project-management-premium', label: 'Project Management — Premium', group: 'Project Management' },
]

const INDUSTRY_OPTIONS = [
  { id: 'automotive', label: 'Automotive Industry' },
  { id: 'machinery', label: 'Machinery Industry' },
  { id: 'electronics', label: 'Electronics Industry' },
  { id: 'medical', label: 'Medical Industry' },
  { id: 'raw-materials', label: 'Raw Materials' },
]

const PRIORITY_OPTIONS = ['Normal', 'High', 'Urgent']

/** Map service category IDs to the service option groups / ids */
const SERVICE_CATEGORY_TO_OPTIONS = {
  'project-management': SERVICE_OPTIONS.filter((s) => s.group === 'Project Management').map((s) => s.id),
  'supplier-services': SERVICE_OPTIONS.filter((s) => s.group === 'Supplier Services' && !['buy-off', 'shipment-acceptance', 'shipment-documentation', 'industrialization'].includes(s.id)).map((s) => s.id),
  'quality-services': SERVICE_OPTIONS.filter((s) => ['buy-off', 'shipment-acceptance', 'shipment-documentation', 'industrialization'].includes(s.id)).map((s) => s.id),
}

const ServiceList = () => {
  const navigate = useNavigate()
  const { industryId: paramIndustryId } = useParams()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const goBack = () => navigate(-1)
  const fileRef = useRef(null)
  const submitRequest = useServiceRequestStore((s) => s.submitRequest)
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const accountType = useSubscriptionStore((s) => s.accountType)

  // ── Service context from query params ──
  const isServiceContext = searchParams.get('context') === 'service'
  const qServiceCategory = searchParams.get('serviceCategory') || ''
  const qServiceCategoryLabel = searchParams.get('serviceCategoryLabel') || ''

  // Pre-select services that belong to the chosen service category
  const preselected = (() => {
    if (!isServiceContext || !qServiceCategory) return []
    return SERVICE_CATEGORY_TO_OPTIONS[qServiceCategory] || []
  })()

  const prefillDescription = isServiceContext
    ? `Service request — ${qServiceCategoryLabel || qServiceCategory}`
    : ''

  const [selectedServices, setSelectedServices] = useState(preselected)
  const [formData, setFormData] = useState({
    industryId: paramIndustryId || '',
    companyName: tenant?.name || user?.companyName || '',
    contactName: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    preferredDate: '',
    priority: 'Normal',
    description: prefillDescription,
    notes: '',
  })
  const [attachments, setAttachments] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleIndustrySelect = (id) => {
    setFormData((prev) => ({ ...prev, industryId: id }))
  }

  const toggleService = (serviceId) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
    e.target.value = ''
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (selectedServices.length === 0) return
    setIsSubmitting(true)

    // Save to service request store — this also creates notifications for admins/managers
    const serviceLabels = selectedServices.map((id) => {
      const opt = SERVICE_OPTIONS.find((o) => o.id === id)
      return opt ? opt.label : id
    })

    submitRequest({
      services: serviceLabels,
      industryId: formData.industryId,
      companyName: formData.companyName || user?.companyName || '',
      contactName: formData.contactName || user?.fullName || user?.name || '',
      email: formData.email || user?.email || '',
      phone: formData.phone,
      address: formData.address,
      preferredDate: formData.preferredDate,
      priority: formData.priority,
      description: formData.description,
      notes: formData.notes,
      attachmentNames: attachments.map((f) => f.name),
      accountType: accountType || 'unknown',
    })

    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 800)
  }

  const groups = [...new Set(SERVICE_OPTIONS.map((s) => s.group))]

  /* ── Success state ─────────────────────────────────────────── */
  if (isSubmitted) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); goBack() }}>
              ← Back
            </a>
            <div className="audit-success-message">
              <div className="audit-success-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <path d="M9 11L12 14L22 4M21 12V19C21 19.5 20.79 20.04 20.41 20.41C20.04 20.79 19.53 21 19 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="app-page-title">Service request sent!</h2>
              <p className="app-page-body">
                Your request for <strong>{selectedServices.length}</strong> service{selectedServices.length > 1 ? 's' : ''} has been submitted.
                We will review it and get back to you shortly.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="app-page-action" onClick={goBack}>Back</button>
                <button type="button" className="audit-submit-button" style={{ flex: 'none', padding: '12px 24px', fontSize: 14 }}
                  onClick={() => { setIsSubmitted(false); setSelectedServices([]); setFormData({ ...formData, description: '', notes: '', preferredDate: '' }); setAttachments([]) }}>
                  New Request
                </button>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  /* ── Main form ─────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); goBack() }}>
            ← Back
          </a>
          <h2 className="app-page-title">
            {isServiceContext ? `Service Request — ${qServiceCategoryLabel}` : t('service.title')}
          </h2>
          <p className="app-page-subtitle">
            {isServiceContext
              ? `Submit your service request for ${qServiceCategoryLabel}. Related services are pre-selected below.`
              : t('service.subtitle')}
          </p>
        </div>

        {/* ── Service context info banner ── */}
        {isServiceContext && (
          <div className="app-page-card" style={{
            background: 'linear-gradient(135deg, #fff3e0 0%, #fef9f0 100%)',
            border: '1px solid #ffcc80',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#e65100' }}>
              Pre-selected Service Category
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <div style={{
                flex: '1 1 200px', padding: '10px 14px', borderRadius: 8,
                background: '#fff', border: '1px solid #ffe0b2',
              }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Service Category</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{qServiceCategoryLabel}</div>
              </div>
              <div style={{
                flex: '1 1 200px', padding: '10px 14px', borderRadius: 8,
                background: '#fff', border: '1px solid #ffe0b2',
              }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Pre-selected Services</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{preselected.length} service{preselected.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#78909c' }}>
              You can adjust the selection below — add or remove individual services as needed.
            </p>
          </div>
        )}

        <div className="app-page-card">
          <form className="audit-request-form" onSubmit={handleSubmit}>

            {/* ── Section 1: Service Selection (buttons, multi-select) ── */}
            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 4 }}>Select Services</h3>
              <p className="svc-section-hint">Click to select one or multiple services. <span className="audit-required">*</span></p>

              {groups.map((group) => (
                <div key={group} className="svc-btn-group">
                  <div className="svc-btn-group-label">{group}</div>
                  <div className="svc-btn-grid">
                    {SERVICE_OPTIONS.filter((s) => s.group === group).map((svc) => {
                      const isActive = selectedServices.includes(svc.id)
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          className={`svc-toggle-btn ${isActive ? 'active' : ''}`}
                          onClick={() => toggleService(svc.id)}
                        >
                          <span className="svc-toggle-check">
                            {isActive
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" opacity=".3"/></svg>
                            }
                          </span>
                          {svc.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {selectedServices.length > 0 && (
                <div className="svc-selection-summary">
                  {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {/* ── Section 2: Industry (buttons, single select) & Scheduling ── */}
            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 4 }}>Industry &amp; Scheduling</h3>
              <p className="svc-section-hint">Select one industry for this request. <span className="audit-required">*</span></p>

              <div className="audit-form-group">
                <div className="svc-industry-grid">
                  {INDUSTRY_OPTIONS.map((opt) => {
                    const isActive = formData.industryId === opt.id
                    const isLocked = !!paramIndustryId && formData.industryId !== opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`svc-industry-btn ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                        onClick={() => !isLocked && handleIndustrySelect(opt.id)}
                        disabled={isLocked}
                      >
                        {isActive && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="svc-industry-check"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="audit-form-group">
                  <label htmlFor="preferredDate" className="audit-form-label">Preferred start date</label>
                  <input type="date" id="preferredDate" name="preferredDate" value={formData.preferredDate} onChange={handleInputChange} className="audit-form-input" />
                </div>
                <div className="audit-form-group">
                  <label htmlFor="priority" className="audit-form-label">Priority</label>
                  <select id="priority" name="priority" value={formData.priority} onChange={handleInputChange} className="audit-form-select">
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── Section 3: Contact Information ──────────────────── */}
            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 16 }}>Contact Information</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="audit-form-group">
                  <label htmlFor="companyName" className="audit-form-label">Company name <span className="audit-required">*</span></label>
                  <input type="text" id="companyName" name="companyName" value={formData.companyName} onChange={handleInputChange} className="audit-form-input" required placeholder="Your company" />
                </div>
                <div className="audit-form-group">
                  <label htmlFor="contactName" className="audit-form-label">Contact name <span className="audit-required">*</span></label>
                  <input type="text" id="contactName" name="contactName" value={formData.contactName} onChange={handleInputChange} className="audit-form-input" required placeholder="Full name" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="audit-form-group">
                  <label htmlFor="email" className="audit-form-label">Email <span className="audit-required">*</span></label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} className="audit-form-input" required placeholder="contact@company.com" />
                </div>
                <div className="audit-form-group">
                  <label htmlFor="phone" className="audit-form-label">Phone <span className="audit-required">*</span></label>
                  <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className="audit-form-input" required placeholder="+1 (555) 123-4567" />
                </div>
              </div>

              <div className="audit-form-group">
                <label htmlFor="address" className="audit-form-label">Address</label>
                <textarea id="address" name="address" value={formData.address} onChange={handleInputChange} className="audit-form-textarea" placeholder="Street, city, postal code, country" rows="2" />
              </div>
            </div>

            {/* ── Section 4: Description ──────────────────────────── */}
            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 16 }}>Description &amp; Requirements</h3>

              <div className="audit-form-group">
                <label htmlFor="description" className="audit-form-label">Describe your request</label>
                <textarea id="description" name="description" value={formData.description} onChange={handleInputChange} className="audit-form-textarea" placeholder="Provide details about the scope, specifications, or special requirements..." rows="4" />
              </div>

              <div className="audit-form-group">
                <label htmlFor="notes" className="audit-form-label">Additional notes</label>
                <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange} className="audit-form-textarea" placeholder="Any other information..." rows="2" />
              </div>
            </div>

            {/* ── Section 5: Attachments ──────────────────────────── */}
            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 8 }}>Attachments</h3>
              <p className="app-page-subtitle" style={{ marginBottom: 16 }}>
                Attach specifications, NDA, draft contracts, drawings, or other related documents.
              </p>

              <div className="audit-form-group">
                <input
                  type="file"
                  ref={fileRef}
                  multiple
                  onChange={handleFileChange}
                  className="audit-form-file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip,.rar,.dwg,.stp,.step"
                  style={{ display: 'none' }}
                />
                <button type="button" className="svc-attach-btn" onClick={() => fileRef.current?.click()}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Upload Files
                </button>
              </div>

              {attachments.length > 0 && (
                <ul className="audit-attachment-list">
                  {attachments.map((file, index) => (
                    <li key={index} className="audit-attachment-item">
                      <span className="audit-attachment-name">{file.name}</span>
                      <span style={{ fontSize: 12, color: '#999', marginLeft: 'auto', marginRight: 8 }}>
                        {file.size < 1048576 ? (file.size / 1024).toFixed(1) + ' KB' : (file.size / 1048576).toFixed(1) + ' MB'}
                      </span>
                      <button type="button" className="audit-attachment-remove" onClick={() => removeAttachment(index)} aria-label="Remove">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Actions ─────────────────────────────────────────── */}
            <div className="audit-form-actions">
              <button type="button" className="app-page-action" style={{ flex: 1 }} onClick={goBack}>Cancel</button>
              <button type="submit" className="audit-submit-button" disabled={isSubmitting || selectedServices.length === 0 || !formData.industryId}>
                {isSubmitting ? 'Sending...' : `Send Request${selectedServices.length > 0 ? ` (${selectedServices.length})` : ''}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

export default ServiceList
