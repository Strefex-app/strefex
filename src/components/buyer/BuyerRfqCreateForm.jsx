import { useEffect, useMemo, useRef, useState } from 'react'
import { ToggleCheckButton } from '../ToggleCheckButton'
import { formatMaskedManufacturerLabel } from '../../utils/buyerWorkspaceSuppliers'
import '../../pages/ExecutiveSummary.css'

const DEFAULT_REQUIREMENTS = {
  quantity: 1,
  maxLeadTime: 90,
  maxPrice: 110,
  minRating: 4.0,
  maxRisk: 50,
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function supplierLabel(supplier, index, canSeeDetails) {
  if (canSeeDetails) {
    return supplier.display_name || supplier.displayName || supplier.name || supplier.legal_name || 'Supplier'
  }
  return formatMaskedManufacturerLabel(index)
}

export default function BuyerRfqCreateForm({
  industryId,
  categoryOptions = [],
  initialCategoryId = '',
  shortlisted = [],
  showMarketplaceCatalog = false,
  isSuperAdmin = false,
  canSeeDetails = true,
  initialDraft = null,
  onContinue,
}) {
  const fileInputRef = useRef(null)
  const [title, setTitle] = useState(initialDraft?.title || '')
  const [categoryId, setCategoryId] = useState(initialDraft?.categoryId || initialCategoryId || '')
  const [description, setDescription] = useState(initialDraft?.description || '')
  const [deadline, setDeadline] = useState(initialDraft?.deadline || '')
  const [requirements, setRequirements] = useState({
    ...DEFAULT_REQUIREMENTS,
    ...(initialDraft?.requirements || {}),
  })
  const [attachments, setAttachments] = useState(initialDraft?.attachments || [])
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialDraft?.supplierIds || []))
  const [matchedSuppliers, setMatchedSuppliers] = useState([])

  useEffect(() => {
    if (initialDraft?.supplierIds?.length) {
      setSelectedIds(new Set(initialDraft.supplierIds))
      return
    }
    const ids = shortlisted.map((s) => s.supplier_id || s.id).filter(Boolean)
    setSelectedIds(new Set(ids))
  }, [shortlisted, initialDraft?.supplierIds])

  useEffect(() => {
    if (categoryId) return
    if (initialCategoryId) setCategoryId(initialCategoryId)
    else if (categoryOptions[0]?.id) setCategoryId(categoryOptions[0].id)
  }, [categoryId, initialCategoryId, categoryOptions])

  useEffect(() => {
    let cancelled = false
    const loadMatches = async () => {
      if (!industryId || !categoryId) {
        setMatchedSuppliers([])
        return
      }
      const db = await import('../../data/supplierDatabase')
      const rows = db.matchSuppliersToRfq({
        industryId,
        categoryId,
        requirements,
        excludeMarketplaceCatalog: !showMarketplaceCatalog,
        superadminPlatformView: isSuperAdmin,
      })
      if (!cancelled) setMatchedSuppliers(rows)
    }
    void loadMatches()
    return () => {
      cancelled = true
    }
  }, [industryId, categoryId, requirements, showMarketplaceCatalog, isSuperAdmin])

  const supplierRows = useMemo(() => {
    const map = new Map()
    shortlisted.forEach((row, index) => {
      const id = row.supplier_id || row.id
      if (!id) return
      map.set(id, {
        id,
        name: supplierLabel(row, index, canSeeDetails),
        matchScore: row.overall_score || row.fitLevel || null,
        source: 'shortlist',
      })
    })
    matchedSuppliers.forEach((row, index) => {
      if (map.has(row.id)) {
        const existing = map.get(row.id)
        map.set(row.id, { ...existing, matchScore: row.matchScore ?? existing.matchScore })
        return
      }
      map.set(row.id, {
        id: row.id,
        name: canSeeDetails ? row.name : formatMaskedManufacturerLabel(shortlisted.length + index),
        matchScore: row.matchScore,
        source: 'directory',
      })
    })
    return [...map.values()]
  }, [shortlisted, matchedSuppliers, canSeeDetails])

  const toggleSupplier = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    ])
    e.target.value = ''
  }

  const canContinue = title.trim().length > 0 && categoryId && selectedIds.size > 0

  const handleContinue = (e) => {
    e.preventDefault()
    if (!canContinue) return
    onContinue?.({
      title: title.trim(),
      description: description.trim(),
      deadline: deadline || null,
      categoryId,
      requirements,
      attachments,
      supplierIds: [...selectedIds],
    })
  }

  return (
    <form className="bw-rfq-form" onSubmit={handleContinue}>
      <div className="exec-form-group">
        <label htmlFor="bw-rfq-title">RFQ title *</label>
        <input
          id="bw-rfq-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter RFQ title…"
        />
      </div>
      <div className="exec-form-group">
        <label htmlFor="bw-rfq-category">Equipment / product category *</label>
        <select
          id="bw-rfq-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Select category…</option>
          {categoryOptions.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div className="exec-form-group">
        <label htmlFor="bw-rfq-desc">Description</label>
        <textarea
          id="bw-rfq-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Scope, materials, tolerances, delivery expectations…"
          rows={3}
        />
      </div>
      <div className="exec-form-group">
        <label htmlFor="bw-rfq-deadline">Response deadline</label>
        <input
          id="bw-rfq-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <div className="exec-form-row">
        <div className="exec-form-group">
          <label htmlFor="bw-rfq-qty">Quantity</label>
          <input
            id="bw-rfq-qty"
            type="number"
            min="1"
            value={requirements.quantity}
            onChange={(e) => setRequirements({
              ...requirements,
              quantity: parseInt(e.target.value, 10) || 1,
            })}
          />
        </div>
        <div className="exec-form-group">
          <label htmlFor="bw-rfq-lead">Max lead time (days)</label>
          <input
            id="bw-rfq-lead"
            type="number"
            min="1"
            value={requirements.maxLeadTime}
            onChange={(e) => setRequirements({
              ...requirements,
              maxLeadTime: parseInt(e.target.value, 10) || 90,
            })}
          />
        </div>
      </div>
      <div className="exec-form-row">
        <div className="exec-form-group">
          <label htmlFor="bw-rfq-price">Max price index</label>
          <input
            id="bw-rfq-price"
            type="number"
            min="50"
            max="200"
            value={requirements.maxPrice}
            onChange={(e) => setRequirements({
              ...requirements,
              maxPrice: parseInt(e.target.value, 10) || 110,
            })}
          />
        </div>
        <div className="exec-form-group">
          <label htmlFor="bw-rfq-rating">Min rating</label>
          <input
            id="bw-rfq-rating"
            type="number"
            min="1"
            max="5"
            step="0.1"
            value={requirements.minRating}
            onChange={(e) => setRequirements({
              ...requirements,
              minRating: parseFloat(e.target.value) || 4.0,
            })}
          />
        </div>
        <div className="exec-form-group">
          <label htmlFor="bw-rfq-risk">Max supplier risk (%)</label>
          <input
            id="bw-rfq-risk"
            type="number"
            min="0"
            max="100"
            value={requirements.maxRisk ?? ''}
            onChange={(e) => setRequirements({
              ...requirements,
              maxRisk: e.target.value === ''
                ? undefined
                : Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
            })}
          />
        </div>
      </div>
      <div className="exec-form-group">
        <label>Attachments</label>
        <div className="exec-attachments">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="exec-attach-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Attach files
          </button>
          {attachments.length > 0 && (
            <div className="exec-attachment-list">
              {attachments.map((file, index) => (
                <div key={`${file.name}-${index}`} className="exec-attachment-item">
                  <span className="attachment-name">{file.name}</span>
                  <span className="attachment-size">{formatFileSize(file.size)}</span>
                  <button
                    type="button"
                    className="attachment-remove"
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="exec-form-group">
        <label>Invite suppliers ({selectedIds.size})</label>
        <p className="exec-matched-suppliers-note">
          Shortlisted suppliers plus matches from the executive summary supplier database, ranked by
          fit and your RFQ limits on lead time, price index, rating, and risk.
        </p>
        {supplierRows.length === 0 ? (
          <p className="app-page-subtitle" style={{ margin: 0 }}>No suppliers available for this category yet.</p>
        ) : (
          <div className="exec-matched-suppliers">
            {supplierRows.map((row) => (
              <ToggleCheckButton
                key={row.id}
                style={{ display: 'flex', width: '100%', marginBottom: 6, alignItems: 'center', justifyContent: 'space-between' }}
                checked={selectedIds.has(row.id)}
                onChange={() => toggleSupplier(row.id)}
              >
                <span>{row.name}</span>
                {row.matchScore != null && (
                  <span className="matched-score">{row.matchScore}%</span>
                )}
              </ToggleCheckButton>
            ))}
          </div>
        )}
      </div>
      <button type="submit" className="app-page-btn-primary" disabled={!canContinue}>
        Continue to send →
      </button>
    </form>
  )
}
