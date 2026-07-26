import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { isSupabaseConfigured, platformDirectoryContactsService } from '../services/supabaseService'
import { fetchGlobalCrudListPaged } from '../services/pagedDirectoryFetch'
import { downloadCsv, exportExcel, exportPdf } from '../utils/platformDirectoryExport'
import { buildRfqOrQuoteMailto } from '../utils/directoryRfqMailto'
import '../styles/app-page.css'
import './PlatformDirectoryPage.css'

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
    registry_source: 'manual',
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
      const data = await fetchGlobalCrudListPaged(platformDirectoryContactsService, {
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

  const segmentChoices = useMemo(() => {
    const set = new Set()
    rows.forEach((r) => {
      if (r.segment) set.add(String(r.segment))
    })
    ;['Plastic', 'Stamping'].forEach((s) => set.add(s))
    return ['all', ...[...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))]
  }, [rows])

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
        const prev = rows.find((x) => x.id === editingId)
        const updateBody = { ...payload }
        delete updateBody.metadata
        const registry_source =
          prev?.registry_source === 'spreadsheet_import' || prev?.registry_source === 'web_signup'
            ? prev.registry_source
            : updateBody.registry_source
        await platformDirectoryContactsService.update(editingId, {
          ...updateBody,
          registry_source,
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

  return (
    <AppLayout>
      <div className="app-page buyer-directory-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate('/profile')}>
          ← Contact list
        </button>

        <div className="app-page-card">
          <h2 className="app-page-title">Buyer directory</h2>
          <p className="app-page-subtitle">
            B2B contacts: legacy Plastic &amp; Stamping PDFs, company lists, and{' '}
            <strong>new web signups</strong> (synced automatically). <strong>Superadmin only.</strong> Confidential.
          </p>
          <div className="app-page-toolbar">
            <span className="app-page-chip">Rows: {sorted.length}</span>
            <div className="app-page-toolbar-actions">
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
          </div>
          {error && (
            <p className="app-page-alert app-page-alert--error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="app-page-card">
          <h3 className="buyer-dir-section-heading">Directory</h3>
          <div className="buyer-dir-filters">
            <div className="buyer-dir-field">
              <span className="buyer-dir-label">Segment</span>
              <select value={segment} onChange={(e) => setSegment(e.target.value)} aria-label="Filter by segment">
                {segmentChoices.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All segments' : s}
                  </option>
                ))}
              </select>
            </div>
            <div className="buyer-dir-field buyer-dir-field--grow">
              <span className="buyer-dir-label">Search</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Company, contact, email, phone…"
                aria-label="Search directory"
              />
            </div>
          </div>

          {loading ? (
            <p className="app-page-subtitle buyer-dir-loading-msg">Loading directory…</p>
          ) : sorted.length === 0 ? (
            <div className="app-page-list-empty">No contacts match the current filters.</div>
          ) : (
            <div className="buyer-dir-table-wrap">
              <table className={`buyer-dir-table ${canEdit ? '' : 'buyer-dir-table--no-actions'}`}>
                <colgroup>
                  <col className="buyer-dir-col--seg" />
                  <col className="buyer-dir-col--co" />
                  <col className="buyer-dir-col--cty" />
                  <col className="buyer-dir-col--contact" />
                  <col className="buyer-dir-col--role" />
                  <col className="buyer-dir-col--email" />
                  <col className="buyer-dir-col--phone" />
                  <col className="buyer-dir-col--web" />
                  <col className="buyer-dir-col--src" />
                  <col className="buyer-dir-col--rfq" />
                  {canEdit && <col className="buyer-dir-col--act" />}
                </colgroup>
                <thead>
                  <tr>
                    <th>Segment</th>
                    <th>Company</th>
                    <th>Country</th>
                    <th>Contact</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Web</th>
                    <th>Source</th>
                    <th>RFQ / quote</th>
                    {canEdit && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => {
                    const rfqHref = buildRfqOrQuoteMailto(r)
                    const webHref = r.website && /^https?:\/\//i.test(r.website) ? r.website : r.website ? `https://${r.website}` : ''
                    return (
                      <tr key={r.id || `${r.segment}-${r.company_name}-${r.email}-${r.contact_name}`}>
                        <td className="buyer-dir-cell--nowrap">
                          <span className="buyer-dir-td-clip" title={r.segment || ''}>
                            {r.segment || '—'}
                          </span>
                        </td>
                        <td title={r.company_name || ''}>
                          <span className="buyer-dir-td-clip">{r.company_name || '—'}</span>
                        </td>
                        <td title={r.country || ''}>
                          <span className="buyer-dir-td-clip">{r.country || '—'}</span>
                        </td>
                        <td title={r.contact_name || ''}>
                          <span className="buyer-dir-td-clip">{r.contact_name || '—'}</span>
                        </td>
                        <td title={r.position || ''}>
                          <span className="buyer-dir-td-clip">{r.position || '—'}</span>
                        </td>
                        <td title={r.email || ''}>
                          {r.email ? (
                            <a className="buyer-dir-td-clip" href={`mailto:${r.email}`}>
                              {r.email}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="buyer-dir-cell--nowrap" title={r.phone || ''}>
                          <span className="buyer-dir-td-clip">{r.phone || '—'}</span>
                        </td>
                        <td title={r.website || ''}>
                          {r.website ? (
                            <a className="buyer-dir-td-clip" href={webHref} target="_blank" rel="noreferrer">
                              {r.website}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="buyer-dir-cell--muted" title={r.source_ref || ''}>
                          <span className="buyer-dir-td-clip">{r.source_ref || '—'}</span>
                        </td>
                        <td className="buyer-dir-cell-rfq">
                          {rfqHref ? (
                            <a className="buyer-dir-rfq-btn" href={rfqHref} title="Send RFQ or quote by email">
                              Send RFQ or quote
                            </a>
                          ) : (
                            <span className="buyer-dir-rfq-muted">—</span>
                          )}
                        </td>
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
                    )
                  })}
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
          aria-labelledby="buyer-dir-modal-title"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="app-page-card buyer-dir-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="buyer-dir-modal-title" className="app-page-title">
              {editingId ? 'Edit contact' : 'Add contact'}
            </h3>
            <p className="app-page-subtitle buyer-dir-modal-hint">Fields marked * are required.</p>
            <form onSubmit={onSubmitForm}>
              <div className="buyer-dir-form-grid">
                <div className="buyer-dir-field">
                  <label htmlFor="bd-segment">Segment *</label>
                  <input
                    id="bd-segment"
                    list="bd-segment-suggestions"
                    value={form.segment}
                    onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
                    placeholder="e.g. Plastic, Stamping, Tool maker"
                    required
                  />
                  <datalist id="bd-segment-suggestions">
                    <option value="Plastic" />
                    <option value="Stamping" />
                    <option value="Tool maker" />
                    <option value="CF maker" />
                    <option value="Carmaker" />
                    <option value="Engineering" />
                    <option value="Materials" />
                    <option value="Paint & Coating" />
                    <option value="Company list (2025)" />
                  </datalist>
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="bd-company">Company name *</label>
                  <input
                    id="bd-company"
                    value={form.company_name}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="bd-country">Country</label>
                  <input id="bd-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="bd-contact">Contact name</label>
                  <input id="bd-contact" value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="bd-position">Role / position</label>
                  <input id="bd-position" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="bd-email">Email</label>
                  <input id="bd-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="bd-phone">Phone</label>
                  <input id="bd-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="bd-web">Website</label>
                  <input id="bd-web" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="bd-source">Source reference</label>
                  <input
                    id="bd-source"
                    value={form.source_ref}
                    onChange={(e) => setForm((f) => ({ ...f, source_ref: e.target.value }))}
                    placeholder="e.g. Company list (Plastic).pdf"
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
