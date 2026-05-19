import { useMemo, useState } from 'react'
import useAuditProStore from '../../store/auditProStore'
import { useAuthStore } from '../../store/authStore'
import { filterAuditProAuditorsForVisibility } from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import {
  fetchCompanyProfilesAsAuditAuditors,
  fetchPlatformDirectoryProfilesForSuperadmin,
  getActorCompanyId,
} from '../../services/auditManagementDb'
import { auditProUid } from '../../utils/auditProUid'
import { Card, Btn, Field, Grid2, Input, Textarea, Select, Tag } from './auditProUi'

function normEmail(em) {
  return String(em || '').trim().toLowerCase()
}

export default function AuditProAuditorRegistry() {
  const auditors = useAuditProStore((s) => s.auditors)
  const setAuditors = useAuditProStore((s) => s.setAuditors)
  const showToast = useAuditProStore((s) => s.showToast)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  /** When false, seeded demo auditors are hidden unless superadmin enabled Demo Kit. */
  const showDemoKit = useAuditProDemoKitVisible()
  const auditorsForUi = useMemo(
    () => filterAuditProAuditorsForVisibility(auditors, showDemoKit),
    [auditors, showDemoKit],
  )

  const [show, setShow] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [form, setForm] = useState({ name: '', role: 'Auditor', email: '', phone: '', certifications: '', notes: '' })

  const importCompanyTeamProfiles = async () => {
    setImportBusy(true)
    try {
      const cid = await getActorCompanyId()
      if (!cid) {
        showToast('Link a workspace with a Supabase company to import auditors.', 'error')
        return
      }
      const fromDb = await fetchCompanyProfilesAsAuditAuditors(cid)
      let added = 0
      const next = [...auditors]
      ;(fromDb || []).forEach((row) => {
        const email = normEmail(row.email)
        if (!email || next.some((x) => normEmail(x.email) === email)) return
        next.push(row)
        added += 1
      })
      if (!added) showToast('No eligible platform auditors found to import (or already listed).', 'error')
      else {
        setAuditors(next)
        showToast(`Imported ${added} platform auditor profile(s) from your company workspace (auditor roles or auditor account type only).`)
      }
    } catch {
      showToast('Could not load company profiles.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const pruneNonRegisteredCompanyAuditors = async () => {
    setImportBusy(true)
    try {
      const cid = await getActorCompanyId()
      if (!cid) {
        showToast('Link a workspace with a Supabase company to clean up imports.', 'error')
        return
      }
      const eligible = await fetchCompanyProfilesAsAuditAuditors(cid)
      const emailsOk = new Set((eligible || []).map((r) => normEmail(r.email)))
      const snapshot = useAuditProStore.getState().auditors
      const toRemove = snapshot.filter(
        (a) =>
          String(a?.id || '').startsWith('company_profile_') &&
          a.source === 'supabase_profiles' &&
          !emailsOk.has(normEmail(a.email)),
      )
      if (toRemove.length === 0) {
        showToast('No imported company auditors to remove — list matches registered platform auditors.')
        return
      }
      if (
        !window.confirm(
          `Remove ${toRemove.length} auditor registry entr${toRemove.length === 1 ? 'y' : 'ies'} that are not registered as auditors on STREFEX? Manual entries stay.`,
        )
      ) {
        return
      }
      const removeIds = new Set(toRemove.map((a) => a.id))
      setAuditors(snapshot.filter((a) => !removeIds.has(a.id)))
      showToast(`Removed ${toRemove.length} entr${toRemove.length === 1 ? 'y' : 'ies'} not registered as auditors.`)
    } catch {
      showToast('Could not verify auditors against Supabase.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const importPlatformDirectorySuperadmin = async () => {
    if (!isSuperAdmin()) {
      showToast('Full platform auditor sync requires superadmin.', 'error')
      return
    }
    setImportBusy(true)
    try {
      const { auditors: fromDb } = await fetchPlatformDirectoryProfilesForSuperadmin()
      let added = 0
      const next = [...auditors]
      ;(fromDb || []).forEach((row) => {
        const email = normEmail(row.email)
        if (!email || next.some((x) => normEmail(x.email) === email)) return
        next.push(row)
        added += 1
      })
      if (!added) showToast('No new platform auditors returned (or already listed).', 'error')
      else {
        setAuditors(next)
        showToast(`Synced ${added} auditor profile row(s) from Supabase (platform-wide).`)
      }
    } catch {
      showToast('Could not load auditor directory.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const add = () => {
    if (!form.name || !form.email) {
      showToast('Name and email required.', 'error')
      return
    }
    const a = {
      id: auditProUid(),
      ...form,
      certifications: form.certifications.split(',').map((c) => c.trim()).filter(Boolean),
      registeredAt: new Date().toISOString().slice(0, 10),
      source: 'manual',
    }
    setAuditors([...auditors, a])
    showToast('Auditor registered!')
    setForm({ name: '', role: 'Auditor', email: '', phone: '', certifications: '', notes: '' })
    setShow(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
        <Btn onClick={importCompanyTeamProfiles} variant="success" disabled={importBusy}>
          {importBusy ? 'Loading…' : 'Import company auditors (Supabase)'}
        </Btn>
        <Btn onClick={() => void pruneNonRegisteredCompanyAuditors()} variant="secondary" disabled={importBusy}>
          Remove non-platform auditors…
        </Btn>
        {isSuperAdmin() ? (
          <Btn onClick={importPlatformDirectorySuperadmin} variant="secondary" disabled={importBusy}>
            Superadmin: import platform auditors
          </Btn>
        ) : null}
        <Btn onClick={() => setShow((v) => !v)}>
          + Register Auditor
        </Btn>
      </div>
      {show && (
        <Card title="Register Auditor" icon="◈" style={{ marginBottom: 18 }}>
          <Grid2>
            <Field label="Full Name *">
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
          <Field label="Certifications (comma-separated)">
            <Input
              value={form.certifications}
              onChange={(v) => setForm((f) => ({ ...f, certifications: v }))}
              placeholder="IATF 16949, AS9100, ISO 27001, API Q1"
            />
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} rows={2} placeholder="Languages, specializations…" />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={add} variant="success">
              Save
            </Btn>
            <Btn onClick={() => setShow(false)} variant="secondary">
              Cancel
            </Btn>
          </div>
        </Card>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 13 }}>
        {auditorsForUi.map((a) => (
          <div key={a.id} style={{ background: 'var(--ap-panel)', border: '1px solid var(--ap-border)', borderRadius: 11, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(135deg,#1E40AF,#0284C7)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {(a.name || '?').charAt(0)}
                </div>
                <div style={{ minWidth: 0 }} className="stx-text-wrap">
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ap-text)' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ap-muted)' }}>{a.role}</div>
                </div>
              </div>
              <button type="button" onClick={() => setAuditors(auditors.filter((x) => x.id !== a.id))} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', flexShrink: 0 }}>
                ✕
              </button>
            </div>
            <div style={{ marginTop: 11 }}>
              <div style={{ fontSize: 11, color: 'var(--ap-muted)' }} className="stx-text-wrap">
                {a.email}
              </div>
              {a.phone ? <div style={{ fontSize: 10, color: '#374151' }}>{a.phone}</div> : null}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7 }}>
                {(a.certifications || []).map((c) => (
                  <Tag key={c} color="#1E40AF" small>
                    {c}
                  </Tag>
                ))}
              </div>
              {a.notes ? (
                <div style={{ fontSize: 10, color: '#374151', marginTop: 6, fontStyle: 'italic' }} className="stx-text-wrap">
                  {a.notes}
                </div>
              ) : null}
            </div>
            <div style={{ fontSize: 9, color: '#1F2937', marginTop: 9 }}>Registered: {a.registeredAt}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
