import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'
import useVendorStore from '../../store/vendorStore'
import { useAuthStore } from '../../store/authStore'
import { getAllSuppliersIncludingRegistry } from '../../data/supplierDatabase'
import { getEquipmentCategoriesForIndustry } from '../../data/equipmentCategoriesByIndustry'
import { getProductCategoryCheckboxOptionsForIndustry } from '../../data/productCategoriesByIndustry'
import {
  PLATFORM_HUB_INDUSTRY_META,
  platformSlugFromAuditIndustryLabel,
} from '../../data/platformHubIndustries'
import { SERVICE_PROVIDER_HUB_GROUPS } from '../../data/serviceProviderHubCategories'
import {
  fetchAccountDirectoryRowsAsAuditSuppliers,
  fetchPlatformDirectoryProfilesForSuperadmin,
  getActorCompanyId,
  supplierUniverseRecordToAuditSupplier,
} from '../../services/auditManagementDb'
import { auditProUid } from '../../utils/auditProUid'
import { collectAuditProSuppliersFromAllTenants } from '../../utils/superadminLocalPlatformAggregation'
import { INDUSTRIES, Btn, Card, Field, Grid2, Input, Select, Textarea, Tag } from './auditProUi'
import { useTranslation } from '../../i18n/useTranslation'
import {
  normSellerRegistryEmail as normEmail,
  resolveIndustryIdsFromAuditRow,
  syncAuditSupplierRowToSellerRegistry,
  syncAuditSupplierRowsToSellerRegistry,
} from '../../services/supplierSellerRegistrySync'
import { MarketplaceCatalogVisibilityControl } from '../../components/MarketplaceCatalogVisibilityControl'

const emptyForm = {
  name: '',
  country: '',
  city: '',
  industry: '',
  contact: '',
  email: '',
  address: '',
  equipmentCategoryIds: [],
  productCategoryIds: [],
  serviceCategoryIds: [],
  notes: '',
}

function supplierRowFromStore(sRow) {
  return {
    name: sRow.name || '',
    country: sRow.country || '',
    city: sRow.city || '',
    industry: sRow.industry || '',
    contact: sRow.contact || '',
    email: sRow.email || '',
    address: sRow.address || '',
    equipmentCategoryIds: Array.isArray(sRow.equipmentCategoryIds) ? sRow.equipmentCategoryIds : [],
    productCategoryIds: Array.isArray(sRow.productCategoryIds) ? sRow.productCategoryIds : [],
    serviceCategoryIds: Array.isArray(sRow.serviceCategoryIds) ? sRow.serviceCategoryIds : [],
    notes: sRow.notes || '',
  }
}

export default function AuditProSupplierRegistry() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const audits = useAuditProStore((s) => s.audits)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const setSuppliers = useAuditProStore((s) => s.setSuppliers)
  const showToast = useAuditProStore((s) => s.showToast)
  const mergeSuppliersFromPlatformUniverse = useAuditProStore((s) => s.mergeSuppliersFromPlatformUniverse)
  const vendors = useVendorStore((s) => s.vendors)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const currentTenantId = useAuthStore((s) => s.tenant?.id || '')
  const superadminRole = useAuthStore((s) => s.role === 'superadmin')

  /** `register` = new supplier; `edit` = amend existing row (plans / conduct stay linked by supplier id). */
  const [panelMode, setPanelMode] = useState('register')
  const [editSupplierId, setEditSupplierId] = useState(null)
  const [showPanel, setShowPanel] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [form, setForm] = useState(() => ({ ...emptyForm }))

  const platformIndustrySlug = useMemo(() => {
    const label = String(form.industry || '').trim()
    const fromLabel = platformSlugFromAuditIndustryLabel(label)
    if (fromLabel) return fromLabel
    const raw = label.toLowerCase()
    return resolveIndustryIdsFromAuditRow(raw, [])[0] || null
  }, [form.industry])

  const industrySelectOptions = useMemo(
    () =>
      INDUSTRIES.map((label) => {
        const slug = platformSlugFromAuditIndustryLabel(label)
        const meta = slug ? PLATFORM_HUB_INDUSTRY_META[slug] : null
        let display = label
        if (label === 'Aerospace') display = 'Aerospace (legacy)'
        else if (meta?.tKey) display = t(meta.tKey)
        else if (meta?.label) display = meta.label
        return { value: label, label: display }
      }),
    [t],
  )

  const equipmentCatsForIndustry = useMemo(
    () => (platformIndustrySlug ? getEquipmentCategoriesForIndustry(platformIndustrySlug) : []),
    [platformIndustrySlug],
  )
  const productCatsForIndustry = useMemo(
    () => (platformIndustrySlug ? getProductCategoryCheckboxOptionsForIndustry(platformIndustrySlug) : []),
    [platformIndustrySlug],
  )

  /** Superadmin: show Audit Pro supplier rows stored under other tenant keys in this browser (read-only). */
  const displaySuppliers = useMemo(() => {
    if (!superadminRole) return suppliers
    const seenId = new Set((suppliers || []).map((s) => s.id))
    const out = [...(suppliers || [])]
    for (const { tenantId, supplier } of collectAuditProSuppliersFromAllTenants()) {
      if (!supplier || tenantId === currentTenantId) continue
      const id = `agg-${tenantId}-${supplier.id}`
      if (seenId.has(id)) continue
      const email = normEmail(supplier.email)
      const name = String(supplier.name || '').trim()
      if (email && out.some((r) => normEmail(r.email) === email)) continue
      if (name && out.some((r) => r.name === name && (!email || normEmail(r.email) === email))) continue
      seenId.add(id)
      out.push({
        ...supplier,
        id,
        _peerTenantId: tenantId,
        _readOnlyPeer: true,
        source: supplier.source || 'peer_workspace',
      })
    }
    return out
  }, [suppliers, superadminRole, currentTenantId])

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
        equipmentCategoryIds: [],
        productCategoryIds: [],
        serviceCategoryIds: [],
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

  const bulkMergeMarketplaceRegistry = async () => {
    setImportBusy(true)
    try {
      const before = useAuditProStore.getState().suppliers.length
      await mergeSuppliersFromPlatformUniverse()
      const after = useAuditProStore.getState().suppliers.length
      if (after > before) {
        showToast(`Bulk import: added ${after - before} supplier row(s) (deduped marketplace + optional platform).`)
      } else {
        showToast('No new marketplace rows to add — already linked.', 'error')
      }
    } catch {
      showToast('Bulk import failed.', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <div>
      {isSuperAdmin() ? (
        <Card title="Industry supplier lists & executive summaries" icon="◇" style={{ marginBottom: 16 }}>
          <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginTop: -4, marginBottom: 12 }}>
            Superadmin only: controls whether seeded <strong>marketplace catalog</strong> companies appear in executive
            summaries, industry hub counts, and RFQ matching. Other accounts only see suppliers from vendor master, audit
            registry, B2B directory, and workspace signups.
          </p>
          <MarketplaceCatalogVisibilityControl />
        </Card>
      ) : (
        <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 14 }}>
          Seeded marketplace catalog and bulk marketplace import are limited to <strong>platform superadmin</strong>. Use{' '}
          <strong>Register Supplier</strong>, <strong>vendor master</strong>, or <strong>B2B directory</strong> to manage your audit auditees.
        </p>
      )}

      <p className="stx-text-small" style={{ fontWeight: 'var(--font-semibold)', marginBottom: 8 }}>
        Bulk import into audit registry
      </p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
        <Btn onClick={importDirectoryContacts} variant="success" disabled={importBusy}>
          {importBusy ? 'Loading…' : 'Import B2B directory (Supabase)'}
        </Btn>
        <Btn onClick={importVendorMaster} variant="secondary">
          Import vendor master (your ERP records)
        </Btn>
        {isSuperAdmin() ? (
          <>
            <Btn onClick={importSupplierMarketplaceDatabase} variant="secondary" title="Seeded marketplace directory plus registered sellers and service providers (same corpus as RFQ / maps). Superadmin only.">
              Import marketplace suppliers · sellers
            </Btn>
            <Btn
              onClick={() => void bulkMergeMarketplaceRegistry()}
              variant="secondary"
              disabled={importBusy}
              title="Runs full dedupe merge (marketplace universe + optional platform directory). Superadmin only."
            >
              Bulk merge marketplace registry
            </Btn>
          </>
        ) : null}
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
            <Field label="City / Region">
              <Input value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} placeholder="For maps & executive summary" />
            </Field>
            <Field label={t('home.industries')}>
              <Select
                value={form.industry}
                onChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    industry: v,
                    equipmentCategoryIds: [],
                    productCategoryIds: [],
                    serviceCategoryIds: [],
                  }))
                }
                options={[{ value: '', label: '—' }, ...industrySelectOptions]}
              />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="Contact Person">
              <Input value={form.contact} onChange={(v) => setForm((f) => ({ ...f, contact: v }))} />
            </Field>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            </Field>
          </Grid2>
          <Field label="Site Address">
            <Input value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} />
          </Field>
          {platformIndustrySlug ? (
            <div style={{ marginBottom: 16, marginTop: 4, paddingTop: 14, borderTop: '1px solid var(--ap-border)' }}>
              <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 14 }}>
                Equipment and product taxonomy matches Product &amp; Equipment hubs; service lines match{' '}
                <strong style={{ fontWeight: 'var(--font-medium)' }}>Service Providers</strong>
                {' '}on Home. Selected items sync into the unified seller registry for summaries and browsing.
              </p>

              <div style={{ marginBottom: 18 }}>
                <div
                  className="stx-text-small"
                  style={{ fontWeight: 'var(--font-semibold)', color: 'var(--ap-text)', marginBottom: 10 }}
                >
                  Equipment categories
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '8px 12px',
                    alignItems: 'start',
                  }}
                >
                  {equipmentCatsForIndustry.map((c) => (
                    <label
                      key={c.id}
                      className="stx-text-caption stx-text-wrap"
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', minWidth: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={form.equipmentCategoryIds.includes(c.id)}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            equipmentCategoryIds: f.equipmentCategoryIds.includes(c.id)
                              ? f.equipmentCategoryIds.filter((x) => x !== c.id)
                              : [...f.equipmentCategoryIds, c.id],
                          }))
                        }
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      <span className="stx-text-wrap">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div
                  className="stx-text-small"
                  style={{ fontWeight: 'var(--font-semibold)', color: 'var(--ap-text)', marginBottom: 10 }}
                >
                  Product &amp; component categories (families &amp; sub-processes)
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '8px 12px',
                    alignItems: 'start',
                  }}
                >
                  {productCatsForIndustry.map((c) => (
                    <label
                      key={c.id}
                      className="stx-text-caption stx-text-wrap"
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', minWidth: 0 }}
                    >
                      <input
                        type="checkbox"
                        checked={form.productCategoryIds.includes(c.id)}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            productCategoryIds: f.productCategoryIds.includes(c.id)
                              ? f.productCategoryIds.filter((x) => x !== c.id)
                              : [...f.productCategoryIds, c.id],
                          }))
                        }
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      <span className="stx-text-wrap">
                        {c.kind === 'sub' ? (
                          <>
                            <span style={{ opacity: 0.75 }}>{c.parentLabel} · </span>
                            {c.name}
                          </>
                        ) : (
                          <span style={{ fontWeight: 'var(--font-semibold)' }}>{c.name}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div
                  className="stx-text-small"
                  style={{ fontWeight: 'var(--font-semibold)', color: 'var(--ap-text)', marginBottom: 10 }}
                >
                  Service provider categories
                </div>
                {SERVICE_PROVIDER_HUB_GROUPS.map((group) => (
                  <div key={group.id} style={{ marginBottom: 14 }}>
                    <div className="stx-text-caption stx-text-wrap" style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-muted)', marginBottom: 4 }}>
                      {group.name}
                    </div>
                    <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ margin: '0 0 8px 0', lineHeight: 1.45 }}>
                      {group.description}
                    </p>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: '8px 12px',
                        alignItems: 'start',
                      }}
                    >
                      {(group.items || []).map((it) => (
                        <label
                          key={it.id}
                          className="stx-text-caption stx-text-wrap"
                          style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer', minWidth: 0 }}
                        >
                          <input
                            type="checkbox"
                            checked={form.serviceCategoryIds.includes(it.id)}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                serviceCategoryIds: f.serviceCategoryIds.includes(it.id)
                                  ? f.serviceCategoryIds.filter((x) => x !== it.id)
                                  : [...f.serviceCategoryIds, it.id],
                              }))
                            }
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <span className="stx-text-wrap">{it.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 12 }}>
              Choose {t('home.industries').toLowerCase()} to unlock equipment, product/component, and service category links aligned with the main platform hubs.
            </p>
          )}
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
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: 'var(--ap-muted)', fontWeight: 700, letterSpacing: '.05em', borderBottom: '1px solid var(--ap-border)' }}>
                Supplier
              </th>
              {superadminRole ? (
                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: 'var(--ap-muted)', fontWeight: 700, letterSpacing: '.05em', borderBottom: '1px solid var(--ap-border)' }}>
                  Workspace
                </th>
              ) : null}
              {['Country', 'Industry', 'Contact', 'Email', 'Audits', 'Findings', 'Registered', ''].map((h) => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, color: 'var(--ap-muted)', fontWeight: 700, letterSpacing: '.05em', borderBottom: '1px solid var(--ap-border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displaySuppliers.map((sRow) => {
              const sa = audits.filter((a) => a.supplierId === sRow.id)
              const sf = sa.reduce((n, a) => n + (a.findings?.length || 0), 0)
              const readOnly = !!sRow._readOnlyPeer
              return (
                <tr key={sRow.id} className="ap-hovrow" style={{ borderBottom: '1px solid #0F1A2E' }}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--ap-text)', fontWeight: 500 }} className="stx-text-wrap">
                    {sRow.name}
                  </td>
                  {superadminRole ? (
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#94A3B8' }} className="stx-text-wrap">
                      {readOnly ? (
                        <Tag color="#64748B" small title={sRow._peerTenantId || ''}>
                          Peer
                        </Tag>
                      ) : (
                        <span style={{ opacity: 0.85 }}>This workspace</span>
                      )}
                    </td>
                  ) : null}
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
                      {readOnly ? (
                        <span className="stx-text-caption" style={{ color: '#64748B' }}>
                          View only
                        </span>
                      ) : (
                        <>
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
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!displaySuppliers.length && (
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
