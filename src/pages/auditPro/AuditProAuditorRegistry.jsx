import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { filterAuditProAuditsForVisibility, filterAuditProAuditorsForVisibility } from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { fetchCompanyProfilesAsAuditAuditors, getActorCompanyId } from '../../services/auditManagementDb'
import { auditProUid } from '../../utils/auditProUid'
import {
  attachAuditorCertificationFile,
  mergeAuditorLists,
  nextAuditorRegistrationNumber,
  normAuditorEmail,
  openAuditorCertification,
} from '../../utils/auditorRegistry'
import { uniqueAuditStandards } from '../../utils/auditStandardsCatalogue'
import { AUDIT_STANDARDS } from '../../data/auditManagementDetailedData'
import {
  auditorDatabaseKpis,
  buildAuditorDatabaseRows,
  formatSpread,
  programmeYear,
} from '../../utils/auditorDatabase'
import { Card, Btn, Field, Grid2, Input, Textarea, Select } from './auditProUi'

const emptyForm = {
  name: '',
  role: 'Lead Auditor',
  email: '',
  phone: '',
  city: '',
  country: '',
  languages: '',
  impartiality: '',
  notes: '',
}
const emptyCert = () => ({ title: '', file: null })

function statusClass(status) {
  if (status === 'PROVISIONAL') return 'is-prov'
  if (status === 'EXPERT') return 'is-expert'
  return 'is-ok'
}

export default function AuditProAuditorRegistry() {
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('auditor') || ''
  const auditors = useAuditProStore((s) => s.auditors)
  const auditsAll = useAuditProStore((s) => s.audits)
  const suppliersAll = useAuditProStore((s) => s.suppliers)
  const setAuditors = useAuditProStore((s) => s.setAuditors)
  const showToast = useAuditProStore((s) => s.showToast)
  const showDemoKit = useAuditProDemoKitVisible()
  const auditorsForUi = useMemo(
    () => filterAuditProAuditorsForVisibility(auditors, showDemoKit),
    [auditors, showDemoKit],
  )
  const audits = useMemo(
    () => filterAuditProAuditsForVisibility(auditsAll, auditors, suppliersAll, showDemoKit),
    [auditsAll, auditors, suppliersAll, showDemoKit],
  )
  const standardsCatalogue = useMemo(() => uniqueAuditStandards(AUDIT_STANDARDS), [])
  const year = programmeYear()

  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [certs, setCerts] = useState([emptyCert()])

  const previewCode = nextAuditorRegistrationNumber(auditorsForUi)
  const rows = useMemo(
    () => buildAuditorDatabaseRows({
      auditors: auditorsForUi,
      audits,
      catalogue: standardsCatalogue,
      year,
    }),
    [auditorsForUi, audits, standardsCatalogue, year],
  )
  const kpis = useMemo(() => auditorDatabaseKpis(rows, audits, year), [rows, audits, year])
  const selected = rows.find((row) => String(row.id) === selectedId) || null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const cid = await getActorCompanyId()
      if (!cid || cancelled) return
      const fromDb = await fetchCompanyProfilesAsAuditAuditors(cid)
      if (cancelled || !fromDb.length) return
      const current = useAuditProStore.getState().auditors || []
      const merged = mergeAuditorLists(current, fromDb)
      const same = current.length === merged.length
        && current.every((row) => merged.some((m) => m.id === row.id && m.auditorCode === row.auditorCode))
      if (!same) setAuditors(merged)
    })()
    return () => {
      cancelled = true
    }
  }, [setAuditors])

  const closeForm = () => {
    setShow(false)
    setForm(emptyForm)
    setCerts([emptyCert()])
  }

  const openAuditor = (id) => {
    const next = new URLSearchParams(params)
    next.set('auditor', id)
    setParams(next, { replace: true })
  }

  const closeAuditor = () => {
    const next = new URLSearchParams(params)
    next.delete('auditor')
    setParams(next, { replace: true })
  }

  const add = async () => {
    if (!form.name || !form.email) {
      showToast('Name and email required.', 'error')
      return
    }
    const email = normAuditorEmail(form.email)
    if (auditorsForUi.some((row) => normAuditorEmail(row.email) === email)) {
      showToast('That email is already on the auditor panel.', 'error')
      return
    }
    const ready = certs.filter((row) => row.file)
    if (!ready.length) {
      showToast('Attach at least one certification file.', 'error')
      return
    }
    setSaving(true)
    try {
      const id = auditProUid()
      const auditorCode = nextAuditorRegistrationNumber(auditors)
      const companyId = await getActorCompanyId()
      const certificationFiles = []
      for (const row of ready) {
        certificationFiles.push(await attachAuditorCertificationFile({
          companyId,
          auditorId: id,
          title: row.title,
          file: row.file,
        }))
      }
      const record = {
        id,
        name: form.name.trim(),
        role: form.role,
        email,
        phone: form.phone.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
        languages: form.languages.split(/[,;/|]+/).map((x) => x.trim()).filter(Boolean),
        impartiality: form.impartiality.trim(),
        notes: form.notes.trim(),
        certifications: certificationFiles.map((file) => file.name),
        certificationFiles,
        auditorCode,
        registeredAt: new Date().toISOString().slice(0, 10),
        source: 'strefex_platform',
      }
      setAuditors([...auditors, record])
      showToast(`Auditor registered as ${auditorCode}.`)
      closeForm()
    } catch (err) {
      showToast(err?.message || 'Could not register the auditor.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const expertsHint = kpis.experts
    ? `${kpis.qualified} qualified · ${kpis.experts} technical expert`
    : `${kpis.qualified} qualified`
  const cpdHint = `Minimum ${kpis.minTarget} h per year${kpis.latestCalib !== '—' ? ` · calibrated ${kpis.latestCalib}` : ''}`

  return (
    <div className="ap-auditor-page">
      <div className="ap-auditor-toolbar">
        {selected ? (
          <button type="button" className="app-page-btn-outline" onClick={closeAuditor}>
            Auditor database
          </button>
        ) : null}
        <Btn onClick={() => setShow((v) => !v)}>+ Register Auditor</Btn>
      </div>

      {show ? (
        <Card title="Register auditor" style={{ marginBottom: 18 }}>
          <p className="ap-auditor-regno stx-text-caption">
            STREFEX registration number: <strong>{previewCode}</strong>
          </p>
          <Grid2>
            <Field label="Full name *">
              <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            </Field>
            <Field label="Role">
              <Select
                value={form.role}
                onChange={(v) => setForm((f) => ({ ...f, role: v }))}
                options={['Auditor', 'Senior Auditor', 'Lead Auditor', 'Technical Expert', 'Observer']}
              />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="Base city">
              <Input value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} placeholder="DE" />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="Languages">
              <Input value={form.languages} onChange={(v) => setForm((f) => ({ ...f, languages: v }))} placeholder="DE, EN, FR" />
            </Field>
            <Field label="Impartiality">
              <Input value={form.impartiality} onChange={(v) => setForm((f) => ({ ...f, impartiality: v }))} placeholder="None declared." />
            </Field>
          </Grid2>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} rows={2} placeholder="Specializations, medical, welding…" />
          </Field>
          <div className="ap-auditor-certs">
            <div className="ap-auditor-certs-label">Certifications (attach files) *</div>
            {certs.map((row, index) => (
              <div key={index} className="ap-auditor-cert-row">
                <Input
                  value={row.title}
                  onChange={(v) => setCerts((list) => list.map((item, i) => (i === index ? { ...item, title: v } : item)))}
                  placeholder="Certificate name — IATF 16949 Lead Auditor"
                />
                <label className="ap-auditor-file">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setCerts((list) => list.map((item, i) => (i === index ? { ...item, file } : item)))
                    }}
                  />
                  <span>{row.file ? row.file.name : 'Choose file'}</span>
                </label>
                {certs.length > 1 ? (
                  <button
                    type="button"
                    className="ap-auditor-cert-remove"
                    onClick={() => setCerts((list) => list.filter((_, i) => i !== index))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
            <Btn variant="secondary" onClick={() => setCerts((list) => [...list, emptyCert()])}>
              Add certificate
            </Btn>
          </div>
          <div className="ap-auditor-form-actions">
            <Btn onClick={() => void add()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn>
            <Btn variant="secondary" onClick={closeForm}>Cancel</Btn>
          </div>
        </Card>
      ) : null}

      {selected ? (
        <section className="ap-adb-qual" aria-label="Qualification per standard module">
          <div className="ap-adb-qual-kicker">Qualification per standard module</div>
          <div className="ap-adb-qual-grid ap-adb-qual-grid--one">
            <article className={`ap-adb-qual-card ap-adb-qual-card--${statusClass(selected.status)}`}>
              <header className="ap-adb-qual-head">
                <h3 className="ap-adb-qual-name stx-text-wrap">{selected.name}</h3>
                <span className="ap-adb-qual-code">{selected.code}</span>
              </header>
              {selected.modules.length ? (
                <ul className="ap-adb-mods">
                  {selected.modules.map((mod) => (
                    <li key={mod.id} className={`ap-adb-mod ap-adb-mod--${mod.status === 'Provisional' ? 'prov' : 'ok'}`}>
                      {mod.label}
                      {mod.status ? ` · ${mod.status}` : ''}
                      {mod.date ? ` ${mod.date.slice(0, 7)}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ap-auditor-empty">No standard modules recorded yet. Attach certificates on registration.</p>
              )}
              <p className="ap-adb-imp stx-text-wrap">
                <strong>Impartiality:</strong> {selected.impartiality}
              </p>
              {(selected.auditor.certificationFiles || []).length ? (
                <ul className="ap-auditor-cert-list">
                  {selected.auditor.certificationFiles.map((file) => (
                    <li key={file.id || file.fileName}>
                      <button type="button" className="ap-auditor-cert-link" onClick={() => void openAuditorCertification(file)}>
                        {file.name || file.fileName}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </div>
        </section>
      ) : (
        <>
          <div className="ap-pool-kpis ap-adb-kpis">
            <article className="ap-pool-kpi ap-pool-kpi--info">
              <div className="ap-pool-kpi-label">Auditors on the panel</div>
              <div className="ap-pool-kpi-value">{kpis.panel}</div>
              <div className="ap-pool-kpi-hint">{expertsHint}</div>
            </article>
            <article className="ap-pool-kpi ap-pool-kpi--ok">
              <div className="ap-pool-kpi-label">Module qualifications</div>
              <div className="ap-pool-kpi-value">{kpis.modules}</div>
              <div className="ap-pool-kpi-hint">{kpis.provisional ? `${kpis.provisional} still provisional` : 'All modules qualified'}</div>
            </article>
            <article className="ap-pool-kpi">
              <div className="ap-pool-kpi-label">Audit days booked {year}</div>
              <div className="ap-pool-kpi-value">{kpis.booked}</div>
              <div className="ap-pool-kpi-hint">{kpis.yearAudits} audits led or supported</div>
            </article>
            <article className="ap-pool-kpi ap-pool-kpi--warn">
              <div className="ap-pool-kpi-label">CPD below target</div>
              <div className="ap-pool-kpi-value">{kpis.cpdBelow}</div>
              <div className="ap-pool-kpi-hint">{cpdHint}</div>
            </article>
          </div>

          {rows.length === 0 ? (
            <p className="ap-auditor-empty stx-text-body">
              No auditors on the panel yet. Registered STREFEX auditors appear here automatically. Use Register Auditor to add someone with certificates.
            </p>
          ) : (
            <div className="ap-suphub-table-wrap ap-adb-table-wrap">
              <table className="ap-suphub-table ap-adb-table">
                <thead>
                  <tr>
                    <th>Auditor</th>
                    <th>Base / languages</th>
                    <th>Status</th>
                    <th>Audit days {String(year).slice(2)}</th>
                    <th>Spread</th>
                    <th>Calibrated</th>
                    <th>CPD</th>
                    <th>Travel medical</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button type="button" className="ap-suphub-name" onClick={() => openAuditor(row.id)}>
                          {row.name}
                        </button>
                        <div className="ap-pool-sub">{row.code} · {row.roleLine}</div>
                      </td>
                      <td>
                        <div>{row.base}</div>
                        <div className="ap-pool-sub stx-text-wrap">{row.languagesLine}</div>
                      </td>
                      <td>
                        <span className={`ap-adb-status ap-adb-status--${statusClass(row.status)}`}>{row.status}</span>
                      </td>
                      <td>{row.bookedDays}</td>
                      <td>
                        <span className={`ap-adb-spread${row.spread != null && row.spread >= 1 ? ' is-hot' : ''}`}>
                          {formatSpread(row.spread)}
                        </span>
                      </td>
                      <td>{row.calibrated}</td>
                      <td>
                        <span className={row.cpd.below ? 'ap-adb-cpd is-low' : 'ap-adb-cpd'}>
                          {row.cpd.hours == null ? '—' : `${row.cpd.hours} / ${row.cpd.target} h`}
                        </span>
                      </td>
                      <td>
                        <span className={row.travelMedical !== '—' ? 'ap-adb-med' : ''}>{row.travelMedical}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
