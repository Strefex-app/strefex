import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { isSupabaseConfigured, platformDirectoryContactsService } from '../services/supabaseService'
import { downloadCsv, exportExcel, exportPdf } from '../utils/platformDirectoryExport'

const EMPTY_FORM = {
  segment: 'Plastic',
  company_name: '',
  country: 'Russia',
  contact_name: '',
  position: '',
  email: '',
  phone: '',
  website: '',
  source_ref: '',
}

function trimOrNull(v) {
  const t = String(v ?? '').trim()
  return t === '' ? null : t
}

function buildPayload(form) {
  return {
    segment: String(form.segment || '').trim() || 'Plastic',
    company_name: String(form.company_name || '').trim(),
    country: trimOrNull(form.country) || 'Russia',
    contact_name: trimOrNull(form.contact_name),
    position: trimOrNull(form.position),
    email: trimOrNull(form.email)?.toLowerCase() ?? null,
    phone: trimOrNull(form.phone),
    website: trimOrNull(form.website),
    source_ref: trimOrNull(form.source_ref),
    metadata: {},
  }
}

export default function PlatformDirectoryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [segment, setSegment] = useState('all')
  const [query, setQuery] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [exportBusy, setExportBusy] = useState('')

  const loadRows = useCallback(async (opts = { showSpinner: true }) => {
    if (!isSupabaseConfigured) {
      setRows([])
      setError(
        'Supabase is not configured. Directory contacts are stored in the database (migration 017) and are not shipped in the app bundle.',
      )
      setLoading(false)
      return
    }
    if (opts.showSpinner) setLoading(true)
    setError('')
    try {
      const data = await platformDirectoryContactsService.list(null, {
        orderBy: 'company_name',
        ascending: true,
      })
      setRows(Array.isArray(data) ? data : [])
      if (!data?.length) {
        setError(
          'No directory rows returned. If this is a new environment, run migration 017_platform_directory_contacts.sql on Supabase.',
        )
      }
    } catch (err) {
      setRows([])
      setError(err?.message || 'Failed to load platform directory.')
    } finally {
      if (opts.showSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRows({ showSpinner: true })
  }, [loadRows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (segment !== 'all' && String(r.segment) !== segment) return false
      if (!q) return true
      const hay = [
        r.company_name,
        r.country,
        r.contact_name,
        r.position,
        r.email,
        r.phone,
        r.website,
        r.source_ref,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [rows, segment, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const s = String(a.segment || '').localeCompare(String(b.segment || ''))
      if (s !== 0) return s
      return String(a.company_name || '').localeCompare(String(b.company_name || ''), undefined, {
        sensitivity: 'base',
      })
    })
  }, [filtered])

  const canEdit = isSupabaseConfigured

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFeedback('')
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      segment: row.segment || 'Plastic',
      company_name: row.company_name || '',
      country: row.country || 'Russia',
      contact_name: row.contact_name || '',
      position: row.position || '',
      email: row.email || '',
      phone: row.phone || '',
      website: row.website || '',
      source_ref: row.source_ref || '',
    })
    setFeedback('')
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingId(null)
  }

  const onSubmitForm = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    const payload = buildPayload(form)
    if (!payload.company_name) {
      setFeedback('Company name is required.')
      return
    }
    setSaving(true)
    setFeedback('')
    try {
      if (editingId) {
        const updateBody = { ...payload }
        delete updateBody.metadata
        await platformDirectoryContactsService.update(editingId, {
          ...updateBody,
          updated_at: new Date().toISOString(),
        })
      } else {
        await platformDirectoryContactsService.create(payload)
      }
      await loadRows({ showSpinner: false })
      setModalOpen(false)
      setEditingId(null)
    } catch (err) {
      setFeedback(err?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (row) => {
    if (!canEdit || !row.id) return
    if (!window.confirm(`Delete contact “${row.contact_name || row.company_name}” at ${row.company_name}?`)) return
    setError('')
    try {
      await platformDirectoryContactsService.remove(row.id)
      await loadRows({ showSpinner: false })
    } catch (err) {
      setError(err?.message || 'Delete failed.')
    }
  }

  const runExport = async (kind) => {
    if (sorted.length === 0) return
    setExportBusy(kind)
    try {
      if (kind === 'csv') downloadCsv('buyer-directory-contacts.csv', sorted)
      else if (kind === 'excel') await exportExcel('buyer-directory-contacts.xlsx', sorted)
      else if (kind === 'pdf') await exportPdf(sorted, 'Buyer directory')
    } catch (err) {
      setError(err?.message || `Export ${kind} failed.`)
    } finally {
      setExportBusy('')
    }
  }

  const inputStyle = { padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', width: '100%' }
  const labelStyle = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }

  return (
    <AppLayout>
      <div className="app-page" style={{ maxWidth: 1280, margin: '0 auto' }}>
        <button type="button" className="app-page-back-link" onClick={() => navigate('/dashboard/buyer')}>
          ← Back to Buyer Workspace
        </button>

        <div className="app-page-card">
          <h2 className="app-page-title">Buyer directory</h2>
          <p className="app-page-subtitle">
            Imported B2B contacts (plastic & stamping company lists), available from the buyer area.{' '}
            <strong>Visible only to superadmin.</strong> Confidential — do not share outside STREFEX operations.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
            <span className="app-page-chip">Rows: {sorted.length}</span>
            {canEdit && (
              <button type="button" className="app-page-btn-primary" onClick={openAdd}>
                Add contact
              </button>
            )}
            <button
              type="button"
              className="app-page-btn-outline"
              disabled={sorted.length === 0 || !!exportBusy}
              onClick={() => runExport('csv')}
            >
              {exportBusy === 'csv' ? 'Exporting…' : 'Export CSV'}
            </button>
            <button
              type="button"
              className="app-page-btn-outline"
              disabled={sorted.length === 0 || !!exportBusy}
              onClick={() => runExport('excel')}
            >
              {exportBusy === 'excel' ? 'Exporting…' : 'Export Excel'}
            </button>
            <button
              type="button"
              className="app-page-btn-outline"
              disabled={sorted.length === 0 || !!exportBusy}
              onClick={() => runExport('pdf')}
            >
              {exportBusy === 'pdf' ? 'Exporting…' : 'Export PDF'}
            </button>
          </div>
          {error && (
            <p style={{ color: '#b42318', marginTop: 12, fontSize: 14 }} role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="app-page-card">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16,
              alignItems: 'center',
            }}
          >
            <label style={labelStyle}>
              Segment
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value)}
                style={{ ...inputStyle, minWidth: 160, width: 'auto' }}
              >
                <option value="all">All</option>
                <option value="Plastic">Plastic</option>
                <option value="Stamping">Stamping</option>
              </select>
            </label>
            <label style={{ ...labelStyle, flex: '1 1 240px' }}>
              Search
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Company, contact, email, phone…"
                style={inputStyle}
              />
            </label>
          </div>

          {loading ? (
            <p className="app-page-subtitle">Loading directory…</p>
          ) : sorted.length === 0 ? (
            <p className="app-page-subtitle">No contacts match the current filters.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px 6px' }}>Segment</th>
                    <th style={{ padding: '8px 6px' }}>Company</th>
                    <th style={{ padding: '8px 6px' }}>Country</th>
                    <th style={{ padding: '8px 6px' }}>Contact</th>
                    <th style={{ padding: '8px 6px' }}>Role</th>
                    <th style={{ padding: '8px 6px' }}>Email</th>
                    <th style={{ padding: '8px 6px' }}>Phone</th>
                    <th style={{ padding: '8px 6px' }}>Web</th>
                    <th style={{ padding: '8px 6px' }}>Source</th>
                    {canEdit && <th style={{ padding: '8px 6px' }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id || `${r.segment}-${r.company_name}-${r.email}-${r.contact_name}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{r.segment}</td>
                      <td style={{ padding: '8px 6px', maxWidth: 200 }}>{r.company_name}</td>
                      <td style={{ padding: '8px 6px' }}>{r.country}</td>
                      <td style={{ padding: '8px 6px', maxWidth: 180 }}>{r.contact_name}</td>
                      <td style={{ padding: '8px 6px', maxWidth: 160 }}>{r.position}</td>
                      <td style={{ padding: '8px 6px', wordBreak: 'break-all', maxWidth: 200 }}>
                        {r.email ? (
                          <a href={`mailto:${r.email}`}>{r.email}</a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>{r.phone || '—'}</td>
                      <td style={{ padding: '8px 6px', wordBreak: 'break-all', maxWidth: 140 }}>
                        {r.website ? (
                          <a href={/^https?:\/\//i.test(r.website) ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer">
                            {r.website}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '8px 6px', fontSize: 11, color: '#6b7280' }}>{r.source_ref || '—'}</td>
                      {canEdit && (
                        <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                          <button type="button" className="app-page-btn-outline" style={{ marginRight: 6, padding: '4px 10px', fontSize: 12 }} onClick={() => openEdit(r)}>
                            Edit
                          </button>
                          <button type="button" className="app-page-btn-outline" style={{ padding: '4px 10px', fontSize: 12, color: '#b42318', borderColor: '#fecdca' }} onClick={() => onDelete(r)}>
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="buyer-dir-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="app-page-card"
            style={{ maxWidth: 520, width: '100%', maxHeight: '90vh', overflowY: 'auto', margin: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="buyer-dir-modal-title" className="app-page-title" style={{ fontSize: 20 }}>
              {editingId ? 'Edit contact' : 'Add contact'}
            </h3>
            <form onSubmit={onSubmitForm}>
              <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                <label style={labelStyle}>
                  Segment *
                  <select value={form.segment} onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))} style={inputStyle} required>
                    <option value="Plastic">Plastic</option>
                    <option value="Stamping">Stamping</option>
                  </select>
                </label>
                <label style={labelStyle}>
                  Company name *
                  <input value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} style={inputStyle} required />
                </label>
                <label style={labelStyle}>
                  Country
                  <input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Contact name
                  <input value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Role / position
                  <input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Email
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Phone
                  <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Website
                  <input value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Source reference
                  <input value={form.source_ref} onChange={(e) => setForm((f) => ({ ...f, source_ref: e.target.value }))} style={inputStyle} placeholder="e.g. Company list (Plastic).pdf" />
                </label>
              </div>
              {feedback && (
                <p style={{ marginTop: 12, color: '#b42318', fontSize: 14 }} role="alert">
                  {feedback}
                </p>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                <button type="submit" className="app-page-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add contact'}
                </button>
                <button type="button" className="app-page-btn-outline" onClick={closeModal} disabled={saving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
