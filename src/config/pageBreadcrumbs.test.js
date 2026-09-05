import { describe, it, expect } from 'vitest'
import { resolvePageBreadcrumb, PAGE_ROOTS } from './pageBreadcrumbs'

describe('pageBreadcrumbs', () => {
  it('resolves management overview', () => {
    const r = resolvePageBreadcrumb('/management')
    expect(r.layout).toBe('global')
    expect(r.root).toEqual({ label: 'Management', to: '/management' })
    expect(r.trail).toEqual([{ label: 'Overview' }])
  })

  it('resolves People cluster trail', () => {
    const r = resolvePageBreadcrumb('/management/people')
    expect(r.layout).toBe('global')
    expect(r.trail).toEqual([
      { label: 'Overview', to: '/management' },
      { label: 'People', to: '/management/people' },
    ])
  })

  it('uses own-chrome layout for Home and Sourcing only', () => {
    expect(resolvePageBreadcrumb('/main-menu').layout).toBe('custom')
    expect(resolvePageBreadcrumb('/hub/procurement').layout).toBe('custom')
    expect(resolvePageBreadcrumb('/management/sourcing/intelligence').layout).toBe('global')
    expect(resolvePageBreadcrumb('/management/ops/projects/new-project').layout).toBe('global')
  })

  it('falls back for unknown app routes', () => {
    const r = resolvePageBreadcrumb('/some-unknown-tool')
    expect(r.layout).toBe('global')
    expect(r.root).toEqual(PAGE_ROOTS.home)
    expect(r.trail[0].label).toBe('Some Unknown Tool')
  })

  it('resolves Team Management full hierarchy', () => {
    const r = resolvePageBreadcrumb('/management/people/team')
    expect(r.layout).toBe('global')
    expect(r.trail).toEqual([
      { label: 'Overview', to: '/management' },
      { label: 'People', to: '/management/people' },
      { label: 'Team Management' },
    ])
  })

  it('resolves legacy /team path to canonical breadcrumb', () => {
    const r = resolvePageBreadcrumb('/team')
    expect(r.trail[2]).toEqual({ label: 'Team Management' })
  })

  it('resolves cost calculator nested trail under finance cluster', () => {
    const r = resolvePageBreadcrumb('/management/finance/cost/calculator')
    expect(r.trail[0]).toEqual({ label: 'Overview', to: '/management' })
    expect(r.trail[1]).toEqual({ label: 'Finance', to: '/management/finance' })
    expect(r.trail[2]).toEqual({ label: 'Cost Management', to: '/management/finance/cost' })
    expect(r.trail[3].label).toBe('Product Cost Calculator')
  })

  it('returns null for auth pages', () => {
    expect(resolvePageBreadcrumb('/login')).toBeNull()
  })
})
