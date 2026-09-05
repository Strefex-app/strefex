import { useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAuthStore } from '../store/authStore'
import useRfqStore from '../store/rfqStore'
import { getEquipmentCategoriesForIndustry } from '../data/equipmentCategoriesByIndustry'
import { getEquipmentForIndustryCategory } from '../data/equipmentByIndustryCategory'
import {
  getSuppliersByIndustry,
  getSuppliersByIndustryAndCategory,
  filterSuppliersRespectingCatalogVisibility,
  augmentSupplierListForSuperadminPlatformView,
} from '../data/supplierDatabase'
import { useMarketplaceCatalogVisibilityEffective } from '../hooks/useMarketplaceCatalogVisibilityEffective'
import { rfqIntelligenceUrl } from '../constants/rfqPaths'
import { DEFAULT_ASK_REQUIREMENTS } from '../utils/standardRfqSchema'
import '../styles/app-page.css'
import './EquipmentSupplierRequest.css'

const INDUSTRY_OPTIONS = [
  { id: 'automotive', label: 'Automotive Industry' },
  { id: 'machinery', label: 'Machinery Industry' },
  { id: 'electronics', label: 'Electronics Industry' },
  { id: 'medical', label: 'Medical Industry' },
]

const EquipmentSupplierRequest = () => {
  const navigate = useNavigate()
  const { industryId: paramIndustryId } = useParams()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const addRfq = useRfqStore((s) => s.addRfq)
  const sendRfq = useRfqStore((s) => s.sendRfq)

  // ── Product context from query params ──
  const isProductContext = searchParams.get('context') === 'product'
  const qIndustry = searchParams.get('industry') || ''
  const qIndustryLabel = searchParams.get('industryLabel') || ''
  const qProductCategory = searchParams.get('productCategory') || ''
  const qProcess = searchParams.get('process') || ''

  // Build a pre-filled notes string when coming from Product flow
  const prefillNotes = isProductContext
    ? `Product request — ${qIndustryLabel || qIndustry} industry, ${qProductCategory}${qProcess ? ` / ${qProcess}` : ''}`
    : ''

  const [formData, setFormData] = useState({
    industryId: paramIndustryId || qIndustry || '',
    categoryId: '',
    equipmentId: '',
    companyName: tenant?.name || user?.companyName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    notes: prefillNotes,
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedBuyerRef, setSubmittedBuyerRef] = useState('')
  const [submitError, setSubmitError] = useState('')

  const industryId = formData.industryId || paramIndustryId || qIndustry
  const categories = useMemo(
    () => getEquipmentCategoriesForIndustry(industryId),
    [industryId]
  )
  const equipmentList = useMemo(
    () =>
      formData.categoryId
        ? getEquipmentForIndustryCategory(industryId, formData.categoryId)
        : [],
    [industryId, formData.categoryId]
  )

  const showMarketplaceCatalog = useMarketplaceCatalogVisibilityEffective()

  const goBack = () => navigate(-1)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (name === 'industryId') {
        next.categoryId = ''
        next.equipmentId = ''
      }
      if (name === 'categoryId') next.equipmentId = ''
      return next
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setSubmitError('')
    const industryLabel = INDUSTRY_OPTIONS.find((opt) => opt.id === formData.industryId)?.label || formData.industryId
    const selectedCategory = categories.find((cat) => cat.id === formData.categoryId)?.name || formData.categoryId
    const selectedEquipment = equipmentList.find((eq) => eq.id === formData.equipmentId)?.name || formData.equipmentId

    const raw =
      !isProductContext && formData.categoryId
        ? getSuppliersByIndustryAndCategory(formData.industryId, formData.categoryId)
        : getSuppliersByIndustry(formData.industryId)
    const staticSuppliers = augmentSupplierListForSuperadminPlatformView(
      filterSuppliersRespectingCatalogVisibility(raw, showMarketplaceCatalog),
      formData.industryId,
      !isProductContext && formData.categoryId ? formData.categoryId : null,
      isSuperAdmin,
    )
    const seen = new Set()
    const supplierIds = []
    const maxSuppliers = 12
    const pushUnique = (id) => {
      if (!id || seen.has(id) || supplierIds.length >= maxSuppliers) return
      seen.add(id)
      supplierIds.push(id)
    }
    ;(staticSuppliers || []).forEach((s) => pushUnique(s?.id))

    if (supplierIds.length === 0) {
      setSubmitError(
        'No suppliers are available for this industry yet. Complete your Executive Summary to invite suppliers or try another industry.'
      )
      return
    }

    setIsSubmitting(true)
    try {
      const title = isProductContext
        ? `Product quote — ${qProductCategory}${qProcess ? ` (${qProcess})` : ''}`
        : `Equipment sourcing — ${selectedEquipment || selectedCategory || industryLabel}`
      const descriptionBlock = isProductContext
        ? `Quote request for ${qProductCategory}${qProcess ? ` / ${qProcess}` : ''} in ${qIndustryLabel || qIndustry}.${formData.notes ? ` Notes: ${formData.notes}` : ''}`
        : `Equipment type: ${selectedCategory || 'N/A'}; Equipment: ${selectedEquipment || 'N/A'}.${
            formData.notes ? ` Notes: ${formData.notes}` : ''
          }`
      const rfq = {
        title,
        industryId: formData.industryId,
        categoryId: isProductContext ? '' : formData.categoryId || '',
        requirements: {
          ...DEFAULT_ASK_REQUIREMENTS,
          requestDetail: descriptionBlock,
          companyName: formData.companyName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          contactName: user?.fullName || formData.companyName,
          rfqKind: isProductContext ? 'product-component' : 'equipment',
        },
        suppliers: supplierIds,
        buyerEmail: formData.email || user?.email || '',
        buyerCompany: formData.companyName || tenant?.name || user?.companyName || '',
      }
      const created = addRfq(rfq)
      if (!created?.id) {
        setSubmitError('Could not create RFQ. Please try again.')
        setIsSubmitting(false)
        return
      }
      sendRfq(created.id)
      setSubmittedBuyerRef(created.buyerRefDisplay || '')
      setIsSubmitted(true)
    } catch {
      setSubmitError('Could not send RFQ. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <AppLayout>
        <div className="app-page">
          <div className="app-page-card">
            <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); goBack() }}>
              ← Back
            </a>
            <div className="equipment-success-message">
              <div className="equipment-success-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 11L12 14L22 4M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            <h2 className="app-page-title">RFQ sent</h2>
            <p className="app-page-body">
              Your request was sent as an RFQ{submittedBuyerRef ? ` (${submittedBuyerRef})` : ''}.
              {isProductContext ? ' Suppliers can respond with quotes from their dashboards.' : ' Suppliers matched to your industry will receive this RFQ.'}
            </p>
              <button type="button" className="app-page-action" style={{ marginTop: 16, maxWidth: 200 }} onClick={goBack}>
                Back
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
          <a className="app-page-back-link" href="#" onClick={(e) => { e.preventDefault(); goBack() }}>
            ← Back
          </a>
          <h2 className="app-page-title">{isProductContext ? 'Product Supplier Quote Request' : 'Equipment Supplier Selection'}</h2>
          <p className="app-page-subtitle">
            {isProductContext
              ? 'Submit your quote request for the selected product & manufacturing process. Industry and product details are pre-filled below.'
              : 'Select industry, equipment type and specific equipment. Attach your account information and send the request.'}
          </p>
        </div>

        {/* ── Product context info banner ── */}
        {isProductContext && (
          <div className="app-page-card" style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '1px solid #bfdbfe',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#1e40af' }}>
              Pre-selected Product Information
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <div style={{
                flex: '1 1 200px', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid #dbeafe',
              }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Industry</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{qIndustryLabel || qIndustry}</div>
              </div>
              <div style={{
                flex: '1 1 200px', padding: '10px 14px', borderRadius: 8,
                background: 'var(--bg-card)', border: '1px solid #dbeafe',
              }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Product Category</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{qProductCategory}</div>
              </div>
              {qProcess && (
                <div style={{
                  flex: '1 1 200px', padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-card)', border: '1px solid #dbeafe',
                }}>
                  <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Manufacturing Process</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{qProcess}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="app-page-card">
          <form className="equipment-request-form" onSubmit={handleSubmit}>
            {/* ── Industry & equipment section (hidden when product context) ── */}
            <div className="equipment-form-section" style={isProductContext ? { display: 'none' } : {}}>
              <h3 className="app-page-title" style={{ marginBottom: 16 }}>Industry & equipment</h3>

              <div className="equipment-form-group">
                <label htmlFor="industryId" className="equipment-form-label">Industry <span className="equipment-required">*</span></label>
                <select
                  id="industryId"
                  name="industryId"
                  value={formData.industryId}
                  onChange={handleInputChange}
                  className="equipment-form-select"
                  required={!isProductContext}
                  disabled={!!paramIndustryId || isProductContext}
                >
                  <option value="">Select industry</option>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="equipment-form-group">
                <label htmlFor="categoryId" className="equipment-form-label">Equipment type <span className="equipment-required">*</span></label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="equipment-form-select"
                  required={!isProductContext}
                  disabled={!industryId}
                >
                  <option value="">Select equipment type</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="equipment-form-group">
                <label htmlFor="equipmentId" className="equipment-form-label">Equipment <span className="equipment-required">*</span></label>
                <select
                  id="equipmentId"
                  name="equipmentId"
                  value={formData.equipmentId}
                  onChange={handleInputChange}
                  className="equipment-form-select"
                  required={!isProductContext}
                  disabled={!formData.categoryId}
                >
                  <option value="">Select equipment</option>
                  {equipmentList.map((eq) => (
                    <option key={eq.id} value={eq.id}>{eq.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="equipment-form-section">
              <h3 className="app-page-title" style={{ marginBottom: 16 }}>Account information</h3>

              <div className="equipment-form-group">
                <label htmlFor="companyName" className="equipment-form-label">Company name <span className="equipment-required">*</span></label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="equipment-form-input"
                  required
                  placeholder="Your company name"
                />
              </div>

              <div className="equipment-form-group">
                <label htmlFor="email" className="equipment-form-label">Email <span className="equipment-required">*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="equipment-form-input"
                  required
                  placeholder="company@example.com"
                />
              </div>

              <div className="equipment-form-group">
                <label htmlFor="phone" className="equipment-form-label">Phone <span className="equipment-required">*</span></label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="equipment-form-input"
                  required
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="equipment-form-group">
                <label htmlFor="address" className="equipment-form-label">Address <span className="equipment-required">*</span></label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="equipment-form-textarea"
                  required
                  placeholder="Full address"
                  rows="3"
                />
              </div>

              <div className="equipment-form-group">
                <label htmlFor="notes" className="equipment-form-label">Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="equipment-form-textarea"
                  placeholder="Additional requirements or comments"
                  rows="2"
                />
              </div>
            </div>

            {submitError && (
              <div
                style={{
                  marginBottom: 16,
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: 14,
                }}
              >
                {submitError}
              </div>
            )}
            <div className="equipment-form-actions" style={{ flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                className="app-page-action"
                style={{ flex: '1 1 140px', minWidth: 120 }}
                onClick={() => {
                  const partHint =
                    equipmentList.find((eq) => eq.id === formData.equipmentId)?.name ||
                    qProcess ||
                    categories.find((cat) => cat.id === formData.categoryId)?.name ||
                    ''
                  navigate(
                    rfqIntelligenceUrl(`tab=new&industryId=${encodeURIComponent(industryId || qIndustry)}&customer=${encodeURIComponent(formData.companyName || '')}&part=${encodeURIComponent(partHint)}`),
                  )
                }}
              >
                RFQ Intelligence
              </button>
              <button type="button" className="app-page-action" style={{ flex: 1 }} onClick={() => navigate(-1)}>
                Cancel
              </button>
              <button type="submit" className="equipment-submit-button" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send RFQ'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}

export default EquipmentSupplierRequest
