/**
 * Buyer request → seller consent for identified account data.
 * Local persist is device-global so demo buyer/seller on one browser share state.
 * When Supabase migration 048 is applied, rows sync to identified_data_disclosures.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isSupabaseConfigured, supabase } from '../config/supabase'

const TABLE = 'identified_data_disclosures'

function newId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}

function pairKey(requesterCompanyId, targetCompanyId) {
  return `${String(requesterCompanyId || '').trim()}::${String(targetCompanyId || '').trim()}`
}

function upsertList(list, row) {
  const key = pairKey(row.requesterCompanyId, row.targetCompanyId)
  const next = (Array.isArray(list) ? list : []).filter(
    (r) => pairKey(r.requesterCompanyId, r.targetCompanyId) !== key,
  )
  next.unshift(row)
  return next
}

async function remoteList() {
  if (!isSupabaseConfigured || !supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(400)
  if (error) return null
  return (data || []).map((r) => ({
    id: r.id,
    requesterCompanyId: r.requester_company_id,
    requesterCompanyName: r.requester_company_name || '',
    requesterEmail: r.requester_email || '',
    targetCompanyId: r.target_company_id,
    targetCompanyName: r.target_company_name || '',
    purpose: r.purpose || 'sourcing',
    status: r.status,
    requestedAt: r.requested_at,
    decidedAt: r.decided_at,
  }))
}

async function remoteUpsert(row) {
  if (!isSupabaseConfigured || !supabase) return false
  const payload = {
    id: row.id,
    requester_company_id: row.requesterCompanyId,
    requester_company_name: row.requesterCompanyName || null,
    requester_email: row.requesterEmail || null,
    target_company_id: row.targetCompanyId,
    target_company_name: row.targetCompanyName || null,
    purpose: row.purpose || 'sourcing',
    status: row.status,
    requested_at: row.requestedAt,
    decided_at: row.decidedAt || null,
  }
  const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'requester_company_id,target_company_id' })
  return !error
}

export const useIdentifiedDataDisclosureStore = create(
  persist(
    (set, get) => ({
      records: [],

      hydrateRemote: async () => {
        const remote = await remoteList()
        if (!Array.isArray(remote)) return
        set({ records: remote })
      },

      getRecord: (requesterCompanyId, targetCompanyId) => {
        const key = pairKey(requesterCompanyId, targetCompanyId)
        return get().records.find((r) => pairKey(r.requesterCompanyId, r.targetCompanyId) === key) || null
      },

      grantedCompanyIdsFor: (requesterCompanyId) => (
        get().records
          .filter((r) => r.requesterCompanyId === requesterCompanyId && r.status === 'granted')
          .map((r) => r.targetCompanyId)
      ),

      incomingFor: (targetCompanyId) => (
        get().records.filter((r) => r.targetCompanyId === targetCompanyId)
      ),

      outgoingFor: (requesterCompanyId) => (
        get().records.filter((r) => r.requesterCompanyId === requesterCompanyId)
      ),

      requestAccess: async ({
        requesterCompanyId,
        requesterCompanyName,
        requesterEmail,
        targetCompanyId,
        targetCompanyName,
        purpose = 'sourcing',
      }) => {
        if (!requesterCompanyId || !targetCompanyId || requesterCompanyId === targetCompanyId) return null
        const existing = get().getRecord(requesterCompanyId, targetCompanyId)
        if (existing?.status === 'granted' || existing?.status === 'pending') return existing
        const row = {
          id: existing?.id || newId(),
          requesterCompanyId,
          requesterCompanyName: requesterCompanyName || '',
          requesterEmail: requesterEmail || '',
          targetCompanyId,
          targetCompanyName: targetCompanyName || '',
          purpose,
          status: 'pending',
          requestedAt: new Date().toISOString(),
          decidedAt: null,
        }
        set({ records: upsertList(get().records, row) })
        await remoteUpsert(row)
        return row
      },

      decide: async (requesterCompanyId, targetCompanyId, status) => {
        const allowed = new Set(['granted', 'denied', 'revoked'])
        if (!allowed.has(status)) return null
        const existing = get().getRecord(requesterCompanyId, targetCompanyId)
        if (!existing) return null
        const row = { ...existing, status, decidedAt: new Date().toISOString() }
        set({ records: upsertList(get().records, row) })
        await remoteUpsert(row)
        return row
      },
    }),
    {
      name: 'strefex-identified-data-disclosures',
      partialize: (s) => ({ records: s.records }),
    },
  ),
)
