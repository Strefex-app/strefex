import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../i18n/useTranslation'
import AppLayout from '../components/AppLayout'
import './HRDocumentation.css'

const CATEGORIES = [
  'Employment Contracts',
  'Company Policies',
  'Job Descriptions',
  'Safety Documents',
  'Training Certificates',
  'Performance Records',
  'Disciplinary Records',
  'Leave & Absence',
]

const STATUS_COLORS = {
  Active: 'active',
  Expired: 'expired',
  Draft: 'draft',
  Archived: 'archived',
}

const FILE_ICONS = {
  pdf: { label: 'PDF', color: '#e74c3c' },
  docx: { label: 'DOCX', color: '#2980b9' },
  xlsx: { label: 'XLSX', color: '#27ae60' },
  default: { label: 'FILE', color: '#7f8c8d' },
}

const getFileType = (name = '') => {
  const ext = (name.split('.').pop() || '').toLowerCase()
  return FILE_ICONS[ext] || FILE_ICONS.default
}

const initialDocuments = [
  { id: '1', name: 'Employment Contract - Martin Weber', category: 'Employment Contracts', employee: 'Martin Weber', dateCreated: '2024-01-15', status: 'Active', expiryDate: '2026-01-14', fileType: 'pdf' },
  { id: '2', name: 'Employment Contract - Sarah Klein', category: 'Employment Contracts', employee: 'Sarah Klein', dateCreated: '2024-03-20', status: 'Active', expiryDate: '2026-03-19', fileType: 'pdf' },
  { id: '3', name: 'NDA Template', category: 'Company Policies', employee: null, dateCreated: '2023-11-01', status: 'Active', expiryDate: null, fileType: 'docx' },
  { id: '4', name: 'Safety Policy v3.2', category: 'Company Policies', employee: null, dateCreated: '2025-01-10', status: 'Active', expiryDate: null, fileType: 'pdf' },
  { id: '5', name: 'Fire Safety Training - All', category: 'Training Certificates', employee: 'All Staff', dateCreated: '2023-06-01', status: 'Expired', expiryDate: '2024-05-31', fileType: 'pdf' },
  { id: '6', name: 'Job Description - CNC Operator', category: 'Job Descriptions', employee: null, dateCreated: '2024-08-12', status: 'Active', expiryDate: null, fileType: 'docx' },
  { id: '7', name: 'Performance Review Template', category: 'Performance Records', employee: null, dateCreated: '2025-02-01', status: 'Draft', expiryDate: null, fileType: 'docx' },
  { id: '8', name: 'Annual Leave Policy 2026', category: 'Leave & Absence', employee: null, dateCreated: '2025-12-01', status: 'Active', expiryDate: null, fileType: 'pdf' },
  { id: '9', name: 'First Aid Certificate - J. Mueller', category: 'Training Certificates', employee: 'J. Mueller', dateCreated: '2024-09-15', status: 'Active', expiryDate: '2025-09-14', fileType: 'pdf' },
  { id: '10', name: 'Written Warning - T. Schmidt', category: 'Disciplinary Records', employee: 'T. Schmidt', dateCreated: '2024-11-20', status: 'Archived', expiryDate: null, fileType: 'pdf' },
  { id: '11', name: 'Code of Conduct', category: 'Company Policies', employee: null, dateCreated: '2022-05-01', status: 'Active', expiryDate: null, fileType: 'pdf' },
  { id: '12', name: 'Job Description - Quality Inspector', category: 'Job Descriptions', employee: null, dateCreated: '2024-10-05', status: 'Active', expiryDate: null, fileType: 'docx' },
]

const HRDocumentation = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [documents, setDocuments] = useState(initialDocuments)
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showUploadModal, setShowUploadModal] = useState(false)
  const fileInputRef = useRef(null)

  const [uploadForm, setUploadForm] = useState({
    name: '',
    category: CATEGORIES[0],
    employee: '',
    expiryDate: '',
    file: null,
  })

  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = doc.category === activeCategory
    const matchesSearch =
      !searchQuery ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.employee && doc.employee.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = documents.filter((d) => d.category === cat).length
    return acc
  }, {})

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const in30 = new Date()
    in30.setDate(in30.getDate() + 30)
    return expiry <= in30 && expiry >= new Date()
  }

  const isExpired = (expiryDate) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)))
    }
  }

  const bulkArchive = () => {
    setDocuments((prev) =>
      prev.map((d) => (selectedIds.has(d.id) ? { ...d, status: 'Archived' } : d))
    )
    setSelectedIds(new Set())
  }

  const bulkDelete = () => {
    if (!window.confirm('Delete selected documents?')) return
    setDocuments((prev) => prev.filter((d) => !selectedIds.has(d.id)))
    setSelectedIds(new Set())
  }

  const handleUploadSubmit = (e) => {
    e.preventDefault()
    if (!uploadForm.name.trim()) return
    const newDoc = {
      id: String(Date.now()),
      name: uploadForm.name,
      category: uploadForm.category,
      employee: uploadForm.employee || null,
      dateCreated: new Date().toISOString().slice(0, 10),
      status: 'Active',
      expiryDate: uploadForm.expiryDate || null,
      fileType: (uploadForm.file?.name?.split('.').pop() || 'pdf').toLowerCase(),
    }
    setDocuments((prev) => [...prev, newDoc])
    setUploadForm({ name: '', category: CATEGORIES[0], employee: '', expiryDate: '', file: null })
    setShowUploadModal(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const setDocStatus = (id, status) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)))
  }

  return (
    <AppLayout>
      <div className="hrdoc-page">
        <div className="hrdoc-header">
          <a
            className="hrdoc-back-link"
            href="/production/headcount"
            onClick={(e) => {
              e.preventDefault()
              navigate('/production/headcount')
            }}
          >
            ← Back to Headcount
          </a>
          <h1 className="hrdoc-title">HR Documentation</h1>
          <p className="hrdoc-subtitle">
            Manage employment contracts, policies, and HR documents
          </p>
        </div>

        <div className="hrdoc-tabs-wrap">
          <div className="hrdoc-tabs" role="tablist">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                className={`hrdoc-tab ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <span className="hrdoc-tab-label">{cat}</span>
                <span className="hrdoc-tab-count">{categoryCounts[cat] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="hrdoc-card">
          <div className="hrdoc-toolbar">
            <div className="hrdoc-search-wrap">
              <input
                type="search"
                className="hrdoc-search"
                placeholder="Search by name or employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="hrdoc-toolbar-actions">
              {selectedIds.size > 0 && (
                <>
                  <button type="button" className="hrdoc-bulk-btn archive" onClick={bulkArchive}>
                    Archive ({selectedIds.size})
                  </button>
                  <button type="button" className="hrdoc-bulk-btn delete" onClick={bulkDelete}>
                    Delete ({selectedIds.size})
                  </button>
                </>
              )}
              <button
                type="button"
                className="hrdoc-upload-btn"
                onClick={() => setShowUploadModal(true)}
              >
                Upload Document
              </button>
            </div>
          </div>

          <div className="hrdoc-table-wrap">
            <table className="hrdoc-table">
              <thead>
                <tr>
                  <th className="hrdoc-th-check">
                    <input
                      type="checkbox"
                      checked={
                        filteredDocuments.length > 0 &&
                        selectedIds.size === filteredDocuments.length
                      }
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>Document</th>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th className="hrdoc-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => {
                  const fileInfo = getFileType(doc.name)
                  const expiringSoon = isExpiringSoon(doc.expiryDate)
                  const expired = isExpired(doc.expiryDate)
                  return (
                    <tr
                      key={doc.id}
                      className={
                        (expiringSoon && doc.status === 'Active' ? 'hrdoc-row-warning ' : '') +
                        (selectedIds.has(doc.id) ? 'hrdoc-row-selected' : '')
                      }
                    >
                      <td className="hrdoc-td-check">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(doc.id)}
                          onChange={() => toggleSelect(doc.id)}
                          aria-label={`Select ${doc.name}`}
                        />
                      </td>
                      <td>
                        <span className="hrdoc-doc-name">{doc.name}</span>
                        {expiringSoon && doc.status === 'Active' && (
                          <span className="hrdoc-expiry-warning">Expires soon</span>
                        )}
                        {expired && doc.status === 'Active' && (
                          <span className="hrdoc-expiry-warning expired">Expired</span>
                        )}
                      </td>
                      <td className="hrdoc-employee">{doc.employee || '—'}</td>
                      <td className="hrdoc-date">{doc.dateCreated}</td>
                      <td>
                        <span
                          className={`hrdoc-status-badge ${STATUS_COLORS[doc.status] || 'active'}`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td>
                        <span
                          className="hrdoc-file-type"
                          style={{ '--file-color': fileInfo.color }}
                          title={fileInfo.label}
                        >
                          {fileInfo.label}
                        </span>
                      </td>
                      <td className="hrdoc-td-actions">
                        <button type="button" className="hrdoc-action-btn" title="View">
                          View
                        </button>
                        <button type="button" className="hrdoc-action-btn" title="Download">
                          Download
                        </button>
                        <button type="button" className="hrdoc-action-btn" title="Edit">
                          Edit
                        </button>
                        <button
                          type="button"
                          className="hrdoc-action-btn archive"
                          title="Archive"
                          onClick={() => setDocStatus(doc.id, 'Archived')}
                        >
                          Archive
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredDocuments.length === 0 && (
            <div className="hrdoc-empty">No documents in this category.</div>
          )}
        </div>

        {showUploadModal && (
          <div
            className="hrdoc-modal-overlay"
            onClick={() => setShowUploadModal(false)}
            onKeyDown={(e) => e.key === 'Escape' && setShowUploadModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hrdoc-upload-title"
          >
            <div
              className="hrdoc-upload-form-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="hrdoc-upload-form-header">
                <h2 id="hrdoc-upload-title">Upload Document</h2>
                <button
                  type="button"
                  className="hrdoc-modal-close"
                  onClick={() => setShowUploadModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form className="hrdoc-upload-form" onSubmit={handleUploadSubmit}>
                <div className="hrdoc-form-group">
                  <label htmlFor="hrdoc-name">Document name</label>
                  <input
                    id="hrdoc-name"
                    type="text"
                    value={uploadForm.name}
                    onChange={(e) =>
                      setUploadForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Employment Contract - John Doe"
                    required
                  />
                </div>
                <div className="hrdoc-form-group">
                  <label htmlFor="hrdoc-category">Category</label>
                  <select
                    id="hrdoc-category"
                    value={uploadForm.category}
                    onChange={(e) =>
                      setUploadForm((f) => ({ ...f, category: e.target.value }))
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hrdoc-form-group">
                  <label htmlFor="hrdoc-employee">Employee (optional)</label>
                  <input
                    id="hrdoc-employee"
                    type="text"
                    value={uploadForm.employee}
                    onChange={(e) =>
                      setUploadForm((f) => ({ ...f, employee: e.target.value }))
                    }
                    placeholder="Assign to employee"
                  />
                </div>
                <div className="hrdoc-form-group">
                  <label htmlFor="hrdoc-expiry">Expiry date (optional)</label>
                  <input
                    id="hrdoc-expiry"
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={(e) =>
                      setUploadForm((f) => ({ ...f, expiryDate: e.target.value }))
                    }
                  />
                </div>
                <div className="hrdoc-form-group">
                  <label htmlFor="hrdoc-file">File</label>
                  <input
                    id="hrdoc-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) =>
                      setUploadForm((f) => ({ ...f, file: e.target.files?.[0] ?? null }))
                    }
                  />
                </div>
                <div className="hrdoc-form-actions">
                  <button type="button" className="hrdoc-btn secondary" onClick={() => setShowUploadModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="hrdoc-btn primary">
                    Upload
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default HRDocumentation
