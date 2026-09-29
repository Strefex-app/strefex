import { describe, expect, it } from 'vitest'
import {
  buildCapexFromEquipment,
  buildEnterpriseProductsFromCostProducts,
  isRfqIntelligenceSnapshotEmpty,
  MANAGEMENT_IMMEDIATE_KEYS,
} from '../utils/managementCompanyPersist'
import { isForumSnapshotEmpty } from '../utils/forumHub'

describe('management company persist', () => {
  it('covers the management tool snapshot keys', () => {
    expect(MANAGEMENT_IMMEDIATE_KEYS).toEqual(expect.arrayContaining([
      'hr_space',
      'enterprise',
      'production',
      'cost',
      'projects',
      'vendors',
      'procurement',
      'contracts',
      'quality_excellence',
      'iatf_control',
      'audit_pro',
      'rfq_intelligence',
      'forum',
    ]))
  })

  it('rolls production equipment into CAPEX and keeps extra assets', () => {
    const next = buildCapexFromEquipment(
      [{ id: 'eq-1', name: 'CNC Machine 1', type: 'CNC Machining Center' }],
      [
        { id: 'cx-001', name: 'CNC Machine 1', category: 'Equipment', amount: 250000, usefulLife: 10, yearAcquired: 2024, description: 'Kept' },
        { id: 'cx-003', name: 'Building Expansion', category: 'Facilities', amount: 500000, usefulLife: 25, yearAcquired: 2025 },
      ],
    )
    const cnc = next.find((r) => r.name === 'CNC Machine 1')
    const building = next.find((r) => r.name === 'Building Expansion')
    expect(cnc.amount).toBe(250000)
    expect(cnc.id).toBe('cx-001')
    expect(cnc.source).toBe('production')
    expect(building.amount).toBe(500000)
  })

  it('feeds Cost Management products into Enterprise costing rows', () => {
    const next = buildEnterpriseProductsFromCostProducts(
      [{
        id: 'prod-001',
        name: 'Automotive Dashboard Assembly',
        sku: 'ADA-2026-001',
        sellingPrice: 176.67,
        costBreakdown: { materials: 78.5, logistics: 6 },
      }],
      [{
        id: 'prd-keep',
        name: 'Industrial Controller Unit',
        sku: 'ICU-2026-A',
        sellingPrice: 450,
        unitsPerMonth: 850,
        directMaterialCost: 125,
        directLaborHours: 3.5,
        machineHours: 1.8,
        packagingCost: 8.5,
        shippingCost: 12,
      }],
    )
    const fromCost = next.find((r) => r.sku === 'ADA-2026-001')
    const extra = next.find((r) => r.sku === 'ICU-2026-A')
    expect(fromCost.directMaterialCost).toBe(78.5)
    expect(fromCost.sellingPrice).toBe(176.67)
    expect(fromCost.source).toBe('cost_management')
    expect(extra.unitsPerMonth).toBe(850)
  })

  it('treats quotes and forum posts as company data', () => {
    expect(isRfqIntelligenceSnapshotEmpty({ quotes: [] })).toBe(true)
    expect(isRfqIntelligenceSnapshotEmpty({ quotes: [{ id: 'q1' }] })).toBe(false)
    expect(isForumSnapshotEmpty({ announcements: [], lessons: [] })).toBe(true)
    expect(isForumSnapshotEmpty({ announcements: [{ id: 'a1' }] })).toBe(false)
  })
})
