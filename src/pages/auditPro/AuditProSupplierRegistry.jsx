import { useMemo, useState } from 'react'
import useAuditProStore from '../../store/auditProStore'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'
import { useAuthStore } from '../../store/authStore'
import { auditProUid } from '../../utils/auditProUid'
import { collectAuditProSuppliersFromAllTenants } from '../../utils/superadminLocalPlatformAggregation'
import AuditProSupplierHub from './AuditProSupplierHub'
import { INDUSTRIES, Btn, Card, Field, Grid2, Input, Select } from './auditProUi'
import { useTranslation } from '../../i18n/useTranslation'
import { filterAuditProSuppliersForVisibility } from '../../data/auditProDemoKit'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import {
  normSellerRegistryEmail as normEmail,
  syncAuditSupplierRowToSellerRegistry,
} from '../../services/supplierSellerRegistrySync'

const emptyForm = {
  name: '',
  country: '',
  city: '',
  industry: '',
  contact: '',
  email: '',
  notes: '',
}

export default function AuditProSupplierRegistry() {
  const { language } = useTranslation()
  const audits = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const setSuppliers = useAuditProStore((s) => s.setSuppliers)
  const showToast = useAuditProStore((s) => s.showToast)
  const currentTenantId = useAuthStore((s) => s.tenant?.id || '')
  const superadminRole = useAuthStore((s) => s.role === 'superadmin')
  const showDemoKit = useAuditProDemoKitVisible()
  const [showPanel, setShowPanel] = useState(false)
  const [form, setForm] = useState(() => ({ ...emptyForm }))

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

  const suppliersForUi = useMemo(
    () => filterAuditProSuppliersForVisibility(displaySuppliers, showDemoKit),
    [displaySuppliers, showDemoKit],
  )

  const closePanel = () => {
    setShowPanel(false)
    setForm({ ...emptyForm })
  }

  const saveSupplier = () => {
    if (!form.name || !form.email) {
      showToast('Name and email required.', 'error')
      return
    }
    const row = {
      id: auditProUid(),
      ...form,
      address: '',
      equipmentCategoryIds: [],
      productCategoryIds: [],
      serviceCategoryIds: [],
      registeredAt: new Date().toISOString().slice(0, 10),
      source: 'manual',
    }
    try {
      const r = syncAuditSupplierRowToSellerRegistry(row)
      if (!r.ok) throw new Error(r.reason || 'sync failed')
    } catch {
      showToast('Saved in Audit Pro only — seller database sync failed.', 'error')
      setSuppliers([...suppliers, row])
      closePanel()
      notifyWorkspaceKeyDirty('audit_pro', true)
      return
    }
    setSuppliers([...suppliers, row])
    notifyWorkspaceKeyDirty('audit_pro', true)
    showToast('Supplier registered.')
    closePanel()
  }

  return (
    <div className="ap-suphub-page">
      {showPanel ? (
        <Card title="Register supplier" style={{ marginBottom: 18 }}>
          <Grid2>
            <Field label="Supplier name *">
              <Input value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            </Field>
            <Field label="Email *">
              <Input type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="Country">
              <Input value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} />
            </Field>
          </Grid2>
          <Grid2>
            <Field label="Industry">
              <Select
                value={form.industry}
                onChange={(v) => setForm((f) => ({ ...f, industry: v }))}
                options={[{ value: '', label: '—' }, ...INDUSTRIES.map((label) => ({ value: label, label }))]}
              />
            </Field>
            <Field label="Contact">
              <Input value={form.contact} onChange={(v) => setForm((f) => ({ ...f, contact: v }))} />
            </Field>
          </Grid2>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn onClick={saveSupplier}>Save</Btn>
            <Btn variant="secondary" onClick={closePanel}>Cancel</Btn>
          </div>
        </Card>
      ) : null}

      <AuditProSupplierHub
        suppliers={suppliersForUi}
        audits={audits}
        auditors={auditors}
        language={language}
        superadminRole={superadminRole}
        onRegister={() => setShowPanel(true)}
        onRemind={(row) => {
          showToast(`Reminder sent to ${row.supplier?.email || row.name} for questionnaire due ${row.dueBack || 'soon'}.`)
        }}
      />
    </div>
  )
}
