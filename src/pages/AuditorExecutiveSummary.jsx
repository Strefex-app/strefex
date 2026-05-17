import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAccountRegistry } from '../store/accountRegistry'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { tenantKey } from '../utils/tenantStorage'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import WorldMap from '../components/WorldMap'
import { getApproximateLngLatOrFallback } from '../utils/accountApproximateLocation'
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

export default function AuditorExecutiveSummary() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const submitServiceRequest = useServiceRequestStore((s) => s.submitRequest)

  const queryIndustry = String(searchParams.get('industry') || '').trim().toLowerCase()
  const defaultIndustry = INDUSTRIES.some((i) => i.id === queryIndustry) ? queryIndustry : 'automotive'
  const [selectedIndustry, setSelectedIndustry] = useState(defaultIndustry)
  const [selectedAuditorIds, setSelectedAuditorIds] = useState(new Set())
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({
    title: '',
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

  const canSeeNames = isSuperAdmin && !isPreviewSession
  const canSendRequests = isSuperAdmin || accountType === 'buyer' || accountType === 'seller'

  const registeredAuditors = useAccountRegistry((s) => s.getRegisteredAuditors(selectedIndustry, { onlyVerified: true }))
  const allRegisteredAuditorsForMap = useAccountRegistry((s) => s.getRegisteredAuditors(null, { onlyVerified: false }))

  const auditorRows = useMemo(() => {
    const all = Array.isArray(registeredAuditors) ? registeredAuditors : []
    return all.map((auditor) => ({
      id: auditor.id,
      company: auditor.company || auditor.contactName || auditor.email || 'Auditor Company',
      email: auditor.email || '',
      status: auditor.status || 'active',
      country: auditor.country || '',
      city: auditor.city || '',
      address: auditor.address || '',
    }))
  }, [registeredAuditors])

  const registryMapAccounts = useMemo(() => {
    const aud = Array.isArray(allRegisteredAuditorsForMap) ? allRegisteredAuditorsForMap : []
    const seen = new Set()
    const out = []
    for (const auditor of aud) {
      if (!auditor?.id || seen.has(auditor.id)) continue
      seen.add(auditor.id)
      out.push({
        id: auditor.id,
        company: auditor.company || auditor.contactName || auditor.email || 'Auditor',
        country: auditor.country || '',
        city: auditor.city || '',
        address: auditor.address || '',
        email: auditor.email || '',
        rating: auditor.rating,
      })
    }
    return out
  }, [allRegisteredAuditorsForMap])

  const auditorMapLocations = useMemo(
    () =>
      registryMapAccounts.map((a, idx) => {
        const coords = getApproximateLngLatOrFallback({
          country: a.country,
          city: a.city,
          address: a.address,
          seed: a.id,
        })
        const name = canSeeNames ? a.company : `Auditor #${String(idx + 1).padStart(2, '0')}`
        return {
          id: a.id,
          name,
          coordinates: coords,
          city: a.city,
          country: a.country,
          rating: Number(a.rating) > 0 ? Number(a.rating) : undefined,
        }
      }),
    [registryMapAccounts, canSeeNames],
  )

  const mapPinCount = auditorMapLocations.length

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
    return Math.min(100, Math.round((auditorRows.length / m) * 100))
  }, [auditorRows.length, mapPinCount])

  const industryLabel = INDUSTRIES.find((x) => x.id === selectedIndustry)?.label || selectedIndustry
  const selectedAuditors = auditorRows.filter((a) => selectedAuditorIds.has(a.id))

  useEffect(() => {
    setSelectedAuditorIds(new Set())
    setIsSubmitted(false)
  }, [selectedIndustry])

  const toggleAuditorSelection = (auditorId) => {
    setSelectedAuditorIds((prev) => {
      const next = new Set(prev)
      if (next.has(auditorId)) next.delete(auditorId)
      else next.add(auditorId)
      return next
    })
  }

  const openRequestModal = () => {
    if (selectedAuditorIds.size === 0 || !canSendRequests) return
    setRequestForm((prev) => ({
      ...prev,
      title: prev.title || `Supplier Audit RFQ — ${industryLabel}`,
    }))
    setShowRequestModal(true)
  }

  const handleCreateAuditRequest = () => {
    if (selectedAuditors.length === 0 || !requestForm.title.trim()) return
    setIsSubmitting(true)

    selectedAuditors.forEach((auditor) => {
      submitServiceRequest({
        services: ['Supplier Audit'],
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
        serviceCategoryId: 'supplier-audit',
        serviceCategoryLabel: 'Supplier Audit',
        preferredProviderId: auditor?.id || null,
        preferredProviderName: auditor?.company || null,
        preferredProviderEmail: auditor?.email || null,
        requestSource: 'auditor-executive-summary',
      })
    })

    setTimeout(() => {
      setIsSubmitting(false)
      setShowRequestModal(false)
      setIsSubmitted(true)
      setSelectedAuditorIds(new Set())
      setRequestForm({
        title: '',
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
                Supplier Audit — {industryLabel} — Auditor metrics & targeted RFQs
              </p>
              <p className="exec-map-disclaimer" style={{ marginTop: 8 }}>
                Map shows every registered auditor (all industries). The table lists verified auditors for the selected
                industry only.
              </p>
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="exec-btn-secondary"
                  onClick={() => navigate('/service-hub/executive-summary')}
                >
                  Service Provider Executive Summary
                </button>
              </div>
            </div>
            <button
              type="button"
              className="exec-rfq-btn"
              disabled={!canSendRequests || selectedAuditorIds.size === 0}
              title={selectedAuditorIds.size === 0 ? 'Select one or more auditors in the table below' : undefined}
              onClick={openRequestModal}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Create Supplier Audit RFQ
            </button>
          </div>
        </div>

        <div className="exec-main-indicators">
          <div className="exec-indicator-card">
            <span className="exec-indicator-label">AUDITOR QUALITY INDEX</span>
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
            <h3 className="exec-section-title">Auditor locations</h3>
            <p className="exec-map-disclaimer">
              Pins use country/city when known; otherwise a non-precise fallback position so every registered auditor
              appears. Map is fixed; zoom is disabled.
            </p>
            <div className="exec-map-container">
              <WorldMap variant="executive" locations={auditorMapLocations} />
            </div>
            <div className="exec-map-legend">
              <span className="legend-item">
                <span className="legend-dot champagne" /> Registered auditor location (approx.)
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
                <span className="exec-stat-value">{auditorRows.length}</span>
                <span className="exec-stat-label">Verified in industry</span>
              </div>
            </div>
            <div className="app-page-card exec-stat-card">
              <div className="exec-stat-icon responses">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="exec-stat-info">
                <span className="exec-stat-value">{selectedAuditorIds.size}</span>
                <span className="exec-stat-label">Selected for RFQ</span>
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

        <div className="app-page-card">
          <div className="exec-table-header-row">
            <h3 className="exec-section-title" style={{ marginBottom: 0 }}>
              Auditor Companies ({auditorRows.length})
            </h3>
            {canSendRequests && selectedAuditorIds.size > 0 && (
              <button type="button" className="exec-multi-rfq-btn" onClick={openRequestModal}>
                Send Supplier Audit RFQ to {selectedAuditorIds.size} Auditor{selectedAuditorIds.size > 1 ? 's' : ''}
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
                      checked={auditorRows.length > 0 && selectedAuditorIds.size === auditorRows.length}
                      onChange={() => {
                        if (selectedAuditorIds.size === auditorRows.length) setSelectedAuditorIds(new Set())
                        else setSelectedAuditorIds(new Set(auditorRows.map((a) => a.id)))
                      }}
                      disabled={!canSendRequests}
                      title="Select all auditors"
                      aria-label="Select all auditors"
                    />
                  </th>
                  <th>Auditor Company</th>
                  <th>Service</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {auditorRows.map((auditor, idx) => (
                  <tr key={auditor.id} className={selectedAuditorIds.has(auditor.id) ? 'rfq-checked' : ''}>
                    <td className="exec-td-check">
                      <ToggleCheckButton
                        compact
                        checked={selectedAuditorIds.has(auditor.id)}
                        onChange={() => toggleAuditorSelection(auditor.id)}
                        disabled={!canSendRequests}
                        title="Select auditor"
                        aria-label="Select auditor"
                      />
                    </td>
                    <td>{canSeeNames ? auditor.company : `Auditor #${String(idx + 1).padStart(2, '0')}`}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        Supplier Audit
                      </span>
                    </td>
                    <td>{canSeeNames ? auditor.email || '—' : 'Hidden for requester'}</td>
                    <td>
                      {canSendRequests ? (
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => {
                            setSelectedAuditorIds(new Set([auditor.id]))
                            setRequestForm((prev) => ({
                              ...prev,
                              title: prev.title || `Supplier Audit RFQ — ${industryLabel}`,
                            }))
                            setShowRequestModal(true)
                          }}
                        >
                          Request
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#999' }}>Buyer/Seller only</span>
                      )}
                    </td>
                  </tr>
                ))}
                {auditorRows.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, color: '#666', textAlign: 'center' }}>
                      No verified auditors available in this industry yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isSubmitted && (
          <div className="app-page-card" style={{ marginTop: 16, border: '1px solid #c8e6c9', background: '#f1f8e9' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2e7d32' }}>
              Supplier Audit RFQ submitted successfully.
            </div>
            <div style={{ fontSize: 13, color: '#4e6b4e', marginTop: 4 }}>
              Your request was sent to selected verified auditors.
            </div>
          </div>
        )}

        {showRequestModal && (
          <div className="exec-modal-overlay" onClick={() => !isSubmitting && setShowRequestModal(false)}>
            <div className="exec-modal" onClick={(e) => e.stopPropagation()}>
              <div className="exec-modal-header">
                <h3>Create Supplier Audit RFQ</h3>
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
                    placeholder="Enter supplier audit request title"
                  />
                </div>
                <div className="exec-form-row">
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
                  <div className="exec-form-group">
                    <label>Preferred Date</label>
                    <input
                      type="date"
                      value={requestForm.preferredDate}
                      onChange={(e) => setRequestForm({ ...requestForm, preferredDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="exec-form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                    placeholder="Audit scope, standards, supplier profile, timeline"
                  />
                </div>
                <div style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>
                  This RFQ will be sent to <strong>{selectedAuditors.length}</strong> selected auditor{selectedAuditors.length !== 1 ? 's' : ''}.
                </div>
              </div>
              <div className="exec-modal-footer">
                <button type="button" className="exec-btn-secondary" onClick={() => setShowRequestModal(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="exec-btn-primary"
                  onClick={handleCreateAuditRequest}
                  disabled={isSubmitting || !requestForm.title.trim() || selectedAuditors.length === 0}
                >
                  {isSubmitting ? 'Sending...' : `Send to ${selectedAuditors.length} Auditor${selectedAuditors.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
