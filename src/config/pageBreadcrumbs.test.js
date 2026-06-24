import { describe, it, expect } from 'vitest'
import { resolvePageBreadcrumb, PAGE_ROOTS } from './pageBreadcrumbs'

describe('pageBreadcrumbs', () => {
  it('resolves management overview', () => {
    const r = resolvePageBreadcrumb('/management')
    expect(r.layout).toBe('global')
    expect(r.root).toEqual(PAGE_ROOTS.management)
    expect(r.trail).toEqual([{ label: 'Overview' }])
  })

  it('resolves RFQ as custom layout (page owns breadcrumb)', () => {
    const r = resolvePageBreadcrumb('/management/rfq/new')
    expect(r.layout).toBe('custom')
  })

  it('resolves cost calculator nested trail', () => {
    const r = resolvePageBreadcrumb('/cost-management/calculator')
    expect(r.trail[0]).toEqual({ label: 'Cost Management', to: '/cost-management' })
    expect(r.trail[1].label).toBe('Product Cost Calculator')
  })

  it('returns null for auth pages', () => {
    expect(resolvePageBreadcrumb('/login')).toBeNull()
  })
})
