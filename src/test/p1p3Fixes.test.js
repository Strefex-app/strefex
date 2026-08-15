import { describe, expect, it } from 'vitest'
import { reportSyncError, useSyncStatusStore } from '../store/syncStatusStore'
import { useVirtualWindow } from '../components/VirtualTableBody'
import { renderHook } from '@testing-library/react'

describe('syncStatusStore', () => {
  it('records and clears the last sync error', () => {
    reportSyncError('Workspace sync unavailable', 'workspace')
    expect(useSyncStatusStore.getState().lastError).toBe('Workspace sync unavailable')
    useSyncStatusStore.getState().clearSyncError()
    expect(useSyncStatusStore.getState().lastError).toBe(null)
  })
})

describe('useVirtualWindow', () => {
  it('returns the full list when under the virtualize threshold', () => {
    const rows = Array.from({ length: 10 }, (_, i) => i)
    const { result } = renderHook(() => useVirtualWindow(rows))
    expect(result.current.enabled).toBe(false)
    expect(result.current.items).toHaveLength(10)
  })

  it('windows lists longer than 100 rows', () => {
    const rows = Array.from({ length: 250 }, (_, i) => i)
    const { result } = renderHook(() => useVirtualWindow(rows, { rowHeight: 40, height: 400 }))
    expect(result.current.enabled).toBe(true)
    expect(result.current.items.length).toBeLessThan(250)
    expect(result.current.items.length).toBeGreaterThan(0)
  })
})
