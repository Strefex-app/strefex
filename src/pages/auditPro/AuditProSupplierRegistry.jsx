import { useState } from 'react'
import useAuditProStore from '../../store/auditProStore'
import useVendorStore from '../../store/vendorStore'
import { useAccountRegistry } from '../../store/accountRegistry'
import { useAuthStore } from '../../store/authStore'
import { fetchPlatformDirectoryProfilesForSuperadmin } from '../../services/auditManagementDb'
import { auditProUid } from '../../utils/auditProUid'
import { INDUSTRIES } from './auditProUi'
import { Btn, Card, Field, Grid2, Input, Select, Textarea, Tag } from './auditProUi'

function normEmail(em) {
  return String(em || '').trim().toLowerCase()
}

export default function AuditProSupplierRegistry() {
  const audits = useAuditProStore((s) => s.audits)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const setSuppliers = useAuditProStore((s) => s.setSuppliers)
  const showToast = useAuditProStore((s) => s.showToast)
  const vendors = useVendorStore((s) => s.vendors)
  const getRegisteredSellers = useAccountRegistry((s) => s.getRegisteredSellers)
  const getRegisteredServiceProviders = useAccountRegistry((s) => s.getRegisteredServiceProviders)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  const [show, setShow] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [form, setForm] = useState({ name: '', country: '', industry: '', contact: '', email: '', address: '', notes: '' })

  const mergeRegisteredSellersFromRegistry = () => {
    const pool = [...getRegisteredSellers(), ...getRegisteredServiceProviders()]
    const next = [...suppliers]
    let added = 0
    pool.forEach((a) => {
      const email = normEmail(a.email)
      const name = String(a.company || a.contactName || email || '').trim()
      if (!email || !name) return
      if (next.some((s) => normEmail(s.email) === email || s.name === name)) return
      const industries = Array.isArray(a.industries) && a.industries.length ? a.industries[0] : ''
      next.push({
        id: `registry_supplier:${email}`,
        name,
        country: '',
        industry: industries,
        contact: a.contactName || '',
        email,
        address: '',
        notes: 'Imported from platform account registry.',
        registeredAt: (a.registeredAt || new Date().toISOString()).slice(0, 10),
        accountRegistryUserId: a.id,
        vendorMasterId: null,
        source: 'account_registry',
      })
      added += 1
    })
    if (!added) {
      showToast('No new seller accounts in registry (or already listed).', 'error')
      return
    }
    setSuppliers(next)
    showToast(`Imported ${added} registered seller / service supplier(s).`)
  }

  const importSuppliersFromSupabaseDirectory = async () => {
    if (!isSuperAdmin()) {
      showToast('Database directory import requires superadmin.', 'error')
      return
    }
    setImportBusy(true)
    try {
      const { suppliers: fromDb } = await fetchPlatformDirectoryProfilesForSuperadmin()
      let added = 0
      const next = [...suppliers]
      ;(fromDb || []).forEach((row) => {
        const email = normEmail(row.email)
        if (!email) return
        if (next.some((s) => s.id === row.id || normEmail(s.email) === email)) return
        next.push(row)
        added += 1
      })
      if (!added) {
        showToast('No new supplier companies returned from Supabase (or empty).', 'error')
      } else {
        setSuppliers(next)
        showToast(`Synced ${added} supplier row(s) from database.`)
      }
    } catch {
      showToast('Could not load supplier directory.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const importVendorMaster = () => {
    const next = [...suppliers]
    let added = 0
    vendors.forEach((v) => {
      const name = String(v.general?.companyName || v.vendorNumber || v.id || '').trim()
      if (!name || next.some((s) => s.vendorMasterId === v.id || s.name === name)) return
      next.push({
        id: auditProUid(),
        vendorMasterId: v.id,
        name,
        country: String(v.general?.country || ''),
        industry: '',
        contact: String(v.general?.contactName || ''),
        email: String(v.general?.email || ''),
        address: [v.general?.street, v.general?.city].filter(Boolean).join(', ') || '',
        notes: '',
        registeredAt: new Date().toISOString().slice(0, 10),
      })
      added += 1
    })
    if (!added) {
      showToast('No new vendors to import (or Vendor Master empty).', 'error')
      return
    }
    setSuppliers(next)
    showToast(`Imported ${added} supplier(s) from Vendor Master.`)
  }

  const add = () => {
    if (!form.name || !form.email) {
      showToast('Name and email required.', 'error')
      return
    }
    setSuppliers([
      ...suppliers,
      {
        id: auditProUid(),
        ...form,
        registeredAt: new Date().toISOString().slice(0, 10),
      },
    ])
    showToast('Supplier registered!')
    setForm({ name: '', country: '', industry: '', contact: '', email: '', address: '', notes: '' })
    setShow(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
        <Btn onClick={mergeRegisteredSellersFromRegistry} variant="success">
          Import registered sellers (platform registry)
        </Btn>
        {isSuperAdmin() ? (
          <Btn onClick={importSuppliersFromSupabaseDirectory} variant="secondary" disabled={importBusy}>
            {importBusy ? 'Loading…' : 'Superadmin: sync suppliers from Supabase'}
          </Btn>
        ) : null}
        <Btn onClick={importVendorMaster} variant="secondary">
          Import from Vendor Master
        </Btn>
        <Btn onClick={() => setShow((v) => !v)}>
          + Register Supplier
        </Btn>
      </div>
      {show && (
        <Card title="Register Supplier" icon="◉" style={{ marginBottom: 18 }}>
          <Grid2>
            <Field label="Supplier Name *">
              <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="Industry">
              <Select value={form.industry} onChange={(v) => setForm((f) => ({ ...f, industry: v }))} options={['', ...INDUSTRIES]} />
            </Field>
            <Field label="Contact Person">
              <Input value={form.contact} onChange={(v) => setForm((f) => ({ ...f, contact: v }))} />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            </Field>
            <Field label="Site Address">
              <Input value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
            </Field>
          </Grid2>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} rows={2} placeholder="Certifications, risk level…" />
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
      <div style={{ background: 'var(--ap-panel)', border: '1px solid var(--ap-border)', borderRadius: 11, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--ap-panel-3)' }}>
              {['Supplier', 'Country', 'Industry', 'Contact', 'Email', 'Audits', 'Findings', 'Registered', ''].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: 'var(--ap-muted)', fontWeight: 700, letterSpacing: '.05em', borderBottom: '1px solid var(--ap-border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {suppliers.map((sRow) => {
              const sa = audits.filter((a) => a.supplierId === sRow.id)
              const sf = sa.reduce((n, a) => n + (a.findings?.length || 0), 0)
              return (
                <tr key={sRow.id} className="ap-hovrow" style={{ borderBottom: '1px solid #0F1A2E' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ap-text)', fontWeight: 500 }} className="stx-text-wrap">
                    {sRow.name}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8' }}>{sRow.country}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <Tag color="#3B82F6" small>
                      {sRow.industry || '—'}
                    </Tag>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8' }} className="stx-text-wrap">
                    {sRow.contact}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8' }} className="stx-text-wrap">
                    {sRow.email}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#60A5FA', fontWeight: 700, textAlign: 'center' }}>{sa.length}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, textAlign: 'center', color: sf > 0 ? '#FCD34D' : '#374151' }}>{sf}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#374151' }}>{sRow.registeredAt}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <button type="button" onClick={() => setSuppliers(suppliers.filter((x) => x.id !== sRow.id))} style={{ background: '#7F1D1D15', border: 'none', color: '#F87171', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontSize: 11 }}>
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!suppliers.length && (
          <div style={{ padding: 20, textAlign: 'center', color: '#374151' }}>No suppliers.</div>
        )}
      </div>
    </div>
  )
}
