/**
 * Keeps Vendor Master aligned with PM / Procurement counterparty names.
 * New suppliers from quotations are registered as potential vendors and linked.
 */
import useVendorStore from '../store/vendorStore'

function normName(value) {
  return String(value || '').trim().toLowerCase()
}

function findVendorByName(vendors, name) {
  const nn = normName(name)
  if (!nn) return null
  return vendors.find(
    (v) => normName(v.general?.companyName) === nn || normName(v.general?.legalName) === nn,
  ) || null
}

function logVendorEvent({ isNew, vendor, name, context }) {
  try {
    import('../store/auditStore').then(({ default: useAuditStore }) => {
      useAuditStore.getState().addLog?.({
        user: 'System',
        role: 'system',
        module: 'vendor-master',
        action: isNew ? 'vendor_auto_register' : 'vendor_link',
        entity: vendor.vendorNumber || vendor.id,
        description: isNew
          ? `Potential vendor registered from ${context.source || 'procurement'}: ${name}`
          : `Linked vendor ${name} to ${context.refLabel || context.refType || 'procurement'}`,
        details: {
          vendorId: vendor.id,
          refId: context.refId,
          refType: context.refType,
          projectId: context.projectId,
        },
      })
    }).catch(() => {})
  } catch {
    /* audit log optional */
  }
}

/**
 * @param {string} companyName
 * @param {object} [context]
 * @returns {{ vendorId: string, vendorNumber: string, vendorName: string, isNew: boolean } | null}
 */
export function ensureVendorFromProcurement(companyName, context = {}) {
  const name = String(companyName || '').trim()
  if (!name) return null

  const store = useVendorStore.getState()
  let vendor = context.vendorId ? store.getVendorById(context.vendorId) : null
  if (!vendor) vendor = findVendorByName(store.vendors, name)

  let isNew = false
  if (!vendor) {
    vendor = store.addVendor({
      general: {
        companyName: name,
        legalName: name,
        country: '',
        currency: 'USD',
        industry: ['general'],
        categories: [],
        relationshipStage: 'potential',
        registrationSource: context.source || 'procurement',
      },
    })
    isNew = true
  }

  const connection = {
    type: context.refType || context.source || 'procurement',
    refId: context.refId || '',
    refLabel: context.refLabel || '',
    module: context.module || 'procurement',
    projectId: context.projectId || '',
    programId: context.programId || '',
  }

  if (connection.refId) {
    const dup = (vendor.connections || []).some(
      (c) => c.refId === connection.refId && c.type === connection.type,
    )
    if (!dup) store.addConnection(vendor.id, connection)
  }

  logVendorEvent({ isNew, vendor, name, context })

  return {
    vendorId: vendor.id,
    vendorNumber: vendor.vendorNumber,
    vendorName: vendor.general?.companyName || name,
    isNew,
  }
}

export function resolveVendorDisplay(vendors, { vendorId, vendorName, vendorNumber } = {}) {
  if (vendorId) {
    const v = vendors.find((row) => row.id === vendorId)
    if (v) {
      return {
        vendorId: v.id,
        vendorNumber: v.vendorNumber || vendorNumber || '—',
        supplier: v.general?.companyName || vendorName || '—',
        vendorStatus: v.status || '',
      }
    }
  }
  if (vendorName && vendorName !== '—') {
    const v = findVendorByName(vendors, vendorName)
    if (v) {
      return {
        vendorId: v.id,
        vendorNumber: v.vendorNumber || vendorNumber || '—',
        supplier: v.general?.companyName || vendorName,
        vendorStatus: v.status || '',
      }
    }
  }
  return {
    vendorId: vendorId || null,
    vendorNumber: vendorNumber || '—',
    supplier: vendorName || '—',
    vendorStatus: '',
  }
}
