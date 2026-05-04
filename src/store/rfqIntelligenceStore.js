import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage } from '../utils/tenantStorage'
import { DEFAULT_INCOMING_RFQS } from '../data/rfqIntelligenceCalc'

export const useRfqIntelligenceStore = create(
  persist(
    (set, get) => ({
      readIncomingIds: [],
      quotes: [],
      /** Last wizard quote tooling (EUR) — used by Enterprise CAPEX bridge */
      lastToolingEUR: 0,
      /** Last calculator snapshot from Calculator tab */
      lastCalculatorSnapshot: null,

      getIncomingList: () => DEFAULT_INCOMING_RFQS,

      unreadIncomingCount: () =>
        DEFAULT_INCOMING_RFQS.filter((r) => !get().readIncomingIds.includes(r.id)).length,

      markIncomingRead: (id) =>
        set((s) =>
          s.readIncomingIds.includes(id)
            ? s
            : { readIncomingIds: [...s.readIncomingIds, id] },
        ),

      saveQuote: (quote) =>
        set((s) => ({
          quotes: [
            {
              ...quote,
              id: quote.id || `QT-${Date.now()}`,
              savedAt: new Date().toISOString(),
            },
            ...s.quotes,
          ],
        })),

      setLastToolingEUR: (n) => set({ lastToolingEUR: typeof n === 'number' ? n : 0 }),

      setLastCalculatorSnapshot: (snap) => set({ lastCalculatorSnapshot: snap }),
    }),
    {
      name: 'strefex-rfq-intelligence',
      storage: createTenantStorage(),
      partialize: (s) => ({
        readIncomingIds: s.readIncomingIds,
        quotes: s.quotes,
        lastToolingEUR: s.lastToolingEUR,
        lastCalculatorSnapshot: s.lastCalculatorSnapshot,
      }),
    },
  ),
)
