import { create } from 'zustand'

/**
 * Last workspace / persist failure for a retry banner.
 * Stores should call reportSyncError instead of swallowing errors.
 */
export const useSyncStatusStore = create((set) => ({
  lastError: null,
  source: null,
  reportSyncError: (message, source = 'sync') => {
    const text = String(message || 'Sync failed').trim() || 'Sync failed'
    set({ lastError: text, source })
  },
  clearSyncError: () => set({ lastError: null, source: null }),
}))

export function reportSyncError(message, source) {
  useSyncStatusStore.getState().reportSyncError(message, source)
}
