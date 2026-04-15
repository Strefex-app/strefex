import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { isSupabaseConfigured, companiesService, profilesService, companyProfileAttachmentsService } from '../services/supabaseService'
import {
  evaluateCompanyProfileDirectory,
  buildCompanyVisibilityUpdate,
} from '../services/companyProfileVisibilityService'
import {
  PROFILE_ATTACHMENT_SLOT_LABELS,
  VISIBILITY_TIER_LABELS,
} from '../constants/companyProfileDirectory'
import '../styles/app-page.css'
import './SuperAdminAccountDetailPage.css'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function SuperAdminAccountDetailPage() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [auditStatus, setAuditStatus] = useState('none')
  const [auditNotes, setAuditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [openPath, setOpenPath] = useState('')

  const validId = useMemo(() => Boolean(companyId && UUID_RE.test(companyId)), [companyId])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !validId) {
      setLoading(false)
      setError(!isSupabaseConfigured ? 'Supabase is not configured.' : 'Invalid company id.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const [c, plist] = await Promise.all([
        companiesService.getById(companyId),
        profilesService.listForCompany(companyId),
      ])
      setCompany(c)
      setProfiles(Array.isArray(plist) ? plist : [])
      setAuditStatus(c?.external_audit_status || 'none')
      setAuditNotes(c?.external_audit_notes || '')
    } catch (e) {
      setCompany(null)
      setProfiles([])
      setError(e?.message || 'Failed to load company.')
    } finally {
      setLoading(false)
    }
  }, [companyId, validId])

  useEffect(() => {
    void load()
  }, [load])

  const snapshot = useMemo(() => (company ? evaluateCompanyProfileDirectory(company) : null), [company])

  const openAttachment = async (path) => {
    if (!path || !isSupabaseConfigured) return
    setOpenPath(path)
    try {
      const url = await companyProfileAttachmentsService.getSignedUrl(path, 3600)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      /* silent */
    } finally {
      setOpenPath('')
    }
  }

  const saveAudit = async () => {
    if (!company || !validId) return
    setSaving(true)
    setError('')
    try {
      const next = {
        ...company,
        external_audit_status: auditStatus,
        external_audit_notes: auditNotes.trim() || null,
      }
      if (auditStatus === 'passed') {
        next.external_audit_passed_at = company.external_audit_passed_at || new Date().toISOString()
      } else {
        next.external_audit_passed_at = null
      }
      const vis = buildCompanyVisibilityUpdate(next)
      const updated = await companiesService.update(companyId, {
        external_audit_status: auditStatus,
        external_audit_notes: auditNotes.trim() || null,
        external_audit_passed_at: next.external_audit_passed_at,
        visibility_tier: vis.visibility_tier,
        metadata: vis.metadata,
      })
      setCompany(updated)
      setAuditStatus(updated?.external_audit_status || 'none')
      setAuditNotes(updated?.external_audit_notes || '')
    } catch (e) {
      setError(e?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const attachments = Array.isArray(company?.profile_attachments) ? company.profile_attachments : []

  return (
    <AppLayout>
      <div className="saad-page">
        <div className="saad-toolbar">
          <button type="button" className="saad-back" onClick={() => navigate('/admin-dashboard')}>
            ← Back to dashboard
          </button>
        </div>

        {loading && <p className="saad-muted">Loading…</p>}
        {error && <div className="saad-error" role="alert">{error}</div>}

        {!loading && company && (
          <>
            <header className="saad-header">
              <div>
                <h1 className="saad-title">{company.name || 'Company'}</h1>
                <p className="saad-sub">
                  <span className="saad-code">{company.registration_code || '—'}</span>
                  {' · '}
                  <span>{VISIBILITY_TIER_LABELS[company.visibility_tier] || company.visibility_tier}</span>
                  {company.account_type && (
                    <>
                      {' · '}
                      <span className="saad-type">{company.account_type}</span>
                    </>
                  )}
                </p>
              </div>
            </header>

            <div className="saad-grid">
              <section className="saad-card">
                <h2>Company record</h2>
                <dl className="saad-dl">
                  <dt>Registration #</dt><dd>{company.registration_code || '—'}</dd>
                  <dt>Email</dt><dd>{company.email || '—'}</dd>
                  <dt>Phone</dt><dd>{company.phone || '—'}</dd>
                  <dt>Website</dt><dd>{company.website || '—'}</dd>
                  <dt>Country / City</dt><dd>{[company.country, company.city].filter(Boolean).join(', ') || '—'}</dd>
                  <dt>Address</dt><dd>{company.address || company.metadata?.address || '—'}</dd>
                  <dt>Plan</dt><dd>{company.plan || '—'}</dd>
                  <dt>Visibility tier</dt><dd>{company.visibility_tier} — {VISIBILITY_TIER_LABELS[company.visibility_tier]}</dd>
                </dl>
              </section>

              <section className="saad-card">
                <h2>Profile directory (computed)</h2>
                {snapshot && (
                  <>
                    <h3 className="saad-h3">Mandatory</h3>
                    <ul className="saad-checklist">
                      {Object.entries(snapshot.mandatory).map(([k, ok]) => (
                        <li key={k} className={ok ? 'ok' : 'no'}>{k.replace(/_/g, ' ')} — {ok ? 'Yes' : 'No'}</li>
                      ))}
                    </ul>
                    <h3 className="saad-h3">Extra (premium RFQ)</h3>
                    <ul className="saad-checklist">
                      {Object.entries(snapshot.extra).map(([k, ok]) => (
                        <li key={k} className={ok ? 'ok' : 'no'}>{k.replace(/_/g, ' ')} — {ok ? 'Yes' : 'No'}</li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className="saad-card">
                <h2>Attachments</h2>
                {attachments.length === 0 && <p className="saad-muted">No files.</p>}
                <ul className="saad-files">
                  {attachments.map((a) => (
                    <li key={a.id || a.path}>
                      <span className="saad-fname">{a.name || a.path}</span>
                      <span className="saad-fslot">{PROFILE_ATTACHMENT_SLOT_LABELS[a.profile_slot] || a.profile_slot || 'other'}</span>
                      {a.path && (
                        <button
                          type="button"
                          className="saad-link"
                          disabled={openPath === a.path}
                          onClick={() => openAttachment(a.path)}
                        >
                          Open
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="saad-card">
                <h2>Users (profiles)</h2>
                {profiles.length === 0 && <p className="saad-muted">No linked profiles.</p>}
                <ul className="saad-profiles">
                  {profiles.map((p) => (
                    <li key={p.id}>
                      <strong>{p.full_name || '—'}</strong>
                      <span className="saad-muted"> {p.email}</span>
                      <span className="saad-role"> · {p.role}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="saad-card saad-card-wide">
                <h2>External audit (verified seller / provider)</h2>
                <p className="saad-muted">
                  When status is <strong>Passed</strong>, the company receives the verified label and visibility tier
                  is set to <code>verified</code> (after save).
                </p>
                <label className="saad-field">
                  Audit status
                  <select value={auditStatus} onChange={(e) => setAuditStatus(e.target.value)} disabled={saving}>
                    <option value="none">None</option>
                    <option value="pending">Pending</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
                <label className="saad-field">
                  Notes
                  <textarea
                    rows={4}
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    disabled={saving}
                    placeholder="Auditor firm, report reference, valid-until, etc."
                  />
                </label>
                <button type="button" className="saad-primary" disabled={saving} onClick={() => void saveAudit()}>
                  {saving ? 'Saving…' : 'Save audit & recompute visibility'}
                </button>
              </section>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
