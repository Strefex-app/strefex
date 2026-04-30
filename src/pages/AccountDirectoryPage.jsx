import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import AppLayout from '../components/AppLayout'
import {
  isSupabaseConfigured,
  accountDirectoryEntriesService,
} from '../services/supabaseService'
import { fetchCompaniesListPaged, fetchGlobalCrudListPaged } from '../services/pagedDirectoryFetch'
import { extractDirectoryFromPlatform } from '../services/accountDirectoryService'
import industrialIntelligenceService from '../services/industrialIntelligenceService'
import { useAuthStore } from '../store/authStore'
import '../styles/app-page.css'
import './SellerDashboard.css'
import './VendorManagement.css'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import './AccountDirectoryPage.css'

const INDUSTRY_HUB_OPTIONS = [
  { id: '', label: '— Industry hub —' },
  { id: 'automotive', label: 'Automotive' },
  { id: 'machinery', label: 'Machinery' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'medical', label: 'Medical' },
  { id: 'raw-materials', label: 'Raw materials' },
  { id: 'oil-gas', label: 'Oil & gas' },
  { id: 'green-energy', label: 'Green energy' },
  { id: 'household-products', label: 'Household products' },
]

const ENTRY_TYPES = [
  { value: 'contact', label: 'Contact' },
  { value: 'customer', label: 'Customer' },
  { value: 'equipment_supplier', label: 'Equipment supplier' },
  { value: 'other', label: 'Other' },
]

const REGISTRY_SOURCE_FILTER = [
  { value: 'all', label: 'All origins' },
  { value: 'web_signup', label: 'Web signup' },
  { value: 'spreadsheet_import', label: 'Imported' },
  { value: 'platform_extract', label: 'Platform extract' },
  { value: 'manual', label: 'Manual' },
]

function formatDirectoryRegistrySource(v) {
  if (v === 'web_signup') return 'Web signup'
  if (v === 'spreadsheet_import') return 'Imported'
  if (v === 'platform_extract') return 'Extract'
  if (v === 'manual') return 'Manual'
  return v ? String(v) : '—'
}

const EMPTY_FORM = {
  entry_type: 'contact',
  company_name: '',
  contact_name: '',
  position: '',
  email: '',
  phone: '',
  website: '',
  country: '',
  industry_hub_id: '',
  industry_label: '',
  category_id: '',
  source_ref: '',
  visible_in_exec_summary_superadmin: false,
}

function trimOrNull(v) {
  const t = String(v ?? '').trim()
  return t === '' ? null : t
}

function getStoredCompanyId() {
  try {
    const raw = JSON.parse(localStorage.getItem('strefex-auth') || '{}')
    return raw?.user?.companyId || raw?.tenant?.id || null
  } catch {
    return null
  }
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function pickCell(row, keys) {
  const map = {}
  Object.keys(row).forEach((k) => {
    map[normalizeHeader(k)] = row[k]
  })
  for (const key of keys) {
    const v = map[normalizeHeader(key)]
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

function parseSpreadsheetRows(jsonRows) {
  return (jsonRows || []).map((row) => {
    const company_name =
      pickCell(row, ['company', 'company name', 'organization', 'supplier', 'customer', 'name']) ||
      pickCell(row, ['company_name'])
    const email = pickCell(row, ['email', 'e-mail', 'mail'])
    return {
      company_name,
      contact_name: pickCell(row, ['contact', 'contact name', 'person', 'full name']),
      position: pickCell(row, ['position', 'title', 'role']),
      email,
      phone: pickCell(row, ['phone', 'tel', 'mobile']),
      website: pickCell(row, ['website', 'url', 'web']),
      country: pickCell(row, ['country', 'nation']),
      industry_label: pickCell(row, ['industry', 'sector']),
      source_ref: pickCell(row, ['source', 'source_ref', 'notes']),
    }
  })
}

const IMPORT_CHUNK_SIZE = 80

export default function AccountDirectoryPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const authUser = useAuthStore((s) => s.user)
  const authTenant = useAuthStore((s) => s.tenant)
  const myCompanyId = useMemo(() => {
    const fromUser = authUser?.companyId || authUser?.company_id
    const fromTenant = authTenant?.id
    return fromUser || fromTenant || getStoredCompanyId()
  }, [authUser, authTenant])

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [companies, setCompanies] = useState([])
  const [filterCompanyId, setFilterCompanyId] = useState('')
  const [rfqIssuerCompanyId, setRfqIssuerCompanyId] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [extractBusy, setExtractBusy] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [importTargetCompanyId, setImportTargetCompanyId] = useState('')
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [rfqOpen, setRfqOpen] = useState(false)
  const [rfqTitle, setRfqTitle] = useState('')
  const [rfqDescription, setRfqDescription] = useState('')
  const [rfqDeadline, setRfqDeadline] = useState('')
  const [rfqBusy, setRfqBusy] = useState(false)

  const listCompanyId = useMemo(() => {
    if (isSuperAdmin && filterCompanyId) return filterCompanyId
    return myCompanyId
  }, [isSuperAdmin, filterCompanyId, myCompanyId])

  const loadCompanies = useCallback(async () => {
    if (!isSuperAdmin || !isSupabaseConfigured) return
    try {
      const data = await fetchCompaniesListPaged({ pageSize: 2500, maxRows: 25000 })
      const list = Array.isArray(data) ? data : []
      setCompanies(list)
      setImportTargetCompanyId((prev) => prev || myCompanyId || list[0]?.id || '')
      setRfqIssuerCompanyId((prev) => prev || myCompanyId || list[0]?.id || '')
    } catch {
      setCompanies([])
    }
  }, [isSuperAdmin, myCompanyId])

  const loadRows = useCallback(
    async (opts = { showSpinner: true }) => {
      if (!isSupabaseConfigured) {
        setRows([])
        setError('Supabase is not configured.')
        setLoading(false)
        return
      }
      if (opts.showSpinner) setLoading(true)
      setError('')
      try {
        let data
        if (isSuperAdmin && !filterCompanyId) {
          data = await fetchGlobalCrudListPaged(accountDirectoryEntriesService, {
            orderBy: 'company_name',
            ascending: true,
          })
        } else if (listCompanyId) {
          data = await accountDirectoryEntriesService.list(listCompanyId, {
            orderBy: 'updated_at',
            ascending: false,
          })
        } else {
          data = []
        }
        setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        setRows([])
        setError(err?.message || 'Failed to load directory.')
      } finally {
        if (opts.showSpinner) setLoading(false)
      }
    },
    [isSuperAdmin, filterCompanyId, listCompanyId],
  )

  useEffect(() => {
    void loadCompanies()
  }, [loadCompanies])

  useEffect(() => {
    void loadRows({ showSpinner: true })
  }, [loadRows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (typeFilter !== 'all' && r.entry_type !== typeFilter) return false
      if (sourceFilter !== 'all' && (r.registry_source || 'manual') !== sourceFilter) return false
      if (!q) return true
      const hay = [
        r.company_name,
        r.contact_name,
        r.email,
        r.country,
        r.source_ref,
        r.registry_source,
        r.metadata?.source_company_id,
        r.metadata?.source_buyer_id,
        r.metadata?.source_supplier_id,
      ]
        .map((x) => String(x || '').toLowerCase())
        .join(' ')
      return hay.includes(q)
    })
  }, [rows, query, typeFilter, sourceFilter])

  const companyNameById = useMemo(() => {
    const m = new Map()
    companies.forEach((c) => m.set(c.id, c.name || c.id))
    return m
  }, [companies])

  const openCreate = () => {
    if (isSuperAdmin && !filterCompanyId) {
      setFeedback('Select a company in “Scope company” before adding a new row.')
      return
    }
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      visible_in_exec_summary_superadmin: isSuperAdmin,
    })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditingId(row.id)
    setForm({
      entry_type: row.entry_type || 'contact',
      company_name: row.company_name || '',
      contact_name: row.contact_name || '',
      position: row.position || '',
      email: row.email || '',
      phone: row.phone || '',
      website: row.website || '',
      country: row.country || '',
      industry_hub_id: row.industry_hub_id || '',
      industry_label: row.industry_label || '',
      category_id: row.category_id || '',
      source_ref: row.source_ref || '',
      visible_in_exec_summary_superadmin: Boolean(row.visible_in_exec_summary_superadmin),
    })
    setModalOpen(true)
  }

  const saveRow = async (e) => {
    e.preventDefault()
    let company_id
    if (editingId) {
      const prev = rows.find((r) => r.id === editingId)
      company_id = prev?.company_id
    } else if (isSuperAdmin) {
      company_id = filterCompanyId || null
    } else {
      company_id = myCompanyId
    }
    if (!company_id) {
      setFeedback('Missing company: pick scope company (superadmin) or ensure your profile has company_id.')
      return
    }
    setSaving(true)
    setFeedback('')
    try {
      const prev = editingId ? rows.find((row) => row.id === editingId) : null
      const payload = {
        company_id,
        entry_type: form.entry_type || 'contact',
        company_name: String(form.company_name || '').trim(),
        contact_name: trimOrNull(form.contact_name),
        position: trimOrNull(form.position),
        email: trimOrNull(form.email)?.toLowerCase() ?? null,
        phone: trimOrNull(form.phone),
        website: trimOrNull(form.website),
        country: trimOrNull(form.country),
        industry_hub_id: trimOrNull(form.industry_hub_id),
        industry_label: trimOrNull(form.industry_label),
        category_id: trimOrNull(form.category_id),
        source_ref: trimOrNull(form.source_ref),
        visible_in_exec_summary_superadmin: Boolean(form.visible_in_exec_summary_superadmin),
        registry_source: editingId ? (prev?.registry_source || 'manual') : 'manual',
        metadata: {},
      }
      if (!payload.company_name) throw new Error('Company name is required.')
      if (editingId) {
        await accountDirectoryEntriesService.update(editingId, payload)
        setFeedback('Updated.')
      } else {
        await accountDirectoryEntriesService.create(payload)
        setFeedback('Added.')
      }
      setModalOpen(false)
      await loadRows({ showSpinner: false })
    } catch (err) {
      setFeedback(err?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const runExtract = async () => {
    setExtractBusy(true)
    setFeedback('')
    try {
      const res = await extractDirectoryFromPlatform()
      setFeedback(
        `Extract complete: +${res?.inserted_customers ?? 0} customers, +${res?.inserted_equipment_suppliers ?? 0} equipment suppliers.`,
      )
      await loadRows({ showSpinner: false })
    } catch (err) {
      setFeedback(err?.message || 'Extract failed (superadmin only).')
    } finally {
      setExtractBusy(false)
    }
  }

  const onPickSpreadsheet = async (e) => {
    const file = e.target?.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportBusy(true)
    setFeedback('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const parsed = parseSpreadsheetRows(json).filter((r) => r.company_name || r.email)
      if (parsed.length === 0) throw new Error('No recognizable rows (need Company / Email columns).')

      const target =
        importTargetCompanyId ||
        (!isSuperAdmin ? myCompanyId : '') ||
        (isSuperAdmin && companies[0]?.id) ||
        ''
      if (!target) throw new Error('Select target company for import.')

      const toInsert = []
      for (const r of parsed) {
        if (!r.company_name && !r.email) continue
        toInsert.push({
          company_id: target,
          entry_type: 'contact',
          company_name: r.company_name || r.email || 'Unknown',
          contact_name: trimOrNull(r.contact_name),
          position: trimOrNull(r.position),
          email: trimOrNull(r.email)?.toLowerCase() ?? null,
          phone: trimOrNull(r.phone),
          website: trimOrNull(r.website),
          country: trimOrNull(r.country),
          industry_hub_id: null,
          industry_label: trimOrNull(r.industry_label),
          source_ref: trimOrNull(r.source_ref) || `import:${file.name}`,
          visible_in_exec_summary_superadmin: isSuperAdmin,
          registry_source: 'spreadsheet_import',
          metadata: { import_file: file.name },
        })
      }
      let n = 0
      for (let i = 0; i < toInsert.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + IMPORT_CHUNK_SIZE)
        await accountDirectoryEntriesService.createMany(chunk)
        n += chunk.length
      }
      setFeedback(`Imported ${n} rows into company ${companyNameById.get(target) || target}.`)
      await loadRows({ showSpinner: false })
    } catch (err) {
      setFeedback(err?.message || 'Import failed.')
    } finally {
      setImportBusy(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sendRfq = async (e) => {
    e.preventDefault()
    if (!isSuperAdmin) return
    const issuer = rfqIssuerCompanyId || myCompanyId
    if (!issuer) {
      setFeedback('Choose issuing company for the RFQ.')
      return
    }
    const picked = filtered.filter((r) => selectedIds.has(r.id))
    setRfqBusy(true)
    setFeedback('')
    try {
      await industrialIntelligenceService.createRfqFromDirectorySelection({
        buyerCompanyId: issuer,
        title: rfqTitle,
        description: rfqDescription,
        deadline: rfqDeadline || null,
        directoryEntries: picked,
        requirements: {},
        skipCompletenessCheck: true,
      })
      setFeedback(`RFQ sent to ${picked.length} contacts (stubs created on issuing company).`)
      setRfqOpen(false)
      setRfqTitle('')
      setRfqDescription('')
      setRfqDeadline('')
      setSelectedIds(new Set())
    } catch (err) {
      setFeedback(err?.message || 'RFQ failed.')
    } finally {
      setRfqBusy(false)
    }
  }

  return (
    <AppLayout>
      <div className="sd-page ad-directory-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate('/hub/procurement')}>
          ← Back
        </button>

        <div className="sd-header">
          <div>
            <h1 className="sd-title">Account directory</h1>
            <p className="sd-subtitle">
              Each organization sees only its own entries. Superadmin sees every account. Web registrations sync into
              this table automatically (origin: Web signup); spreadsheet rows are tagged as Imported. Extract and manual
              entries are labeled separately. Import{' '}
              <strong>Company list (2025) for platform.xlsx</strong> after choosing the target company.
            </p>
          </div>
          {isSuperAdmin ? (
            <span
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                background: 'rgba(198,40,40,.08)',
                color: '#c62828',
                fontSize: 12,
                fontWeight: 600,
                alignSelf: 'flex-start',
              }}
            >
              SUPERADMIN VIEW
            </span>
          ) : null}
        </div>

        <div className="sd-kpis">
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="sd-kpi-body">
              <span className="sd-kpi-value">{rows.length}</span>
              <span className="sd-kpi-label">Loaded entries</span>
            </div>
          </div>
          <div className="sd-kpi-card">
            <div className="sd-kpi-icon green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="sd-kpi-body">
              <span className="sd-kpi-value">{filtered.length}</span>
              <span className="sd-kpi-label">Matching filters</span>
            </div>
          </div>
          {isSuperAdmin ? (
            <div className="sd-kpi-card">
              <div className="sd-kpi-icon orange">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M9 11l3 3L22 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="sd-kpi-body">
                <span className="sd-kpi-value">{selectedIds.size}</span>
                <span className="sd-kpi-label">Selected for RFQ</span>
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="app-page-alert app-page-alert--error" role="alert">
            {error}
          </div>
        ) : null}
        {feedback ? (
          <div className="app-page-alert app-page-alert--success" role="status">
            {feedback}
          </div>
        ) : null}

        <div className="sd-card" style={{ marginBottom: 20 }}>
          <div className="sd-card-header">
            <h2 className="sd-card-title">Search &amp; actions</h2>
            <button type="button" className="sd-link-btn" onClick={() => navigate('/hub/procurement')}>
              Buyers hub →
            </button>
          </div>

          <div className="sd-form-grid">
            {isSuperAdmin ? (
              <div className="sd-form-group">
                <label>Scope company</label>
                <select value={filterCompanyId} onChange={(e) => setFilterCompanyId(e.target.value)}>
                  <option value="">All accounts</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="sd-form-group">
              <label>Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All</option>
                {ENTRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sd-form-group">
              <label>Origin</label>
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                {REGISTRY_SOURCE_FILTER.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sd-form-group sd-form-full">
              <label>Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, email, source…"
                aria-label="Search directory"
              />
            </div>
          </div>

          <div className="sd-form-actions" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <button type="button" className="sd-btn sd-btn-primary" onClick={openCreate}>
              Add entry
            </button>
            {isSuperAdmin ? (
              <button
                type="button"
                className="sd-btn sd-btn-outline"
                disabled={extractBusy}
                onClick={() => void runExtract()}
              >
                {extractBusy ? 'Extracting…' : 'Extract customers & suppliers'}
              </button>
            ) : null}
            {isSuperAdmin ? (
              <div className="sd-form-group" style={{ margin: 0, minWidth: 200 }}>
                <label>Import into company</label>
                <select value={importTargetCompanyId} onChange={(e) => setImportTargetCompanyId(e.target.value)}>
                  <option value="">— Select —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(ev) => void onPickSpreadsheet(ev)} />
            <button
              type="button"
              className="sd-btn sd-btn-outline"
              disabled={importBusy || (isSuperAdmin ? false : !myCompanyId)}
              onClick={() => fileInputRef.current?.click()}
            >
              {importBusy ? 'Importing…' : 'Import XLSX / CSV'}
            </button>
            {isSuperAdmin ? (
              <button type="button" className="sd-btn sd-btn-outline" onClick={() => setRfqOpen(true)}>
                RFQ to selected ({selectedIds.size})
              </button>
            ) : null}
          </div>
        </div>

        <div className="sd-card">
          <div className="sd-card-header">
            <h2 className="sd-card-title">Entries</h2>
            {!loading ? <span className="ad-card-header-meta">{filtered.length} shown</span> : null}
          </div>
          {loading ? (
            <div className="sd-empty">Loading directory…</div>
          ) : filtered.length === 0 ? (
            <div className="sd-empty">No directory entries match the current filters.</div>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    {isSuperAdmin ? <th style={{ width: 36 }} /> : null}
                    {isSuperAdmin && !filterCompanyId ? <th>Account</th> : null}
                    <th>Type</th>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Industry</th>
                    <th>Exec (SA)</th>
                    <th>Origin</th>
                    <th>Source</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      {isSuperAdmin ? (
                        <td>
                          <ToggleCheckButton
                            compact
                            checked={selectedIds.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                            aria-label={`Select row ${r.company_name || r.id}`}
                          />
                        </td>
                      ) : null}
                      {isSuperAdmin && !filterCompanyId ? (
                        <td>{companyNameById.get(r.company_id) || r.company_id}</td>
                      ) : null}
                      <td>{r.entry_type}</td>
                      <td>{r.company_name}</td>
                      <td>
                        {r.contact_name}
                        {r.position ? <span className="ad-muted"> — {r.position}</span> : null}
                      </td>
                      <td>{r.email || '—'}</td>
                      <td>{r.industry_hub_id || r.industry_label || '—'}</td>
                      <td>{r.visible_in_exec_summary_superadmin ? 'Yes' : '—'}</td>
                      <td>
                        <span className="ad-muted">{formatDirectoryRegistrySource(r.registry_source)}</span>
                      </td>
                      <td>
                        <span className="ad-muted" title={JSON.stringify(r.metadata || {})}>
                          {r.source_ref || r.metadata?.source_company_id || '—'}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="sd-link-btn" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {rfqOpen && isSuperAdmin ? (
          <div className="vm-modal-overlay" role="presentation" onClick={() => setRfqOpen(false)}>
            <div className="vm-modal" role="dialog" onClick={(ev) => ev.stopPropagation()}>
              <h2 className="vm-modal-title">Send RFQ (superadmin)</h2>
              <p className="vm-modal-desc">
                Creates vendor + supplier stubs on the issuing company for each selected email, then sends the RFQ.
              </p>
              <label className="vm-field">
                Issuing company
                <select value={rfqIssuerCompanyId} onChange={(e) => setRfqIssuerCompanyId(e.target.value)}>
                  <option value="">— Select —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.id}
                    </option>
                  ))}
                </select>
              </label>
              <form onSubmit={(ev) => void sendRfq(ev)} style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <label className="vm-field">
                  RFQ title *
                  <input value={rfqTitle} onChange={(e) => setRfqTitle(e.target.value)} placeholder="Title" required />
                </label>
                <label className="vm-field">
                  Description
                  <textarea value={rfqDescription} onChange={(e) => setRfqDescription(e.target.value)} rows={3} />
                </label>
                <label className="vm-field">
                  Deadline
                  <input type="date" value={rfqDeadline} onChange={(e) => setRfqDeadline(e.target.value)} />
                </label>
                <p className="ad-muted" style={{ margin: 0 }}>
                  Selected rows: {selectedIds.size}
                </p>
                <div className="sd-form-actions">
                  <button type="submit" className="sd-btn sd-btn-primary" disabled={rfqBusy || selectedIds.size === 0}>
                    {rfqBusy ? 'Sending…' : 'Send RFQ'}
                  </button>
                  <button type="button" className="sd-btn sd-btn-outline" onClick={() => setRfqOpen(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {modalOpen ? (
          <div className="vm-modal-overlay" role="presentation" onClick={() => setModalOpen(false)}>
            <div className="vm-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
              <h2 className="vm-modal-title">{editingId ? 'Edit entry' : 'New entry'}</h2>
              <form onSubmit={(e) => void saveRow(e)} style={{ display: 'grid', gap: 10 }}>
                <label className="vm-field">
                  Type
                  <select value={form.entry_type} onChange={(e) => setForm({ ...form, entry_type: e.target.value })}>
                    {ENTRY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="vm-field">
                  Company name *
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                    placeholder="Company"
                    required
                  />
                </label>
                <label className="vm-field">
                  Contact name
                  <input
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                    placeholder="Contact"
                  />
                </label>
                <label className="vm-field">
                  Position
                  <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Role" />
                </label>
                <label className="vm-field">
                  Email
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    type="email"
                    placeholder="email@…"
                  />
                </label>
                <label className="vm-field">
                  Phone
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" />
                </label>
                <label className="vm-field">
                  Website
                  <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="URL" />
                </label>
                <label className="vm-field">
                  Country
                  <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" />
                </label>
                <label className="vm-field">
                  Industry hub (for superadmin rollups)
                  <select
                    value={form.industry_hub_id}
                    onChange={(e) => setForm({ ...form, industry_hub_id: e.target.value })}
                  >
                    {INDUSTRY_HUB_OPTIONS.map((o) => (
                      <option key={o.id || 'x'} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="vm-field">
                  Industry label
                  <input
                    value={form.industry_label}
                    onChange={(e) => setForm({ ...form, industry_label: e.target.value })}
                    placeholder="Free text"
                  />
                </label>
                <label className="vm-field">
                  Category id
                  <input
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    placeholder="Optional"
                  />
                </label>
                <label className="vm-field">
                  Source reference
                  <input
                    value={form.source_ref}
                    onChange={(e) => setForm({ ...form, source_ref: e.target.value })}
                    placeholder="e.g. import batch"
                  />
                </label>
                {isSuperAdmin ? (
                  <ToggleCheckButton
                    checked={form.visible_in_exec_summary_superadmin}
                    onChange={(v) => setForm({ ...form, visible_in_exec_summary_superadmin: v })}
                  >
                    Visible in superadmin executive-summary rollups
                  </ToggleCheckButton>
                ) : null}
                <div className="sd-form-actions">
                  <button type="submit" className="sd-btn sd-btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" className="sd-btn sd-btn-outline" onClick={() => setModalOpen(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
