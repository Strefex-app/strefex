import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useSubscriptionStore } from '../../services/featureFlags'
import { useTransactionStore } from '../../store/transactionStore'
import {
  SERVICE_CATALOG,
  formatServicePrice,
  groupServicesByCategory,
} from '../../data/serviceCatalog'

const CATEGORY_META = {
  'Supplier Services': { color: '#e65100', short: 'Supplier' },
  'Project Management': { color: '#00d4ff', short: 'Project' },
  Consulting: { color: '#8e44ad', short: 'Consulting' },
}

export default function PlansServiceSection() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const submitPlatformServiceRequest = useTransactionStore((s) => s.submitPlatformServiceRequest)

  const servicesByCategory = useMemo(() => groupServicesByCategory(SERVICE_CATALOG), [])
  const categories = Object.keys(servicesByCategory)

  const [activeCategory, setActiveCategory] = useState(null)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submittedId, setSubmittedId] = useState(null)
  const [error, setError] = useState('')

  const visibleCategories = activeCategory ? [activeCategory] : categories

  const toggleService = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setSubmittedId(null)
    setError('')
  }

  const toggleCategory = (category) => {
    setActiveCategory((prev) => (prev === category ? null : category))
  }

  const selectedServices = SERVICE_CATALOG.filter((s) => selectedIds.has(s.id))
  const selectedTotal = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0)

  const handleSubmit = async () => {
    if (selectedServices.length === 0 || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const tx = submitPlatformServiceRequest({
        services: selectedServices,
        userEmail: user?.email || '',
        companyName: tenant?.name || user?.companyName || '',
        contactName: user?.fullName || user?.name || user?.email || '',
        accountType: accountType || 'seller',
      })
      setSubmittedId(tx?.id || null)
      setSelectedIds(new Set())
    } catch {
      setError('Could not submit the request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="sp-services-section">
      <div className="app-page-card sp-services-card">
        <div className="sp-services-header">
          <div className="min-width-0">
            <h3 className="sp-section-title">Platform Services</h3>
            <p className="sp-section-subtitle stx-text-wrap">
              Select services below, then send a request. STREFEX will review, assign a team member, and follow up with a quotation.
            </p>
          </div>
        </div>

        <div className="sp-services-categories" role="group" aria-label="Service categories">
          {categories.map((category) => {
            const meta = CATEGORY_META[category] || { color: '#546e7a', short: category }
            const isActive = activeCategory === category
            const countInCategory = servicesByCategory[category]?.length || 0
            const selectedInCategory = servicesByCategory[category]?.filter((s) => selectedIds.has(s.id)).length || 0
            return (
              <button
                key={category}
                type="button"
                className={`sp-services-category-widget ${isActive ? 'is-active' : ''}`}
                onClick={() => toggleCategory(category)}
                aria-pressed={isActive}
              >
                <span className="sp-services-category-dot" style={{ background: meta.color }} />
                <span className="sp-services-category-label">{meta.short}</span>
                <span className="sp-services-category-count">{countInCategory}</span>
                {selectedInCategory > 0 && (
                  <span className="sp-services-category-selected">{selectedInCategory} selected</span>
                )}
              </button>
            )
          })}
        </div>

        {visibleCategories.map((category) => (
          <div key={category} className="sp-services-group">
            <h4 className="sp-services-group-title">{category}</h4>
            <div className="sp-services-grid">
              {servicesByCategory[category].map((service) => {
                const isSelected = selectedIds.has(service.id)
                return (
                  <button
                    key={service.id}
                    type="button"
                    className={`sp-service-selectable ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleService(service.id)}
                    aria-pressed={isSelected}
                  >
                    <span className="sp-service-selectable__check" aria-hidden>{isSelected ? '✓' : ''}</span>
                    <div className="sp-service-selectable__head">
                      <span className="sp-service-item-name stx-text-wrap">{service.name}</span>
                      <span className="sp-service-item-price">{formatServicePrice(service.price, service.currency)}</span>
                    </div>
                    <p className="sp-service-item-desc stx-text-wrap">{service.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <div className="sp-services-action-bar">
          <div className="sp-services-action-summary min-width-0">
            {selectedServices.length === 0 ? (
              <span className="sp-services-action-hint">Select one or more services to request a quote.</span>
            ) : (
              <span className="sp-services-action-hint stx-text-wrap">
                <strong>{selectedServices.length}</strong> selected · indicative total{' '}
                <strong>{formatServicePrice(selectedTotal)}</strong>
              </span>
            )}
            {submittedId && (
              <span className="sp-services-action-success stx-text-wrap">
                Request <strong>{submittedId}</strong> sent. You and STREFEX will receive status updates.
              </span>
            )}
            {error && <span className="sp-services-action-error">{error}</span>}
          </div>
          <div className="sp-services-action-buttons">
            <button
              type="button"
              className="sp-btn sp-btn-primary sp-services-request-btn"
              disabled={selectedServices.length === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? 'Sending…' : 'Send Service Request'}
            </button>
            <button
              type="button"
              className="sp-btn sp-btn-outline"
              onClick={() => navigate('/service-requests')}
            >
              My requests
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
