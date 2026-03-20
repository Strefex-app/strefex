import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import AppLayout from '../components/AppLayout'
import { isSupabaseConfigured, platformRegisteredSuppliersService } from '../services/supabaseService'
import { downloadCsv, exportExcel, exportPdf } from '../utils/registeredSuppliersExport'
import { parseRegisteredSuppliersCsv, mapRowToPayload } from '../utils/registeredSuppliersCsv'
import { parseDirectorySpreadsheetRows } from '../utils/directorySpreadsheetImport'
import { buildRfqOrQuoteMailto } from '../utils/directoryRfqMailto'
import '../styles/app-page.css'
import './PlatformDirectoryPage.css'

const SEGMENT_OPTIONS = ['Plastic', 'Stamping', 'Equipment', 'Company list (2025)', 'International', 'Other']

const EMPTY_FORM = {
  segment: 'Company list (2025)',
  company_name: '',
  industry: '',
  country: 'Russia',
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
  let segment = 'Company list (2025)'
  if (form.segment === 'Other') {
    segment = String(form.segment_custom || '').trim() || 'Company list (2025)'
  } else {
    segment = String(form.segment || '').trim() || 'Company list (2025)'
  }
  return {
    segment,
    company_name: String(form.company_name || '').trim(),
    industry: trimOrNull(form.industry),
    country: trimOrNull(form.country) || 'Russia',
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
  const [segment, setSegment] = useState('all')
  const [query, setQuery] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, segment_custom: '' }))
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [exportBusy, setExportBusy] = useState('')

  const segmentChoices = useMemo(() => {
    const fromData = new Set()
    rows.forEach((r) => {
      if (r.segment) fromData.add(String(r.segment))
    })
    SEGMENT_OPTIONS.filter((s) => s !== 'Other').forEach((s) => fromData.add(s))
    return ['all', ...[...fromData].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))]
  }, [rows])

  const loadRows = useCallback(async (opts = { showSpinner: true }) => {
    if (!isSupabaseConfigured) {
      setRows([])
      setError(
        'Supabase is not configured. Run migrations 018 and 020 on Supabase and set VITE_SUPABASE_* in your environment.',
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
      if (!data?.length) {
        setError(
          'No rows yet. After migration 020, Plastic/Stamping buyer-directory contacts are mirrored here. Import your Excel (XLSX) or CSV — same columns as buyer directory.',
        )
      }
    } catch (err) {
      setRows([])
      setError(err?.message || 'Failed to load supplier directory.')
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
      if (segment !== 'all' && String(r.segment || '') !== segment) return false
      if (!q) return true
      const hay = [
        r.segment,
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
  }, [rows, segment, query])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const s = String(a.segment || '').localeCompare(String(b.segment || ''))
      if (s !== 0) return s
      const ai = a.row_index != null ? Number(a.row_index) : 999999
      const bi = b.row_index != null ? Number(b.row_index) : 999999
      if (ai !== bi) return ai - bi
      return String(a.company_name || '').localeCompare(String(b.company_name || ''), undefined, { sensitivity: 'base' })
    })
  }, [filtered])

  const canEdit = isSupabaseConfigured

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, segment_custom: '' })
    setFeedback('')
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    const seg = row.segment || 'Company list (2025)'
    const known = SEGMENT_OPTIONS.filter((o) => o !== 'Other')
    const useSelect = known.includes(seg)
    setForm({
      segment: useSelect ? seg : 'Other',
      segment_custom: useSelect ? '' : seg,
      company_name: row.company_name || '',
      industry: row.industry || '',
      country: row.country || 'Russia',
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
    if (!window.confirm(`Remove “${row.company_name}” from the directory?`)) return
    setError('')
    setInfo('')
    try {
      await platformRegisteredSuppliersService.remove(row.id)
      await loadRows({ showSpinner: false })
    } catch (err) {
      setError(err?.message || 'Delete failed.')
    }
  }

  const onPickFile = () => fileInputRef.current?.click()

  const insertPayloads = async (payloads) => {
    let inserted = 0
    for (const payload of payloads) {
      try {
        await platformRegisteredSuppliersService.create(payload)
        inserted += 1
      } catch {
        /* duplicate / RLS */
      }
    }
    return inserted
  }

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canEdit) return
    setImporting(true)
    setError('')
    setInfo('')
    try {
      const name = String(file.name || '').toLowerCase()
      let payloads = []

      if (name.endsWith('.csv')) {
        const text = await file.text()
        const { ok, skipped } = parseRegisteredSuppliersCsv(text, `csv:${file.name}`)
        payloads = ok
        const inserted = await insertPayloads(payloads)
        await loadRows({ showSpinner: false })
        setInfo(`Imported ${inserted} row(s).${skipped ? ` Skipped ${skipped} empty/invalid line(s).` : ''}`)
        return
      }

      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const parsed = parseDirectorySpreadsheetRows(json, {
        defaultSegment: 'Company list (2025)',
        defaultCountry: 'Russia',
        defaultSourceRef: `xlsx:${file.name}`,
      })
      for (const r of parsed) {
        if (!r.company_name && !r.email) continue
        const o = {
          segment: r.segment,
          company_name: r.company_name || r.email || 'Unknown',
          industry: r.industry,
          country: r.country || 'Russia',
          contact_name: r.contact_name,
          position: r.position,
          email: r.email,
          phone: r.phone,
          website: r.website,
          row_index: r.row_index,
          source_ref: r.source_ref,
        }
        const payload = mapRowToPayload(o, `xlsx:${file.name}`)
        if (payload) payloads.push(payload)
      }
      const inserted = await insertPayloads(payloads)
      await loadRows({ showSpinner: false })
      setInfo(`Imported ${inserted} row(s) from ${file.name}.`)
    } catch (err) {
      setError(err?.message || 'Import failed.')
    } finally {
      setImporting(false)
    }
  }

  const runExport = async (kind) => {
    if (sorted.length === 0) return
    setExportBusy(kind)
    try {
      if (kind === 'csv') downloadCsv('supplier-directory.csv', sorted)
      else if (kind === 'excel') await exportExcel('supplier-directory.xlsx', sorted)
      else if (kind === 'pdf') await exportPdf(sorted, 'Supplier directory')
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
        accept=".csv,.xlsx,.xls,text/csv"
        style={{ display: 'none' }}
        onChange={(ev) => void onFileSelected(ev)}
      />

      <div className="app-page buyer-directory-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate('/dashboard/buyer')}>
          ← Back to Buyer Workspace
        </button>

        <div className="app-page-card">
          <h2 className="app-page-title">Supplier directory</h2>
          <p className="app-page-subtitle">
            Same layout and columns as the <strong>buyer directory</strong> (segment, company, country, contacts).{' '}
            <strong>Superadmin only.</strong> Plastic &amp; Stamping rows from the buyer directory are mirrored here after
            migration <strong>020</strong>. Import your <strong>Company list (2025) for platform.xlsx</strong> via XLSX/CSV
            — headers: Segment (optional), Company name, Country, Contact, Position, Email, Phone, Website, Industry.
          </p>
          <div className="app-page-toolbar">
            <span className="app-page-chip">Rows: {sorted.length}</span>
            <div className="app-page-toolbar-actions">
              {canEdit && (
                <>
                  <button type="button" className="app-page-btn-primary" onClick={openAdd}>
                    Add contact
                  </button>
                  <button type="button" className="app-page-btn-outline" disabled={importing} onClick={onPickFile}>
                    {importing ? 'Importing…' : 'Import XLSX / CSV'}
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
          </div>
          {info && <p className="app-page-alert app-page-alert--success">{info}</p>}
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
                    {s === 'all' ? 'All' : s}
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
            <div className="app-page-list-empty">
              {rows.length === 0
                ? 'No contacts yet. Run migration 020, then import XLSX/CSV or wait for mirror from buyer directory.'
                : 'No contacts match the current filters.'}
            </div>
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
          aria-labelledby="rs-modal-title"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="app-page-card buyer-dir-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="rs-modal-title" className="app-page-title">
              {editingId ? 'Edit contact' : 'Add contact'}
            </h3>
            <p className="app-page-subtitle buyer-dir-modal-hint">Company name is required.</p>
            <form onSubmit={onSubmitForm}>
              <div className="buyer-dir-form-grid">
                <div className="buyer-dir-field">
                  <label htmlFor="rs-segment">Segment *</label>
                  <select
                    id="rs-segment"
                    value={form.segment}
                    onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))}
                    required
                  >
                    {SEGMENT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                {form.segment === 'Other' && (
                  <div className="buyer-dir-field">
                    <label htmlFor="rs-segment-custom">Custom segment *</label>
                    <input
                      id="rs-segment-custom"
                      value={form.segment_custom || ''}
                      onChange={(e) => setForm((f) => ({ ...f, segment_custom: e.target.value }))}
                      placeholder="e.g. Forging"
                      required
                    />
                  </div>
                )}
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
                  <label htmlFor="rs-country">Country</label>
                  <input id="rs-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-contact">Contact name</label>
                  <input id="rs-contact" value={form.contact_name} onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-position">Role / position</label>
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
                  <label htmlFor="rs-industry">Industry (optional detail)</label>
                  <input
                    id="rs-industry"
                    value={form.industry}
                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    placeholder="e.g. Tool maker — not shown as main column"
                  />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-idx">Row # (optional)</label>
                  <input
                    id="rs-idx"
                    inputMode="numeric"
                    value={form.row_index}
                    onChange={(e) => setForm((f) => ({ ...f, row_index: e.target.value }))}
                  />
                </div>
                <div className="buyer-dir-field">
                  <label htmlFor="rs-source">Source reference</label>
                  <input
                    id="rs-source"
                    value={form.source_ref}
                    onChange={(e) => setForm((f) => ({ ...f, source_ref: e.target.value }))}
                    placeholder="e.g. Company list (2025) for platform.xlsx"
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
