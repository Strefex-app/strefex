import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'
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

const emptyForm = { name: '', country: '', industry: '', contact: '', email: '', address: '', notes: '' }

function supplierRowFromStore(sRow) {
  return {
    name: sRow.name || '',
    country: sRow.country || '',
    industry: sRow.industry || '',
    contact: sRow.contact || '',
    email: sRow.email || '',
    address: sRow.address || '',
    notes: sRow.notes || '',
  }
}

export default function AuditProSupplierRegistry() {
  const [searchParams, setSearchParams] = useSearchParams()
  const audits = useAuditProStore((s) => s.audits)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const setSuppliers = useAuditProStore((s) => s.setSuppliers)
  const showToast = useAuditProStore((s) => s.showToast)
  const vendors = useVendorStore((s) => s.vendors)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)

  /** `register` = new supplier; `edit` = amend existing row (plans / conduct stay linked by supplier id). */
  const [panelMode, setPanelMode] = useState('register')
  const [editSupplierId, setEditSupplierId] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [form, setForm] = useState(() => ({ ...emptyForm }))

  const openRegister = () => {
    setPanelMode('register')
    setEditSupplierId(null)
    setForm({ ...emptyForm })
    setShowPanel(true)
  }

  const openEdit = (sRow) => {
    setPanelMode('edit')
    setEditSupplierId(sRow.id)
    setForm(supplierRowFromStore(sRow))
    setShowPanel(true)
  }

  useEffect(() => {
    const id = searchParams.get('edit')
    if (!id) return
    const row = suppliers.find((s) => s.id === id)
    if (!row) return
    setPanelMode('edit')
    setEditSupplierId(row.id)
    setForm(supplierRowFromStore(row))
    setShowPanel(true)
    setSearchParams(
      (p) => {
        const next = new URLSearchParams(p)
        next.delete('edit')
        return next
      },
      { replace: true },
    )
  }, [searchParams, suppliers, setSearchParams])

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
    notifyWorkspaceKeyDirty('audit_pro', true)
    try {
      const { synced } = syncAuditSupplierRowsToSellerRegistry(syncedRows)
      showToast(`Imported ${added} from Vendor Master; ${synced} merged into unified seller registry.`)
    } catch {
      showToast(`Imported ${added} supplier(s) from Vendor Master — seller-registry merge skipped.`)
    }
  }

  const closeSupplierPanel = () => {
    setShowPanel(false)
    setPanelMode('register')
    setEditSupplierId(null)
    setForm({ ...emptyForm })
  }

  const saveSupplierPanel = () => {
    if (!form.name || !form.email) {
      showToast('Name and email required.', 'error')
      return
    }
    if (panelMode === 'register') {
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
        closeSupplierPanel()
        notifyWorkspaceKeyDirty('audit_pro', true)
        return
      }
      setSuppliers([...suppliers, row])
      notifyWorkspaceKeyDirty('audit_pro', true)
      showToast('Supplier registered and added to the seller database.')
      closeSupplierPanel()
      return
    }

    const prev = suppliers.find((s) => s.id === editSupplierId)
    if (!prev) {
      closeSupplierPanel()
      return
    }
    const row = {
      ...prev,
      ...form,
      id: editSupplierId,
      registeredAt: prev.registeredAt,
    }
    try {
      const r = syncAuditSupplierRowToSellerRegistry(row)
      if (!r.ok) throw new Error(r.reason || 'sync failed')
    } catch {
      showToast('Updated in Audit Pro only — unified seller corpus sync failed.', 'error')
      setSuppliers(suppliers.map((s) => (s.id === editSupplierId ? row : s)))
      closeSupplierPanel()
      notifyWorkspaceKeyDirty('audit_pro', true)
      return
    }
    setSuppliers(suppliers.map((s) => (s.id === editSupplierId ? row : s)))
    notifyWorkspaceKeyDirty('audit_pro', true)
    showToast('Supplier updated — linked audit plans keep the same supplier; details refreshed everywhere.')
    closeSupplierPanel()
  }

  const removeSupplierRow = (sRow) => {
    const n = audits.filter((a) => a.supplierId === sRow.id).length
    if (n > 0 && !window.confirm(`This supplier is used on ${n} audit plan(s). Remove anyway?`)) return
    setSuppliers(suppliers.filter((x) => x.id !== sRow.id))
    notifyWorkspaceKeyDirty('audit_pro', true)
    if (editSupplierId === sRow.id) closeSupplierPanel()
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
        <Btn onClick={openRegister}>
          + Register Supplier
        </Btn>
      </div>
      {showPanel && (
        <Card
          title={panelMode === 'edit' ? 'Edit supplier / auditee' : 'Register Supplier'}
          icon="◉"
          style={{ marginBottom: 18 }}
        >
          {panelMode === 'edit' ? (
            <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginTop: -6, marginBottom: 14 }}>
              Updates appear on Audit Plans, Conduct, and reports. Planned audits stay linked by supplier id —
              you only change master data here.
            </p>
          ) : null}
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
            <Btn onClick={saveSupplierPanel} variant="success">
              {panelMode === 'edit' ? 'Save changes' : 'Save'}
            </Btn>
            <Btn onClick={closeSupplierPanel} variant="secondary">
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
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(sRow)}
                        style={{ background: 'var(--ap-panel-3)', border: '1px solid var(--ap-border)', color: 'var(--ap-text)', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontSize: 11 }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSupplierRow(sRow)}
                        style={{ background: '#7F1D1D15', border: 'none', color: '#F87171', borderRadius: 6, padding: '3px 9px', cursor: 'pointer', fontSize: 11 }}
                      >
                        Remove
                      </button>
                    </div>
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
