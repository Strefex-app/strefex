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
import { useAccountRegistry } from '../store/accountRegistry'
import {
  normalizeReceivingPlants,
  readReceivingPlantsFromAccount,
  saveReceivingPlantsToAccount,
} from '../utils/receivingPlantsPersist'
import '../styles/app-page.css'
import './SuperAdminAccountDetailPage.css'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function emptyForm() {
  return {
    name: '',
    email: '',
    phone: '',
    website: '',
    country: '',
    city: '',
    address: '',
    account_type: 'buyer',
    plan: 'start',
    contactName: '',
    contactPhone: '',
    contactProfileId: '',
  }
}

export default function SuperAdminAccountDetailPage() {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const updateAccount = useAccountRegistry((s) => s.updateAccount)
  const [company, setCompany] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const [auditStatus, setAuditStatus] = useState('none')
  const [auditNotes, setAuditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [openPath, setOpenPath] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [plants, setPlants] = useState([])

  const validId = useMemo(() => Boolean(companyId && UUID_RE.test(companyId)), [companyId])

  const syncFormFromCompany = useCallback((c, plist) => {
    const primary = Array.isArray(plist) && plist.length ? plist[0] : null
    setForm({
      name: c?.name || '',
      email: c?.email || '',
      phone: c?.phone || '',
      website: c?.website || '',
      country: c?.country || '',
      city: c?.city || '',
      address: c?.address || c?.metadata?.address || '',
      account_type: c?.account_type || 'buyer',
      plan: c?.plan || 'start',
      contactName: primary?.full_name || '',
      contactPhone: primary?.phone || '',
      contactProfileId: primary?.id || '',
    })
    const saved = readReceivingPlantsFromAccount(
      { receivingPlants: c?.metadata?.receiving_plants },
      c,
    )
    setPlants(saved.length ? saved : normalizeReceivingPlants([]))
  }, [])

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
      syncFormFromCompany(c, plist)
    } catch (e) {
      setCompany(null)
      setProfiles([])
      setError(e?.message || 'Failed to load company.')
    } finally {
      setLoading(false)
    }
  }, [companyId, syncFormFromCompany, validId])

  useEffect(() => {
    void load()
  }, [load])

  const snapshot = useMemo(() => (company ? evaluateCompanyProfileDirectory(company) : null), [company])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const updatePlantField = (id, key, value) => {
    const parsed = key === 'lat' || key === 'lon' ? (parseFloat(value) || 0) : value
    setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: parsed } : p)))
  }

  const addPlant = () => {
    setPlants((prev) => [
      ...prev,
      {
        id: `plant-${Date.now()}`,
        name: 'New plant',
        cc: 'DE',
        lat: 50,
        lon: 10,
        cont: 'EU',
      },
    ])
  }

  const removePlant = (id) => {
    setPlants((prev) => {
      const left = prev.filter((p) => p.id !== id)
      return left.length ? left : prev
    })
  }

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

  const saveAccountProfile = async () => {
    if (!company || !validId) return
    if (!form.name.trim()) {
      setError('Company name is required.')
      return
    }
    setSavingProfile(true)
    setError('')
    setSavedMsg('')
    try {
      const nextAddress = form.address.trim()
      const companyPayload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        country: form.country.trim() || null,
        city: form.city.trim() || null,
        address: nextAddress || null,
        account_type: form.account_type || company.account_type,
        plan: form.plan || company.plan,
        metadata: {
          ...(company.metadata || {}),
          address: nextAddress || null,
        },
      }
      const merged = {
        ...company,
        ...companyPayload,
        profile_attachments: company.profile_attachments,
      }
      const vis = buildCompanyVisibilityUpdate(merged)
      companyPayload.visibility_tier = vis.visibility_tier
      companyPayload.metadata = { ...companyPayload.metadata, ...vis.metadata }

      const updated = await companiesService.update(companyId, companyPayload)
      setCompany(updated)

      if (form.contactProfileId) {
        try {
          await profilesService.updateProfilePrivileged({
            id: form.contactProfileId,
            full_name: form.contactName.trim() || null,
            phone: form.contactPhone.trim() || null,
          })
          setProfiles((prev) => prev.map((p) => (
            p.id === form.contactProfileId
              ? { ...p, full_name: form.contactName.trim(), phone: form.contactPhone.trim() }
              : p
          )))
        } catch {
          /* privileged update may be restricted; company save still applies */
        }
      }

      const emailKey = (form.email || company.email || '').trim().toLowerCase()
      if (emailKey) {
        updateAccount(emailKey, {
          company: form.name.trim(),
          country: form.country.trim() || '',
          city: form.city.trim() || '',
          address: nextAddress || '',
          accountType: form.account_type || undefined,
        })
      }

      if (plants.length) {
        await saveReceivingPlantsToAccount({
          plants,
          email: emailKey,
          companyId,
          updateAccount,
          tenant: updated,
        })
      }

      setSavedMsg('Account profile saved.')
      await load()
    } catch (e) {
      setError(e?.message || 'Failed to save account profile.')
    } finally {
      setSavingProfile(false)
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
        {savedMsg && <div className="saad-ok" role="status">{savedMsg}</div>}

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
              <section className="saad-card saad-card-wide">
                <h2>Account profile (editable)</h2>
                <p className="saad-muted">
                  Superadmin can correct buyer and user company data for sourcing geo accuracy.
                  Changes sync to the platform company record and the local account registry.
                </p>
                <div className="saad-form-grid">
                  <label className="saad-field">
                    Company name
                    <input value={form.name} onChange={(e) => setField('name', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Company email
                    <input value={form.email} onChange={(e) => setField('email', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Phone
                    <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Website
                    <input value={form.website} onChange={(e) => setField('website', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Country
                    <input value={form.country} onChange={(e) => setField('country', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    City
                    <input value={form.city} onChange={(e) => setField('city', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field saad-field-span">
                    Address / plant address
                    <input value={form.address} onChange={(e) => setField('address', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Account type
                    <select value={form.account_type} onChange={(e) => setField('account_type', e.target.value)} disabled={savingProfile}>
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                      <option value="service_provider">Service provider</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </label>
                  <label className="saad-field">
                    Plan
                    <select value={form.plan} onChange={(e) => setField('plan', e.target.value)} disabled={savingProfile}>
                      <option value="start">Start</option>
                      <option value="basic">Basic</option>
                      <option value="premium">Premium</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </label>
                  <label className="saad-field">
                    Contact full name
                    <input value={form.contactName} onChange={(e) => setField('contactName', e.target.value)} disabled={savingProfile} />
                  </label>
                  <label className="saad-field">
                    Contact phone
                    <input value={form.contactPhone} onChange={(e) => setField('contactPhone', e.target.value)} disabled={savingProfile} />
                  </label>
                </div>

                <h3 className="saad-h3">Receiving plants</h3>
                <p className="saad-muted">Used by Intelligent Sourcing map and transit estimates.</p>
                <div className="saad-plants">
                  {plants.map((p) => (
                    <div key={p.id} className="saad-plant-row">
                      <input
                        aria-label="Plant name"
                        value={p.name}
                        onChange={(e) => updatePlantField(p.id, 'name', e.target.value)}
                        disabled={savingProfile}
                      />
                      <input
                        aria-label="Country code"
                        value={p.cc}
                        onChange={(e) => updatePlantField(p.id, 'cc', e.target.value.toUpperCase().slice(0, 2))}
                        disabled={savingProfile}
                      />
                      <input
                        aria-label="Latitude"
                        value={p.lat}
                        onChange={(e) => updatePlantField(p.id, 'lat', e.target.value)}
                        disabled={savingProfile}
                      />
                      <input
                        aria-label="Longitude"
                        value={p.lon}
                        onChange={(e) => updatePlantField(p.id, 'lon', e.target.value)}
                        disabled={savingProfile}
                      />
                      <button type="button" className="saad-link" onClick={() => removePlant(p.id)} disabled={savingProfile}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="saad-plant-actions">
                  <button type="button" className="saad-back" onClick={addPlant} disabled={savingProfile}>
                    Add plant
                  </button>
                  <button type="button" className="saad-primary" disabled={savingProfile} onClick={() => void saveAccountProfile()}>
                    {savingProfile ? 'Saving…' : 'Save account profile'}
                  </button>
                </div>
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
