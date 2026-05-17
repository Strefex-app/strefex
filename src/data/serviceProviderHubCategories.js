/**
 * Service Provider Hub categories — aligned with `ServiceHub.jsx` /services paths.
 * IDs are stable for Audit Pro supplier registry and seller corpus sync.
 */
import { PROJECT_MANAGEMENT_SCOPE } from './projectManagementScopeServices'

const SUPPLIER_SERVICE_ITEMS = [
  { id: 'supplier-source', name: 'Supplier Source' },
  { id: 'audit', name: 'Audit' },
  { id: 'trial-run', name: 'Trial Run' },
  { id: 'production-follow-up', name: 'Production Follow Up' },
  { id: 'equipment-acceptance', name: 'Equipment Acceptance' },
]

const QUALITY_SERVICE_ITEMS = [
  { id: 'buy-off', name: 'Buy Off' },
  { id: 'shipment-acceptance', name: 'Shipment Acceptance' },
  { id: 'shipment-documentation', name: 'Shipment Documentation' },
  { id: 'industrialization', name: 'Industrialization' },
]

export const SERVICE_PROVIDER_HUB_GROUPS = [
  {
    id: 'project-management',
    name: 'Project Management',
    description: '2D/3D design, engineering, full project lifecycle',
    items: PROJECT_MANAGEMENT_SCOPE.map((s) => ({
      id: `svc:pm:${s.id}`,
      name: s.label,
    })),
  },
  {
    id: 'supplier-services',
    name: 'Supplier Services',
    description: 'Source, audit, trial run, industrialization & production follow-up',
    items: SUPPLIER_SERVICE_ITEMS.map((s) => ({
      id: `svc:ss:${s.id}`,
      name: s.name,
    })),
  },
  {
    id: 'quality-services',
    name: 'Quality & Compliance',
    description: 'Buy-off, shipment acceptance, documentation & quality control',
    items: QUALITY_SERVICE_ITEMS.map((s) => ({
      id: `svc:qs:${s.id}`,
      name: s.name,
    })),
  },
]

/** Flat list for checkbox grids */
export function getAllServiceProviderCategoryOptions() {
  return SERVICE_PROVIDER_HUB_GROUPS.flatMap((g) =>
    (g.items || []).map((it) => ({ ...it, group: g.name })),
  )
}
