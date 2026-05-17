import { useState } from 'react'
import useAuditProStore from '../../store/auditProStore'
import useVendorStore from '../../store/vendorStore'
import { useAuthStore } from '../../store/authStore'
import { getAllSuppliersIncludingRegistry } from '../../data/supplierDatabase'
import {
  fetchAccountDirectoryRowsAsAuditSuppliers,
  fetchPlatformDirectoryProfilesForSuperadmin,
  getActorCompanyId,
  supplierUniverseRecordToAuditSupplier,
} from '../../services/auditManagementDb'
import { auditProUid } from '../../utils/auditProUid'
import { INDUSTRIES, Btn, Card, Field, Grid2, Input, Select, Textarea, Tag } from './auditProUi'
import {
  normSellerRegistryEmail as normEmail,
  syncAuditSupplierRowToSellerRegistry,
  syncAuditSupplierRowsToSellerRegistry,
} from '../../services/supplierSellerRegistrySync'

export default function AuditProSupplierRegistry() {
  const audits = useAuditProStore((s) => s.audits)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const setSuppliers = useAuditProStore((s) => s.setSuppliers)
  const showToast = useAuditProStore((s) => s.showToast)
  const vendors = useVendorStore((s) => s.vendors)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  const [show, setShow] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [form, setForm] = useState({ name: '', country: '', industry: '', contact: '', email: '', address: '', notes: '' })

  const importDirectoryContacts = async () => {
    setImportBusy(true)
    try {
      const cid = await getActorCompanyId()
      if (!cid) {
        showToast('Link a workspace with a Supabase company to import directory contacts.', 'error')
        return
      }
      const fromDb = await fetchAccountDirectoryRowsAsAuditSuppliers(cid)
      let added = 0
      const next = [...suppliers]
      const syncedRows = []
      ;(fromDb || []).forEach((row) => {
        const email = normEmail(row.email)
        const name = String(row.name || '').trim()
        const dupEmail = email && next.some((s) => normEmail(s.email) === email)
        const dupName = name && next.some((s) => s.name === name && (!email || normEmail(s.email) === email))
        if ((!email && !name) || dupEmail || dupName) return
        next.push(row)
        syncedRows.push(row)
        added += 1
      })
      if (!added) showToast('No new directory contacts to import (or already listed).', 'error')
      else {
        setSuppliers(next)
        try {
          const { synced } = syncAuditSupplierRowsToSellerRegistry(syncedRows)
          showToast(`Imported ${added} B2B directory row(s); ${synced} merged into unified seller registry.`)
        } catch {
          showToast(`Imported ${added} contact row(s) from your B2B directory — seller-registry merge skipped.`)
        }
      }
    } catch {
      showToast('Could not load directory entries.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const importPlatformSuppliersSuperadmin = async () => {
    if (!isSuperAdmin()) {
      showToast('Full platform supplier sync requires superadmin.', 'error')
      return
    }
    setImportBusy(true)
    try {
      const { suppliers: fromDb } = await fetchPlatformDirectoryProfilesForSuperadmin()
      let added = 0
      const next = [...suppliers]
      const syncedRows = []
      ;(fromDb || []).forEach((row) => {
        const email = normEmail(row.email)
        if (!email) return
        if (next.some((s) => s.id === row.id || normEmail(s.email) === email)) return
        next.push(row)
        syncedRows.push(row)
        added += 1
      })
      if (!added) showToast('No new platform suppliers returned (or already listed).', 'error')
      else {
        setSuppliers(next)
        try {
          const { synced } = syncAuditSupplierRowsToSellerRegistry(syncedRows)
          showToast(`Synced ${added} platform supplier row(s); ${synced} merged into unified seller registry.`)
        } catch {
          showToast(`Synced ${added} supplier row(s) from Supabase — seller-registry merge skipped.`)
        }
      }
    } catch {
      showToast('Could not load supplier directory.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const importSupplierMarketplaceDatabase = () => {
    try {
      const rows = getAllSuppliersIncludingRegistry()
        .map(supplierUniverseRecordToAuditSupplier)
        .filter(Boolean)
      const next = [...suppliers]
      let added = 0
      rows.forEach((row) => {
        if (!row?.id) return
        if (next.some((s) => s.id === row.id)) return
        if (
          row.supplierDbId &&
          next.some((s) => String(s.supplierDbId || '') === String(row.supplierDbId))
        )
          return
        next.push(row)
        added += 1
      })

      if (!added) {
        showToast('No new suppliers to add — marketplace DB rows are already linked.', 'error')
        return
      }
      setSuppliers(next)
      showToast(
        `Linked ${added} supplier / seller / service provider row(s) from the platform marketplace database.`,
      )
    } catch {
      showToast('Could not load marketplace supplier dataset.', 'error')
    }
  }

  const importVendorMaster = () => {
    const next = [...suppliers]
    let added = 0
    const syncedRows = []
    vendors.forEach((v) => {
      const name = String(v.general?.companyName || v.vendorNumber || v.id || '').trim()
      if (!name || next.some((s) => s.vendorMasterId === v.id || s.name === name)) return
      const row = {
        id: auditProUid(),
        vendorMasterId: v.id,
        name,
        country: String(v.general?.country || ''),
        industry: '',
        contact: String(v.general?.contactName || ''),
        email: String(v.general?.email || ''),
        address: [v.general?.street, v.general?.city].filter(Boolean).join(', ') || '',
        notes: 'Procurement vendor master',
        registeredAt: new Date().toISOString().slice(0, 10),
        source: 'vendor_master',
      }
      next.push(row)
      syncedRows.push(row)
      added += 1
    })
    if (!added) {
      showToast('No new vendors to import (or Vendor Master empty).', 'error')
      return
    }
    setSuppliers(next)
    try {
      const { synced } = syncAuditSupplierRowsToSellerRegistry(syncedRows)
      showToast(`Imported ${added} from Vendor Master; ${synced} merged into unified seller registry.`)
    } catch {
      showToast(`Imported ${added} supplier(s) from Vendor Master — seller-registry merge skipped.`)
    }
  }

  const add = () => {
    if (!form.name || !form.email) {
      showToast('Name and email required.', 'error')
      return
    }
    const id = auditProUid()
    const row = {
      id,
      ...form,
      registeredAt: new Date().toISOString().slice(0, 10),
      source: 'manual',
    }
    try {
      const r = syncAuditSupplierRowToSellerRegistry(row)
      if (!r.ok) throw new Error(r.reason || 'sync failed')
    } catch {
      showToast('Saved in Audit Pro only — seller database sync failed.', 'error')
      setSuppliers([...suppliers, row])
      setForm({ name: '', country: '', industry: '', contact: '', email: '', address: '', notes: '' })
      setShow(false)
      return
    }
    setSuppliers([...suppliers, row])
    showToast('Supplier registered and added to the seller database.')
    setForm({ name: '', country: '', industry: '', contact: '', email: '', address: '', notes: '' })
    setShow(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
        <Btn onClick={importDirectoryContacts} variant="success" disabled={importBusy}>
          {importBusy ? 'Loading…' : 'Import B2B directory (Supabase)'}
        </Btn>
        <Btn onClick={importVendorMaster} variant="secondary">
          Import vendor master (your ERP records)
        </Btn>
        <Btn onClick={importSupplierMarketplaceDatabase} variant="secondary" title="Seeded marketplace directory plus registered sellers and service providers (same corpus as RFQ / maps).">
          Import marketplace suppliers · sellers
        </Btn>
        {isSuperAdmin() ? (
          <Btn onClick={importPlatformSuppliersSuperadmin} variant="secondary" disabled={importBusy}>
            Superadmin: import platform sellers
          </Btn>
        ) : null}
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
                    {sRow.source === 'supplier_universe' && sRow.supplySegment ? (
                      <div style={{ marginTop: 4 }}>
                        <Tag color="#64748B" small>
                          {sRow.supplySegment === 'service_provider'
                            ? 'Service provider'
                            : sRow.supplySegment === 'seller'
                              ? 'Seller'
                              : sRow.supplySegment === 'registered'
                                ? 'Registry'
                                : 'Market DB'}
                        </Tag>
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8' }} className="stx-text-wrap">
                    {sRow.contact}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8' }} className="stx-text-wrap">
                    {sRow.email || '—'}
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
          <div style={{ padding: 20, textAlign: 'center', color: '#374151' }}>
            No suppliers yet — use&nbsp;
            <strong>Import marketplace suppliers · sellers</strong>
            &nbsp;to mirror the unified seller corpus here, or add rows via Vendor Master / B2B directory / Register
            Supplier (they sync into the same registry used platform-wide).
          </div>
        )}
      </div>
    </div>
  )
}
