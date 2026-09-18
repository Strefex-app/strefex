import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuditProDemoKitVisible } from '../hooks/useAuditProDemoKitVisible'
import { stripAuditProDemoWorkspace } from '../data/auditProDemoKit'

describe('useAuditProDemoKitVisible', () => {
  it('is always false — Demo Kit is retired', () => {
    const { result } = renderHook(() => useAuditProDemoKitVisible())
    expect(result.current).toBe(false)
  })
})

describe('stripAuditProDemoWorkspace', () => {
  it('drops seeded demo suppliers, auditors, and linked audits', () => {
    const auditors = [
      { id: 'a1', name: 'Sofia Marchetti', email: 's.marchetti@auditpro.com' },
      { id: 'a2', name: 'Live Auditor', email: 'live@strefex.com' },
    ]
    const suppliers = [
      { id: 's1', name: 'Nexus Precision GmbH', email: 'k.weber@nexus.de' },
      { id: 's2', name: 'Live Seller', email: 'seller@example.com' },
    ]
    const audits = [
      { id: 'u1', supplierId: 's1', auditorId: 'a1' },
      { id: 'u2', supplierId: 's2', auditorId: 'a2' },
    ]
    const next = stripAuditProDemoWorkspace({
      audits,
      auditors,
      suppliers,
      reminders: [{ id: 'r1', auditId: 'u1' }, { id: 'r2', auditId: 'u2' }],
      auditLogs: [{ id: 'l1', auditId: 'u1' }, { id: 'l2', auditId: 'u2' }],
    })
    expect(next.auditors.map((a) => a.id)).toEqual(['a2'])
    expect(next.suppliers.map((s) => s.id)).toEqual(['s2'])
    expect(next.audits.map((a) => a.id)).toEqual(['u2'])
    expect(next.reminders.map((r) => r.id)).toEqual(['r2'])
    expect(next.auditLogs.map((l) => l.id)).toEqual(['l2'])
  })
})
