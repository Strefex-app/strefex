import { useState } from 'react'
import useAuditProStore from '../../store/auditProStore'
import useAuditorHubStore from '../../store/auditorHubStore'
import { useAccountRegistry } from '../../store/accountRegistry'
import { useAuthStore } from '../../store/authStore'
import { fetchPlatformDirectoryProfilesForSuperadmin } from '../../services/auditManagementDb'
import { auditProUid } from '../../utils/auditProUid'
import { Card, Btn, Field, Grid2, Input, Textarea, Select, Tag } from './auditProUi'

function normEmail(em) {
  return String(em || '').trim().toLowerCase()
}

export default function AuditProAuditorRegistry() {
  const auditors = useAuditProStore((s) => s.auditors)
  const setAuditors = useAuditProStore((s) => s.setAuditors)
  const profiles = useAuditorHubStore((s) => s.profiles)
  const showToast = useAuditProStore((s) => s.showToast)
  const getRegisteredAuditors = useAccountRegistry((s) => s.getRegisteredAuditors)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  const [show, setShow] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [form, setForm] = useState({ name: '', role: 'Auditor', email: '', phone: '', certifications: '', notes: '' })

  const mergeFromAccountRegistry = () => {
    const regs = getRegisteredAuditors()
    let added = 0
    const next = [...auditors]
    regs.forEach((a) => {
      const email = normEmail(a.email)
      if (!email || next.some((row) => normEmail(row.email) === email)) return
      next.push({
        id: `registry_auditor:${email}`,
        name: a.contactName || a.company || email,
        role: 'Auditor',
        email,
        phone: '',
        certifications: [],
        notes: ['Platform registry', a.company].filter(Boolean).join(' · '),
        registeredAt: (a.registeredAt || new Date().toISOString()).slice(0, 10),
        accountRegistryUserId: a.id,
        source: 'account_registry',
      })
      added += 1
    })
    if (!added) {
      showToast('No new auditor accounts in platform registry.', 'error')
      return
    }
    setAuditors(next)
    showToast(`Imported ${added} registered auditor account(s).`)
  }

  const importFromSupabaseDirectory = async () => {
    if (!isSuperAdmin()) {
      showToast('Database directory import requires superadmin.', 'error')
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
      if (!added) {
        showToast('No new auditors returned from Supabase (or empty).', 'error')
      } else {
        setAuditors(next)
        showToast(`Synced ${added} auditor profile row(s) from database.`)
      }
    } catch {
      showToast('Could not load auditor directory.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const mergeFromHub = () => {
    let added = 0
    const next = [...auditors]
    profiles.forEach((p) => {
      if (next.some((a) => String(a.email).toLowerCase() === String(p.email).toLowerCase())) return
      next.push({
        id: auditProUid(),
        name: p.displayName || p.email,
        role: 'Auditor',
        email: p.email,
        phone: '',
        certifications: Array.isArray(p.competencies) ? [...p.competencies] : [],
        notes: String(p.organization || ''),
        registeredAt: new Date().toISOString().slice(0, 10),
      })
      added += 1
    })
    if (!added) {
      showToast('No new auditor profiles to import.', 'error')
      return
    }
    setAuditors(next)
    showToast(`Imported ${added} profile(s) from STREFEX auditors hub.`)
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
    }
    setAuditors([...auditors, a])
    showToast('Auditor registered!')
    setForm({ name: '', role: 'Auditor', email: '', phone: '', certifications: '', notes: '' })
    setShow(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
        <Btn onClick={mergeFromAccountRegistry} variant="success">
          Import registered auditors (platform)
        </Btn>
        {isSuperAdmin() ? (
          <Btn onClick={importFromSupabaseDirectory} variant="secondary" disabled={importBusy}>
            {importBusy ? 'Loading…' : 'Superadmin: sync from Supabase profiles'}
          </Btn>
        ) : null}
        <Btn onClick={mergeFromHub} variant="secondary">
          Merge auditors hub profiles
        </Btn>
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
        {auditors.map((a) => (
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
