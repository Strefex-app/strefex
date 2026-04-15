import { describe, it, expect, vi, beforeEach } from 'vitest'

const companiesList = vi.fn()

vi.mock('./supabaseService', () => ({
  isSupabaseConfigured: true,
  companiesService: {
    list: (...args) => companiesList(...args),
  },
}))

describe('pagedDirectoryFetch', () => {
  beforeEach(() => {
    companiesList.mockReset()
  })

  it('fetchCompaniesListPaged merges pages until short batch', async () => {
    const { fetchCompaniesListPaged } = await import('./pagedDirectoryFetch')
    companiesList
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      .mockResolvedValueOnce([{ id: 'c' }])
    const out = await fetchCompaniesListPaged({ pageSize: 2, maxRows: 100 })
    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c'])
    expect(companiesList).toHaveBeenCalledTimes(2)
    expect(companiesList.mock.calls[0][0]).toEqual({ limit: 2, offset: 0 })
    expect(companiesList.mock.calls[1][0]).toEqual({ limit: 2, offset: 2 })
  })

  it('fetchGlobalCrudListPaged dedupes by id across pages', async () => {
    const { fetchGlobalCrudListPaged } = await import('./pagedDirectoryFetch')
    const svc = {
      list: vi
        .fn()
        .mockResolvedValueOnce([{ id: '1' }, { id: '2' }])
        .mockResolvedValueOnce([{ id: '1' }, { id: '3' }])
        .mockResolvedValueOnce([]),
    }
    const out = await fetchGlobalCrudListPaged(svc, { orderBy: 'x', ascending: true }, { pageSize: 2, maxRows: 50 })
    expect(out.map((r) => r.id)).toEqual(['1', '2', '3'])
    expect(svc.list).toHaveBeenCalledTimes(3)
  })
})
