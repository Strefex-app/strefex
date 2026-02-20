import { useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import { useTemplateStore, STATUS_LABELS } from '../store/templateStore'
import { useAuthStore } from '../store/authStore'
import { getUserId } from '../utils/tenantStorage'
import './TemplateLibrary.css'

let _fileIdSeq = 0
const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

const FILE_ICON_MAP = {
  'application/pdf': '📕',
  'application/msword': '📘',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'application/vnd.ms-excel': '📗',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📗',
  'application/vnd.ms-powerpoint': '📙',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📙',
  'image/png': '🖼️', 'image/jpeg': '🖼️', 'image/gif': '🖼️', 'image/webp': '🖼️',
  'application/zip': '📦', 'application/x-zip-compressed': '📦',
}
const getFileIcon = (type) => FILE_ICON_MAP[type] || '📎'

const CATEGORIES = ['All', 'Procurement', 'Contracts', 'Quality', 'Compliance', 'HR', 'Finance', 'Reports']
const FORMATS = ['DOCX', 'XLSX', 'PPTX', 'PDF']
const STATUS_FILTERS = ['all_status', 'approved', 'pending_approval', 'draft', 'rejected']
const STATUS_FILTER_LABELS = { all_status: 'All Statuses', approved: 'Approved', pending_approval: 'Pending', draft: 'Drafts', rejected: 'Rejected' }

const ICON_OPTIONS = ['📋','📦','📨','📊','⚖️','📜','🔒','⏱️','📑','✅','🔍','🔧','🏭','🌱','🛡️','🔗','👤','📈','🧾','💰','📝','📰','🎯','🏆','💼','🤝','📄','🚀','✈️','🎓','💹','📉','💳','🏦','🗓️','⚠️','🎛️','🔬','📥','🚫','🌍','♻️']

const emptyTemplate = () => ({
  name: '',
  category: 'Procurement',
  description: '',
  format: 'DOCX',
  pages: 1,
  downloads: 0,
  rating: 0,
  tags: [],
  icon: '📄',
  featured: false,
  files: [],
})

export default function TemplateLibrary() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const userId = getUserId()
  const canApprove = role === 'manager' || role === 'admin' || role === 'superadmin'
  const canManage = role === 'admin' || role === 'superadmin'

  const {
    getVisibleTemplates, getPendingApproval,
    addTemplate, updateTemplate, deleteTemplate,
    submitForApproval, approveTemplate, rejectTemplate,
    toggleFeatured, incrementDownloads,
  } = useTemplateStore()

  const allTemplates = useTemplateStore((s) => s.templates)
  const templates = getVisibleTemplates()
  const pendingQueue = getPendingApproval()

  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('downloads')
  const [statusFilter, setStatusFilter] = useState('all_status')

  const [editModal, setEditModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectNote, setRejectNote] = useState('')
  const [tagInput, setTagInput] = useState('')
  const fileInputRef = useRef(null)

  const filtered = useMemo(() => {
    let r = templates
    if (statusFilter !== 'all_status') r = r.filter((t) => t.status === statusFilter)
    if (category !== 'All') r = r.filter((t) => t.category === category)
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.tags.some((tag) => tag.includes(q)))
    }
    if (sortBy === 'downloads') r = [...r].sort((a, b) => b.downloads - a.downloads)
    else if (sortBy === 'rating') r = [...r].sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name))
    return r
  }, [templates, category, search, sortBy, statusFilter])

  const featured = templates.filter((t) => t.featured && t.status === 'approved')

  const openCreate = useCallback(() => {
    setEditModal({ ...emptyTemplate(), _isNew: true })
    setTagInput('')
  }, [])

  const openEdit = useCallback((t) => {
    const isOwner = (t._createdBy || '').toLowerCase() === userId
    const editable = isOwner || canManage || t._createdBy === 'system'
    if (!editable && t.status !== 'draft' && t.status !== 'rejected') return
    setEditModal({ ...t, _isNew: false })
    setTagInput('')
  }, [userId, canManage])

  const saveTemplate = useCallback(() => {
    if (!editModal) return
    const { _isNew, ...data } = editModal
    if (!data.name.trim()) return
    if (_isNew) {
      addTemplate(data)
    } else {
      updateTemplate(data.id, data)
    }
    setEditModal(null)
  }, [editModal, addTemplate, updateTemplate])

  const confirmDelete = useCallback(() => {
    if (!deleteConfirm) return
    deleteTemplate(deleteConfirm)
    setDeleteConfirm(null)
  }, [deleteConfirm, deleteTemplate])

  const handleSubmitForApproval = useCallback((id) => {
    submitForApproval(id)
  }, [submitForApproval])

  const handleApprove = useCallback((id) => {
    approveTemplate(id)
  }, [approveTemplate])

  const handleReject = useCallback(() => {
    if (!rejectModal) return
    rejectTemplate(rejectModal, rejectNote || 'Rejected by manager')
    setRejectModal(null)
    setRejectNote('')
  }, [rejectModal, rejectNote, rejectTemplate])

  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || !editModal) return
    if (!editModal.tags.includes(tag)) {
      setEditModal((m) => ({ ...m, tags: [...m.tags, tag] }))
    }
    setTagInput('')
  }, [tagInput, editModal])

  const removeTag = useCallback((tag) => {
    setEditModal((m) => ({ ...m, tags: m.tags.filter((t) => t !== tag) }))
  }, [])

  const setField = useCallback((field, value) => {
    setEditModal((m) => ({ ...m, [field]: value }))
  }, [])

  const handleFilesSelected = useCallback((e) => {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    const newFiles = selected.map((f) => ({
      id: `file-${++_fileIdSeq}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }))
    setEditModal((m) => ({ ...m, files: [...(m.files || []), ...newFiles] }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const removeFile = useCallback((fileId) => {
    setEditModal((m) => ({ ...m, files: (m.files || []).filter((f) => f.id !== fileId) }))
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const dropped = Array.from(e.dataTransfer.files || [])
    if (!dropped.length) return
    const newFiles = dropped.map((f) => ({
      id: `file-${++_fileIdSeq}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
    }))
    setEditModal((m) => ({ ...m, files: [...(m.files || []), ...newFiles] }))
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const downloadTemplate = useCallback((t) => {
    const ext = t.format.toLowerCase()
    const mimeMap = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      pdf: 'application/pdf',
    }
    const separator = '═'.repeat(52)
    const content = [
      separator,
      `  ${t.name}`,
      separator,
      '',
      `Category:     ${t.category}`,
      `Format:       ${t.format}`,
      `Pages:        ${t.pages}`,
      `Rating:       ${'★'.repeat(Math.round(t.rating))} (${t.rating}/5)`,
      `Tags:         ${t.tags.join(', ')}`,
      '',
      separator,
      '  Description',
      separator,
      '',
      t.description,
      '',
      ...(t.files && t.files.length > 0 ? [
        separator,
        '  Attached Files',
        separator,
        '',
        ...t.files.map((f, i) => `  ${i + 1}. ${f.name} (${fmtSize(f.size)})`),
        '',
      ] : []),
      separator,
      `  Generated by STREFEX Platform — ${new Date().toLocaleDateString()}`,
      separator,
    ].join('\n')

    const blob = new Blob([content], { type: mimeMap[ext] || 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${t.name.replace(/[^a-zA-Z0-9 _()-]/g, '').trim()}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    incrementDownloads(t.id)
  }, [incrementDownloads])

  const catCounts = useMemo(() => {
    const m = {}
    CATEGORIES.forEach((c) => { m[c] = c === 'All' ? templates.length : templates.filter((t) => t.category === c).length })
    return m
  }, [templates])

  const statusCounts = useMemo(() => {
    const m = { all_status: templates.length, approved: 0, pending_approval: 0, draft: 0, rejected: 0 }
    templates.forEach((t) => { if (m[t.status] !== undefined) m[t.status]++ })
    return m
  }, [templates])

  const isOwner = (t) => (t._createdBy || '').toLowerCase() === userId
  const canEditTemplate = (t) => isOwner(t) || canManage || t._createdBy === 'system'
  const canDeleteTemplate = (t) => isOwner(t) || canManage

  return (
    <AppLayout>
      <div className="tpl-page">
        {/* Header */}
        <div className="tpl-header">
          <div>
            <button className="tpl-back" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="tpl-title">Template Library</h1>
            <p className="tpl-subtitle">
              Procurement-specific templates — contracts, forms, checklists & reports
              <span className="tpl-role-badge">{role}</span>
            </p>
          </div>
          <button className="tpl-create-btn" onClick={openCreate}>
            <Icon name="plus" size={16} /> New Template
          </button>
        </div>

        {/* KPIs */}
        <div className="tpl-kpis">
          <div className="tpl-kpi"><span className="tpl-kpi-n">{templates.length}</span>Templates</div>
          <div className="tpl-kpi"><span className="tpl-kpi-n">{CATEGORIES.length - 1}</span>Categories</div>
          <div className="tpl-kpi"><span className="tpl-kpi-n">{featured.length}</span>Featured</div>
          <div className="tpl-kpi"><span className="tpl-kpi-n">{templates.reduce((s, t) => s + t.downloads, 0).toLocaleString()}</span>Downloads</div>
          {canApprove && pendingQueue.length > 0 && (
            <div className="tpl-kpi tpl-kpi-pending">
              <span className="tpl-kpi-n">{pendingQueue.length}</span>Pending Approval
            </div>
          )}
        </div>

        {/* ── Approval Queue (managers/admins only) ──────────── */}
        {canApprove && pendingQueue.length > 0 && (
          <div className="tpl-approval-section">
            <h4 className="tpl-section-title">
              <Icon name="check" size={18} /> Approval Queue
              <span className="tpl-approval-count">{pendingQueue.length}</span>
            </h4>
            <div className="tpl-approval-list">
              {pendingQueue.map((t) => (
                <div key={t.id} className="tpl-approval-card">
                  <span className="tpl-card-icon">{t.icon}</span>
                  <div className="tpl-approval-info">
                    <h5>{t.name}</h5>
                    <p>{t.description}</p>
                    <div className="tpl-approval-meta">
                      <span className="tpl-approval-by">Submitted by {t._createdBy === 'system' ? 'STREFEX' : t._createdBy}</span>
                      <span className="tpl-approval-date">{t._createdAt ? new Date(t._createdAt).toLocaleDateString() : ''}</span>
                      <span className="tpl-card-format">{t.format}</span>
                      {t.files?.length > 0 && <span className="tpl-approval-files">{t.files.length} file{t.files.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <div className="tpl-approval-actions">
                    <button className="tpl-approve-btn" onClick={() => handleApprove(t.id)} title="Approve">
                      <Icon name="check" size={14} /> Approve
                    </button>
                    <button className="tpl-reject-btn" onClick={() => { setRejectModal(t.id); setRejectNote('') }} title="Reject">
                      <Icon name="close" size={14} /> Reject
                    </button>
                    <button className="tpl-card-action-btn" onClick={() => openEdit(t)} title="Review">
                      <Icon name="edit" size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <div className="tpl-featured">
            <h4>Featured Templates</h4>
            <div className="tpl-featured-grid">
              {featured.map((t) => (
                <div key={t.id} className="tpl-featured-card" onClick={() => openEdit(t)}>
                  <span className="tpl-card-icon">{t.icon}</span>
                  <h5>{t.name}</h5>
                  <span className="tpl-card-cat">{t.category}</span>
                  <span className="tpl-card-rating">{'★'.repeat(Math.round(t.rating))} {t.rating}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="tpl-filters">
          <input className="tpl-search" placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />

          {/* Status filter (visible to managers/admins who can see all statuses) */}
          {canApprove && (
            <div className="tpl-status-btns">
              {STATUS_FILTERS.map((sf) => (
                <button
                  key={sf}
                  className={`tpl-status-btn tpl-status-${sf} ${statusFilter === sf ? 'active' : ''}`}
                  onClick={() => setStatusFilter(sf)}
                >
                  {STATUS_FILTER_LABELS[sf]}
                  <span className="tpl-status-count">{statusCounts[sf]}</span>
                </button>
              ))}
            </div>
          )}

          <div className="tpl-cat-btns">
            {CATEGORIES.map((c) => (
              <button key={c} className={`tpl-cat-btn ${category === c ? 'active' : ''}`} onClick={() => setCategory(c)}>
                {c} <span className="tpl-cat-count">{catCounts[c]}</span>
              </button>
            ))}
          </div>
          <select className="tpl-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="downloads">Most Downloaded</option>
            <option value="rating">Highest Rated</option>
            <option value="name">A-Z</option>
          </select>
        </div>

        {/* Template Grid */}
        <div className="tpl-grid">
          {/* Generate card */}
          <div className="tpl-card tpl-card-generate" onClick={openCreate}>
            <div className="tpl-generate-inner">
              <Icon name="plus" size={32} />
              <h5 className="tpl-card-name">Create New Template</h5>
              <p className="tpl-card-desc">Generate a blank template or start from scratch</p>
            </div>
          </div>

          {filtered.map((t) => (
            <div key={t.id} className={`tpl-card ${t.status !== 'approved' ? `tpl-card-status-${t.status}` : ''}`}>
              <div className="tpl-card-top">
                <span className="tpl-card-icon">{t.icon}</span>
                <div className="tpl-card-top-actions">
                  {t.status !== 'approved' && (
                    <span className={`tpl-status-badge tpl-badge-${t.status}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  )}
                  <span className="tpl-card-format">{t.format}</span>
                  {canEditTemplate(t) && (
                    <button className="tpl-card-action-btn" title="Edit" onClick={() => openEdit(t)}><Icon name="edit" size={14} /></button>
                  )}
                  {canManage && (
                    <button className="tpl-card-action-btn tpl-star-btn" title={t.featured ? 'Remove featured' : 'Mark featured'} onClick={() => toggleFeatured(t.id)}>
                      <Icon name="star" size={14} style={t.featured ? { color: 'var(--color-primary)' } : undefined} />
                    </button>
                  )}
                  {canDeleteTemplate(t) && (
                    <button className="tpl-card-action-btn tpl-delete-btn" title="Delete" onClick={() => setDeleteConfirm(t.id)}><Icon name="trash" size={14} /></button>
                  )}
                </div>
              </div>
              <h5 className="tpl-card-name">{t.name}</h5>
              <p className="tpl-card-desc">{t.description}</p>

              {/* Creator info */}
              {t._createdBy && t._createdBy !== 'system' && (
                <div className="tpl-card-creator">
                  <Icon name="user" size={11} />
                  <span>{t._createdBy}</span>
                  {t._createdAt && <span className="tpl-card-date">{new Date(t._createdAt).toLocaleDateString()}</span>}
                </div>
              )}

              {/* Rejection note */}
              {t.status === 'rejected' && t._rejectionNote && (
                <div className="tpl-rejection-note">
                  <strong>Reason:</strong> {t._rejectionNote}
                </div>
              )}

              <div className="tpl-card-tags">{t.tags.map((tag) => <span key={tag} className="tpl-tag">{tag}</span>)}</div>
              {t.files && t.files.length > 0 && (
                <div className="tpl-card-files">
                  <Icon name="document" size={12} />
                  <span>{t.files.length} file{t.files.length !== 1 ? 's' : ''} attached</span>
                  <div className="tpl-card-file-list">
                    {t.files.map((f) => (
                      <span key={f.id} className="tpl-card-file-chip" title={f.name}>
                        {getFileIcon(f.type)} {f.name.length > 20 ? f.name.slice(0, 18) + '…' : f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="tpl-card-footer">
                <span className="tpl-card-rating">★ {t.rating}</span>
                <span className="tpl-card-downloads">{t.downloads} downloads</span>
                <span className="tpl-card-pages">{t.pages} pg</span>
              </div>

              {/* Action buttons — context-dependent */}
              <div className="tpl-card-btns">
                {t.status === 'approved' && (
                  <button className="tpl-download-btn" onClick={() => downloadTemplate(t)}>Download</button>
                )}

                {/* Draft: owner can submit for approval */}
                {t.status === 'draft' && isOwner(t) && (
                  <button className="tpl-submit-btn" onClick={() => handleSubmitForApproval(t.id)}>
                    Submit for Approval
                  </button>
                )}

                {/* Rejected: owner can re-edit and re-submit */}
                {t.status === 'rejected' && isOwner(t) && (
                  <>
                    <button className="tpl-edit-btn" onClick={() => openEdit(t)}>Edit & Resubmit</button>
                    <button className="tpl-submit-btn" onClick={() => handleSubmitForApproval(t.id)}>
                      Resubmit
                    </button>
                  </>
                )}

                {/* Pending: manager can approve/reject */}
                {t.status === 'pending_approval' && canApprove && !isOwner(t) && (
                  <>
                    <button className="tpl-approve-btn" onClick={() => handleApprove(t.id)}>Approve</button>
                    <button className="tpl-reject-btn" onClick={() => { setRejectModal(t.id); setRejectNote('') }}>Reject</button>
                  </>
                )}

                {t.status === 'pending_approval' && isOwner(t) && (
                  <span className="tpl-card-pending-label">Awaiting manager approval</span>
                )}

                {canEditTemplate(t) && t.status !== 'rejected' && (
                  <button className="tpl-edit-btn" onClick={() => openEdit(t)}>Edit</button>
                )}
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="tpl-empty">No templates match your search.</div>}
      </div>

      {/* ── Edit / Create Modal ──────────────────────────────── */}
      {editModal && (
        <div className="tpl-modal-overlay" onClick={() => setEditModal(null)}>
          <div className="tpl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <h3>{editModal._isNew ? 'Create New Template' : 'Edit Template'}</h3>
              {!editModal._isNew && editModal.status && (
                <span className={`tpl-status-badge tpl-badge-${editModal.status}`}>
                  {STATUS_LABELS[editModal.status] || editModal.status}
                </span>
              )}
              <button className="tpl-modal-close" onClick={() => setEditModal(null)}><Icon name="close" size={18} /></button>
            </div>

            <div className="tpl-modal-body">
              {/* Icon picker */}
              <label className="tpl-field-label">Icon</label>
              <div className="tpl-icon-picker">
                {ICON_OPTIONS.map((ic) => (
                  <button key={ic} className={`tpl-icon-opt ${editModal.icon === ic ? 'active' : ''}`} onClick={() => setField('icon', ic)}>{ic}</button>
                ))}
              </div>

              <div className="tpl-form-row">
                <div className="tpl-form-group tpl-fg-wide">
                  <label className="tpl-field-label">Template Name</label>
                  <input className="tpl-field-input" placeholder="e.g. Purchase Order Template" value={editModal.name} onChange={(e) => setField('name', e.target.value)} />
                </div>
              </div>

              <div className="tpl-form-row">
                <div className="tpl-form-group">
                  <label className="tpl-field-label">Category</label>
                  <select className="tpl-field-input" value={editModal.category} onChange={(e) => setField('category', e.target.value)}>
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="tpl-form-group">
                  <label className="tpl-field-label">Format</label>
                  <select className="tpl-field-input" value={editModal.format} onChange={(e) => setField('format', e.target.value)}>
                    {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="tpl-form-group">
                  <label className="tpl-field-label">Pages</label>
                  <input type="number" className="tpl-field-input" min="1" value={editModal.pages} onChange={(e) => setField('pages', Number(e.target.value) || 1)} />
                </div>
              </div>

              <div className="tpl-form-group tpl-fg-wide">
                <label className="tpl-field-label">Description</label>
                <textarea className="tpl-field-textarea" rows={3} placeholder="Describe what this template contains..." value={editModal.description} onChange={(e) => setField('description', e.target.value)} />
              </div>

              {/* Tags */}
              <div className="tpl-form-group tpl-fg-wide">
                <label className="tpl-field-label">Tags</label>
                <div className="tpl-tags-editor">
                  {editModal.tags.map((tag) => (
                    <span key={tag} className="tpl-tag tpl-tag-editable">{tag} <button onClick={() => removeTag(tag)}>×</button></span>
                  ))}
                  <input
                    className="tpl-tag-input"
                    placeholder="Add tag..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  />
                </div>
              </div>

              {/* Attachments */}
              <div className="tpl-form-group tpl-fg-wide">
                <label className="tpl-field-label">Attachments ({(editModal.files || []).length})</label>
                {(editModal.files || []).length > 0 && (
                  <div className="tpl-file-list">
                    {editModal.files.map((f) => (
                      <div key={f.id} className="tpl-file-row">
                        <span className="tpl-file-icon">{getFileIcon(f.type)}</span>
                        <div className="tpl-file-info">
                          <span className="tpl-file-name">{f.name}</span>
                          <span className="tpl-file-size">{fmtSize(f.size)}</span>
                        </div>
                        <button className="tpl-file-remove" title="Remove file" onClick={() => removeFile(f.id)}>
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="tpl-drop-zone" onDrop={handleDrop} onDragOver={handleDragOver} onClick={() => fileInputRef.current?.click()}>
                  <Icon name="upload" size={20} />
                  <span>Drop files here or <strong>browse</strong></span>
                  <span className="tpl-drop-hint">PDF, DOCX, XLSX, PPTX, images, ZIP — max 25 MB each</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp,.zip"
                  style={{ display: 'none' }}
                  onChange={handleFilesSelected}
                />
              </div>

              {canManage && (
                <div className="tpl-form-row">
                  <label className="tpl-featured-check">
                    <input type="checkbox" checked={editModal.featured} onChange={(e) => setField('featured', e.target.checked)} />
                    Mark as Featured
                  </label>
                </div>
              )}
            </div>

            <div className="tpl-modal-footer">
              <button className="tpl-modal-cancel" onClick={() => setEditModal(null)}>Cancel</button>
              <button className="tpl-modal-save" onClick={saveTemplate} disabled={!editModal.name.trim()}>
                {editModal._isNew ? 'Create Template' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ────────────────────────────────────── */}
      {rejectModal && (
        <div className="tpl-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="tpl-modal tpl-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <h3>Reject Template</h3>
              <button className="tpl-modal-close" onClick={() => setRejectModal(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="tpl-modal-body">
              <p className="tpl-delete-msg">
                Rejecting <strong>{allTemplates.find((t) => t.id === rejectModal)?.name}</strong>. The creator will be able to edit and resubmit.
              </p>
              <div className="tpl-form-group tpl-fg-wide">
                <label className="tpl-field-label">Rejection Reason</label>
                <textarea
                  className="tpl-field-textarea"
                  rows={3}
                  placeholder="Explain why this template was rejected..."
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
              </div>
            </div>
            <div className="tpl-modal-footer">
              <button className="tpl-modal-cancel" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="tpl-modal-delete" onClick={handleReject}>Reject Template</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ──────────────────────────────── */}
      {deleteConfirm && (
        <div className="tpl-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="tpl-modal tpl-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="tpl-modal-header">
              <h3>Delete Template</h3>
              <button className="tpl-modal-close" onClick={() => setDeleteConfirm(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="tpl-modal-body">
              <p className="tpl-delete-msg">Are you sure you want to delete <strong>{allTemplates.find((t) => t.id === deleteConfirm)?.name}</strong>? This action cannot be undone.</p>
            </div>
            <div className="tpl-modal-footer">
              <button className="tpl-modal-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="tpl-modal-delete" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
