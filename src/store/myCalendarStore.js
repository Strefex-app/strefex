import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getTenantId, getUserId } from '../utils/tenantStorage'
import { normalizeDateStr } from '../utils/platformCalendarEvents'

const calendarStorage = createJSONStorage(() => ({
  getItem: (name) => {
    try {
      return localStorage.getItem(`${name}::${getTenantId()}::${getUserId()}`)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(`${name}::${getTenantId()}::${getUserId()}`, value)
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(`${name}::${getTenantId()}::${getUserId()}`)
    } catch {
      /* ignore */
    }
  },
}))

/** @typedef {'event'|'reminder'|'meeting'} PersonalCalendarKind */

const KINDS = new Set(['event', 'reminder', 'meeting'])

/**
 * Per-profile calendar (scoped by company tenant + signed-in user email).
 */
export const useMyCalendarStore = create(
  persist(
    (set) => ({
      /** @type {Array<{ id: string, date: string, kind: PersonalCalendarKind, title: string, detail?: string, timeLabel?: string, createdAt: string }>} */
      entries: [],

      addEntry: ({ date, kind, title, detail, timeLabel }) => {
        const d = normalizeDateStr(date) || ''
        if (!d) return null
        const id = `mycal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const k = KINDS.has(kind) ? kind : 'event'
        const entry = {
          id,
          date: d,
          kind: k,
          title: String(title || '').trim() || 'Untitled',
          detail: String(detail || '').trim(),
          timeLabel: String(timeLabel || '').trim(),
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ entries: [...s.entries, entry] }))
        return id
      },

      updateEntry: (id, patch) => {
        set((s) => ({
          entries: s.entries.map((e) => {
            if (e.id !== id) return e
            const next = { ...e, ...patch }
            if (patch.date != null) {
              const nd = normalizeDateStr(patch.date)
              next.date = nd || e.date
            }
            if (patch.title != null) next.title = String(patch.title).trim() || e.title
            if (patch.detail != null) next.detail = String(patch.detail).trim()
            if (patch.timeLabel != null) next.timeLabel = String(patch.timeLabel).trim()
            if (patch.kind != null && KINDS.has(patch.kind)) next.kind = patch.kind
            return next
          }),
        }))
      },

      removeEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
    }),
    {
      name: 'strefex-my-calendar',
      storage: calendarStorage,
      partialize: (s) => ({ entries: s.entries }),
    },
  ),
)
