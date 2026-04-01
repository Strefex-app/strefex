import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useAccountRegistry } from '../store/accountRegistry'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { tenantKey } from '../utils/tenantStorage'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
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

  // Requesters see anonymized auditor identities; only superadmin can unmask.
  const canSeeNames = isSuperAdmin && !isPreviewSession
  const canSendRequests = isSuperAdmin || accountType === 'buyer' || accountType === 'seller'

  const registeredAuditors = useAccountRegistry((s) => s.getRegisteredAuditors(selectedIndustry, { onlyVerified: true }))

  const auditorRows = useMemo(() => {
    const all = Array.isArray(registeredAuditors) ? registeredAuditors : []
    return all.map((auditor) => ({
      id: auditor.id,
      company: auditor.company || auditor.contactName || auditor.email || 'Auditor Company',
      email: auditor.email || '',
      status: auditor.status || 'active',
    }))
  }, [registeredAuditors])

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
      <div className="exec-summary-page" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="exec-summary-header">
          <a className="exec-summary-back" href="#" onClick={(e) => { e.preventDefault(); navigate(-1) }}>
            ← Back
          </a>
          <h1 className="exec-summary-title" style={{ marginBottom: 6 }}>
            Auditor Executive Summary
          </h1>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            Select industry, see verified auditor companies, and send Supplier Audit RFQs.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div className="app-page-card exec-stat-card">
            <div className="exec-stat-info">
              <span className="exec-stat-value">{auditorRows.length}</span>
              <span className="exec-stat-label">Verified Auditors</span>
            </div>
          </div>
          <div className="app-page-card exec-stat-card">
            <div className="exec-stat-info">
              <span className="exec-stat-value">{selectedAuditorIds.size}</span>
              <span className="exec-stat-label">Selected Auditors</span>
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
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        Supplier Audit
                      </span>
                    </td>
                    <td>{canSeeNames ? (auditor.email || '—') : 'Hidden for requester'}</td>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32' }}>
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
