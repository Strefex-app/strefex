import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { isSupabaseConfigured, platformRegisteredSuppliersService } from '../services/supabaseService'
import { downloadCsv, exportExcel, exportPdf } from '../utils/registeredSuppliersExport'
import { parseRegisteredSuppliersCsv } from '../utils/registeredSuppliersCsv'
import '../styles/app-page.css'
import './PlatformDirectoryPage.css'

const EMPTY_FORM = {
  company_name: '',
  industry: '',
  country: 'China',
  contact_name: '',
  position: '',
  email: '',
  phone: '',
  website: '',
  row_index: '',
  source_ref: '',
}

function trimOrNull(v) {
  const t = String(v ?? '').trim()
  return t === '' ? null : t
}

function buildPayload(form) {
  const ri = String(form.row_index || '').trim()
  const row_index = ri === '' ? null : parseInt(ri, 10)
  return {
    company_name: String(form.company_name || '').trim(),
    industry: trimOrNull(form.industry),
    country: trimOrNull(form.country) || 'China',
    contact_name: trimOrNull(form.contact_name),
    position: trimOrNull(form.position),
    email: trimOrNull(form.email)?.toLowerCase() ?? null,
    phone: trimOrNull(form.phone),
    website: trimOrNull(form.website),
    row_index: Number.isFinite(row_index) ? row_index : null,
    source_ref: trimOrNull(form.source_ref),
    metadata: {},
  }
}

export default function RegisteredSuppliersPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [industryFilter, setIndustryFilter] = useState('')
  const [query, setQuery] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [exportBusy, setExportBusy] = useState('')

  const loadRows = useCallback(async (opts = { showSpinner: true }) => {
    if (!isSupabaseConfigured) {
      setRows([])
      setError(
        'Supabase is not configured. Run migration 018_platform_registered_suppliers.sql and set VITE_SUPABASE_* in your environment.',
      )
      setLoading(false)
      return
    }
    if (opts.showSpinner) setLoading(true)
    setError('')
    try {
      const data = await platformRegisteredSuppliersService.list(null, {
        orderBy: 'company_name',
        ascending: true,
      })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setRows([])
      setError(err?.message || 'Failed to load registered suppliers.')
    } finally {
      if (opts.showSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRows({ showSpinner: true })
  }, [loadRows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const ind = industryFilter.trim().toLowerCase()
    return rows.filter((r) => {
      if (ind && !String(r.industry || '').toLowerCase().includes(ind)) return false
      if (!q) return true
      const hay = [
        r.company_name,
        r.industry,
        r.country,
        r.contact_name,
        r.position,
        r.email,
        r.phone,
        r.website,
        r.source_ref,
        r.row_index != null ? String(r.row_index) : '',
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [rows, industryFilter, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const ai = a.row_index != null ? Number(a.row_index) : 999999
      const bi = b.row_index != null ? Number(b.row_index) : 999999
      if (ai !== bi) return ai - bi
      return String(a.company_name || '').localeCompare(String(b.company_name || ''), undefined, { sensitivity: 'base' })
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
      company_name: row.company_name || '',
      industry: row.industry || '',
      country: row.country || 'China',
      contact_name: row.contact_name || '',
      position: row.position || '',
      email: row.email || '',
      phone: row.phone || '',
      website: row.website || '',
      row_index: row.row_index != null ? String(row.row_index) : '',
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
        await platformRegisteredSuppliersService.update(editingId, {
          ...updateBody,
          updated_at: new Date().toISOString(),
        })
      } else {
        await platformRegisteredSuppliersService.create(payload)
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
    if (!window.confirm(`Remove “${row.company_name}” from the registry?`)) return
    setError('')
    setInfo('')
    try {
      await platformRegisteredSuppliersService.remove(row.id)
      await loadRows({ showSpinner: false })
    } catch (err) {
      setError(err?.message || 'Delete failed.')
    }
  }

  const onPickCsv = () => fileInputRef.current?.click()

  const onCsvSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canEdit) return
    setImporting(true)
    setError('')
    setInfo('')
    try {
      const text = await file.text()
      const { ok, skipped } = parseRegisteredSuppliersCsv(text, `csv:${file.name}`)
      let inserted = 0
      for (const payload of ok) {
        try {
          await platformRegisteredSuppliersService.create(payload)
          inserted += 1
        } catch {
          /* duplicate or RLS — skip */
        }
      }
      await loadRows({ showSpinner: false })
      setInfo(`Imported ${inserted} row(s).${skipped ? ` Skipped ${skipped} empty/invalid line(s).` : ''}`)
    } catch (err) {
      setError(err?.message || 'CSV import failed.')
    } finally {
      setImporting(false)
    }
  }

  const runExport = async (kind) => {
    if (sorted.length === 0) return
    setExportBusy(kind)
    try {
      if (kind === 'csv') downloadCsv('registered-suppliers.csv', sorted)
      else if (kind === 'excel') await exportExcel('registered-suppliers.xlsx', sorted)
      else if (kind === 'pdf') await exportPdf(sorted, 'Registered suppliers')
    } catch (err) {
      setError(err?.message || `Export ${kind} failed.`)
    } finally {
      setExportBusy('')
    }
  }

  return (
    <AppLayout>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: 'none' }}
        onChange={onCsvSelected}
      />

      <div className="app-page buyer-directory-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate('/dashboard/buyer')}>
          ← Back to Buyer Workspace
        </button>

        <div className="app-page-card">
          <h2 className="app-page-title">Registered suppliers</h2>
          <p className="app-page-subtitle">
            Internal registry of supplier contacts (e.g. tooling / equipment lists).{' '}
            <strong>Superadmin only</strong> — not visible to buyers, suppliers, or other roles. Promote entries to platform
            vendors separately when ready.
          </p>
          <p className="app-page-body" style={{ marginBottom: 12, fontSize: 13 }}>
            CSV headers supported: <code>#</code>, Company name (or Company namy), industry, country, contact person, position,
            email, phone, website.
          </p>
          <div className="app-page-toolbar">
            <span className="app-page-chip">Rows: {sorted.length}</span>
            {canEdit && (
              <>
                <button type="button" className="app-page-btn-primary" onClick={openAdd}>
                  Add supplier
                </button>
                <button type="button" className="app-page-btn-outline" disabled={importing} onClick={onPickCsv}>
                  {importing ? 'Importing…' : 'Import CSV'}
                </button>
              </>
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
          {info && <p className="app-page-alert app-page-alert--success">{info}</p>}
          {error && (
            <p className="app-page-alert app-page-alert--error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="buyer-dir-section-heading">Registry</h3>
          <div className="buyer-dir-filters">
            <div className="buyer-dir-field buyer-dir-field--grow">
              <span className="buyer-dir-label">Industry contains</span>
              <input
                type="text"
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                placeholder="e.g. Tool maker, CNC"
                aria-label="Filter by industry"
              />
            </div>
            <div className="buyer-dir-field buyer-dir-field--grow">
              <span className="buyer-dir-label">Search</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Company, contact, email, country…"
                aria-label="Search registry"
              />
            </div>
          </div>

          {loading ? (
            <p className="app-page-subtitle buyer-dir-loading-msg">Loading registry…</p>
          ) : sorted.length === 0 ? (
            <div className="app-page-list-empty">
              {rows.length === 0
                ? 'No suppliers registered yet. Import your spreadsheet as CSV or add rows manually.'
                : 'No rows match the current filters.'}
            </div>
          ) : (
            <div className="buyer-dir-table-wrap">
              <table className="buyer-dir-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Company</th>
                    <th>Industry</th>
                    <th>Country</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Web</th>
                    <th>Source</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.id || `${r.company_name}-${r.email}-${r.row_index}`}>
                      <td className="buyer-dir-cell--muted buyer-dir-cell--nowrap">{r.row_index != null ? r.row_index : '—'}</td>
                      <td style={{ maxWidth: 200 }}>{r.company_name}</td>
                      <td style={{ maxWidth: 120 }}>{r.industry || '—'}</td>
                      <td className="buyer-dir-cell--nowrap">{r.country}</td>
                      <td style={{ maxWidth: 160 }}>{r.contact_name}</td>
                      <td style={{ maxWidth: 140 }}>{r.position}</td>
                      <td style={{ wordBreak: 'break-word', maxWidth: 200 }}>
                        {r.email ? (
                          <a href={`mailto:${r.email}`}>{r.email}</a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ maxWidth: 160, fontSize: 12 }}>{r.phone || '—'}</td>
                      <td style={{ wordBreak: 'break-word', maxWidth: 140 }}>
                        {r.website ? (
                          <a href={/^https?:\/\//i.test(r.website) ? r.website : `https://${r.website}`} target="_blank" rel="noreferrer">
                            {r.website}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="buyer-dir-cell--muted">{r.source_ref || '—'}</td>
                      {canEdit && (
                        <td>
                          <div className="buyer-dir-actions">
                            <button type="button" className="app-page-btn-outline app-page-btn-sm" onClick={() => openEdit(r)}>
                              Edit
                            </button>
                            <button type="button" className="app-page-btn-danger app-page-btn-sm" onClick={() => onDelete(r)}>
                              Delete
                            </button>
                          </div>
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
          className="buyer-dir-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rs-modal-title"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="app-page-card buyer-dir-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="rs-modal-title" className="app-page-title">
              {editingId ? 'Edit supplier' : 'Add supplier'}
            </h3>
            <p className="app-page-subtitle buyer-dir-modal-hint">Company name is required.</p>
            <form onSubmit={onSubmitForm}>
              <div className="buyer-dir-form-grid">
                <div className="buyer-dir-field">
                  <label htmlFor="rs-company">Company name *</label>
                  <input
                    id="rs-company"
                    value={form.company_name}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-industry">Industry</label>
                  <input
                    id="rs-industry"
                    value={form.industry}
                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    placeholder="e.g. Tool maker, CNC"
                  />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-country">Country</label>
                  <input id="rs-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-contact">Contact name</label>
                  <input id="rs-contact" value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-position">Position</label>
                  <input id="rs-position" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-email">Email</label>
                  <input id="rs-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-phone">Phone</label>
                  <input id="rs-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-web">Website</label>
                  <input id="rs-web" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-idx">Row # (optional)</label>
                  <input
                    id="rs-idx"
                    inputMode="numeric"
                    value={form.row_index}
                    onChange={(e) => setForm((f) => ({ ...f, row_index: e.target.value }))}
                    placeholder="e.g. 1"
                  />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-source">Source reference</label>
                  <input
                    id="rs-source"
                    value={form.source_ref}
                    onChange={(e) => setForm((f) => ({ ...f, source_ref: e.target.value }))}
                    placeholder="e.g. tooling list 2025"
                  />
                </div>
              </div>
              {feedback && (
                <p className="app-page-alert app-page-alert--error" role="alert">
                  {feedback}
                </p>
              )}
              <div className="app-page-btn-row">
                <button type="submit" className="app-page-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add supplier'}
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
