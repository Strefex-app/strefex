import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import { useAccountRegistry } from '../store/accountRegistry'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import {
  AUDIT_SERVICE_ITEMS,
  AUDIT_SERVICES_CATEGORY_ID,
  auditServiceLabel,
} from '../data/auditServices'
import '../styles/app-page.css'
import './AuditRequest.css'

const INDUSTRY_OPTIONS = [
  { id: 'automotive', label: 'Automotive Industry' },
  { id: 'machinery', label: 'Machinery Industry' },
  { id: 'electronics', label: 'Electronics Industry' },
  { id: 'medical', label: 'Medical Industry' },
  { id: 'raw-materials', label: 'Raw Materials' },
  { id: 'oil-gas', label: 'Oil & Gas' },
  { id: 'green-energy', label: 'Green Energy' },
  { id: 'nuclear', label: 'Nuclear' },
  { id: 'household-products', label: 'Household Products' },
]

const AUDIT_STANDARD_OPTIONS = [
  'ISO 9001',
  'IATF 16949',
  'ISO 14001',
  'ISO 45001',
  'ISO 13485',
  'VDA 6.3',
  'Custom / Other',
]

const AuditRequest = () => {
  const navigate = useNavigate()
  const { industryId: paramIndustryId } = useParams()
  const user = useAuthStore((s) => s.user)
  const submitRequest = useServiceRequestStore((s) => s.submitRequest)
  const getAuditProvidersForIndustry = useAccountRegistry((s) => s.getAuditProvidersForIndustry)
  const [formData, setFormData] = useState({
    auditDate: '',
    industryId: paramIndustryId || '',
    auditTypeId: 'supplier-audit',
    preferredProviderEmail: '',
    supplierCompanyName: '',
    supplierContactName: '',
    supplierEmail: '',
    supplierPhone: '',
    supplierAddress: '',
    auditStandard: '',
    otherStandard: '',
    notes: '',
  })
  const [attachments, setAttachments] = useState([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notifiedCount, setNotifiedCount] = useState(0)

  const providers = useMemo(() => {
    if (!formData.industryId) return []
    return getAuditProvidersForIndustry(formData.industryId, formData.auditTypeId || AUDIT_SERVICES_CATEGORY_ID)
  }, [formData.industryId, formData.auditTypeId, getAuditProvidersForIndustry])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [...prev, ...files])
  }

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const industryLabel = INDUSTRY_OPTIONS.find((opt) => opt.id === formData.industryId)?.label || formData.industryId
    const auditTypeLabel = auditServiceLabel(formData.auditTypeId)
    const standard = formData.auditStandard === 'Custom / Other' && formData.otherStandard
      ? formData.otherStandard
      : formData.auditStandard
    const preferred = providers.find(
      (p) => String(p.email || '').toLowerCase() === String(formData.preferredProviderEmail || '').toLowerCase(),
    )
    const supplierSummary = `Supplier: ${formData.supplierCompanyName}; Contact: ${formData.supplierContactName}; Email: ${formData.supplierEmail}; Phone: ${formData.supplierPhone}; Address: ${formData.supplierAddress}`
    const matching = getAuditProvidersForIndustry(formData.industryId, formData.auditTypeId)
    submitRequest({
      services: [auditTypeLabel, 'Supplier Audit'],
      industryId: formData.industryId,
      industryLabel,
      companyName: user?.companyName || user?.fullName || 'Requesting Company',
      contactName: user?.fullName || formData.supplierContactName || 'Requester',
      email: user?.email || formData.supplierEmail || '',
      phone: user?.phone || formData.supplierPhone || '',
      address: user?.address || '',
      preferredDate: formData.auditDate || '',
      priority: 'High',
      description: `Audit type: ${auditTypeLabel}. Audit standard: ${standard || 'N/A'}. ${supplierSummary}`,
      notes: formData.notes || '',
      attachmentNames: attachments.map((f) => f.name),
      accountType: user?.accountType || 'buyer',
      serviceCategoryId: formData.auditTypeId || AUDIT_SERVICES_CATEGORY_ID,
      serviceCategoryLabel: auditTypeLabel,
      preferredProviderId: preferred?.id || null,
      preferredProviderName: preferred?.company || preferred?.contactName || null,
      preferredProviderEmail: formData.preferredProviderEmail || null,
      requestSource: 'audit-request-page',
    })
    setNotifiedCount(preferred ? 1 : matching.length)
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 250)
  }

  if (isSubmitted) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
              ← Back
            </a>
            <div className="audit-success-message">
              <div className="audit-success-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="app-page-title">Audit request sent</h2>
              <p className="app-page-body">
                {notifiedCount > 0
                  ? `Your audit request was submitted. ${notifiedCount} audit compan${notifiedCount === 1 ? 'y was' : 'ies were'} notified.`
                  : 'Your audit request was submitted. Matching audit companies will be notified when they register for this industry.'}
              </p>
              <button type="button" className="app-page-action" style={{ marginTop: 16, maxWidth: 200 }} onClick={() => navigate(-1)}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="app-page">
        <div className="app-page-card">
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <h2 className="app-page-title">Request an audit</h2>
          <p className="app-page-subtitle">
            Choose industry and audit type. You select an audit company (or notify all matching companies for that industry). Individual auditors are assigned later by the company.
          </p>
        </div>

        <div className="app-page-card">
          <form className="audit-request-form" onSubmit={handleSubmit}>
            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 16 }}>Date, industry &amp; audit type</h3>

              <div className="audit-form-group">
                <label htmlFor="auditDate" className="audit-form-label">Preferred audit date <span className="audit-required">*</span></label>
                <input
                  type="date"
                  id="auditDate"
                  name="auditDate"
                  value={formData.auditDate}
                  onChange={handleInputChange}
                  className="audit-form-input"
                  required
                />
              </div>

              <div className="audit-form-group">
                <label htmlFor="industryId" className="audit-form-label">Industry <span className="audit-required">*</span></label>
                <select
                  id="industryId"
                  name="industryId"
                  value={formData.industryId}
                  onChange={handleInputChange}
                  className="audit-form-select"
                  required
                  disabled={!!paramIndustryId}
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="audit-form-group">
                <label htmlFor="auditTypeId" className="audit-form-label">Audit service <span className="audit-required">*</span></label>
                <select
                  id="auditTypeId"
                  name="auditTypeId"
                  value={formData.auditTypeId}
                  onChange={handleInputChange}
                  className="audit-form-select"
                  required
                >
                  {AUDIT_SERVICE_ITEMS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="audit-form-group">
                <label htmlFor="preferredProviderEmail" className="audit-form-label">
                  Audit company {formData.industryId ? `(${providers.length} in industry)` : ''}
                </label>
                <select
                  id="preferredProviderEmail"
                  name="preferredProviderEmail"
                  value={formData.preferredProviderEmail}
                  onChange={handleInputChange}
                  className="audit-form-select"
                  disabled={!formData.industryId}
                >
                  <option value="">Notify all matching audit companies in this industry</option>
                  {providers.map((p) => (
                    <option key={p.id || p.email} value={p.email || ''}>
                      {(p.company || p.email || 'Company')}
                      {p.accountType === 'auditor' ? ' · Auditor firm' : ' · Service provider'}
                    </option>
                  ))}
                </select>
                {formData.industryId && providers.length === 0 ? (
                  <p className="app-page-subtitle" style={{ marginTop: 8 }}>
                    No audit companies registered for this industry yet. Your request is still stored.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 16 }}>Supplier information</h3>

              <div className="audit-form-group">
                <label htmlFor="supplierCompanyName" className="audit-form-label">Supplier company name <span className="audit-required">*</span></label>
                <input
                  type="text"
                  id="supplierCompanyName"
                  name="supplierCompanyName"
                  value={formData.supplierCompanyName}
                  onChange={handleInputChange}
                  className="audit-form-input"
                  required
                  placeholder="Company name"
                />
              </div>

              <div className="audit-form-group">
                <label htmlFor="supplierContactName" className="audit-form-label">Contact name <span className="audit-required">*</span></label>
                <input
                  type="text"
                  id="supplierContactName"
                  name="supplierContactName"
                  value={formData.supplierContactName}
                  onChange={handleInputChange}
                  className="audit-form-input"
                  required
                  placeholder="Full name"
                />
              </div>

              <div className="audit-form-group">
                <label htmlFor="supplierEmail" className="audit-form-label">Email <span className="audit-required">*</span></label>
                <input
                  type="email"
                  id="supplierEmail"
                  name="supplierEmail"
                  value={formData.supplierEmail}
                  onChange={handleInputChange}
                  className="audit-form-input"
                  required
                  placeholder="contact@supplier.com"
                />
              </div>

              <div className="audit-form-group">
                <label htmlFor="supplierPhone" className="audit-form-label">Phone <span className="audit-required">*</span></label>
                <input
                  type="tel"
                  id="supplierPhone"
                  name="supplierPhone"
                  value={formData.supplierPhone}
                  onChange={handleInputChange}
                  className="audit-form-input"
                  required
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="audit-form-group">
                <label htmlFor="supplierAddress" className="audit-form-label">Full address <span className="audit-required">*</span></label>
                <textarea
                  id="supplierAddress"
                  name="supplierAddress"
                  value={formData.supplierAddress}
                  onChange={handleInputChange}
                  className="audit-form-textarea"
                  required
                  placeholder="Street, city, postal code, country"
                  rows="3"
                />
              </div>
            </div>

            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 16 }}>Audit standard</h3>

              <div className="audit-form-group">
                <label htmlFor="auditStandard" className="audit-form-label">Standard <span className="audit-required">*</span></label>
                <select
                  id="auditStandard"
                  name="auditStandard"
                  value={formData.auditStandard}
                  onChange={handleInputChange}
                  className="audit-form-select"
                  required
                >
                  <option value="">Select standard</option>
                  {AUDIT_STANDARD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {formData.auditStandard === 'Custom / Other' && (
                <div className="audit-form-group">
                  <label htmlFor="otherStandard" className="audit-form-label">Specify standard</label>
                  <input
                    type="text"
                    id="otherStandard"
                    name="otherStandard"
                    value={formData.otherStandard}
                    onChange={handleInputChange}
                    className="audit-form-input"
                    placeholder="e.g. internal checklist"
                  />
                </div>
              )}

              <div className="audit-form-group">
                <label htmlFor="notes" className="audit-form-label">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="audit-form-textarea"
                  placeholder="Additional requirements or scope"
                  rows="2"
                />
              </div>
            </div>

            <div className="audit-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 16 }}>Attachments</h3>
              <p className="app-page-subtitle" style={{ marginBottom: 16 }}>Add documents (scope, checklists, previous reports).</p>

              <div className="audit-form-group">
                <label htmlFor="attachments" className="audit-form-label">Add files</label>
                <input
                  type="file"
                  id="attachments"
                  multiple
                  onChange={handleFileChange}
                  className="audit-form-file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                />
              </div>

              {attachments.length > 0 && (
                <ul className="audit-attachment-list">
                  {attachments.map((file, index) => (
                    <li key={index} className="audit-attachment-item">
                      <span className="audit-attachment-name">{file.name}</span>
                      <button type="button" className="audit-attachment-remove" onClick={() => removeAttachment(index)} aria-label="Remove">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="audit-form-actions">
              <button type="button" className="app-page-action" style={{ flex: 1 }} onClick={() => navigate(-1)}>Cancel</button>
              <button type="submit" className="audit-submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

export default AuditRequest
