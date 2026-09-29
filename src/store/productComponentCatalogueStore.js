/**
 * Product & Component catalogue items added by sellers / superadmin.
 * Local persist plus optional cloud table `product_component_catalogue_items`.
 * Cloud writes skip non-UUID company/user ids so local accounts do not fail Postgres.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isSupabaseConfigured, supabase } from '../config/supabase'
import { useAuthStore } from './authStore'
import {
  asUuid,
  isValidCatalogueItem,
  mergeCatalogueLocalAndRemote,
  newCatalogueItemId,
  normalizeProductCatalogueItem,
  toProductCatalogueCloudRow,
} from '../utils/productComponentCatalogueItem'

async function persistCloud(item) {
  if (!isSupabaseConfigured || !supabase) return
  try {
    const { error } = await supabase.from('product_component_catalogue_items').upsert(
      toProductCatalogueCloudRow(item),
      { onConflict: 'id' },
    )
    if (error && import.meta.env.DEV) console.warn('[product catalogue]', error.message)
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[product catalogue]', err?.message || err)
  }
}

async function deleteCloud(id) {
  if (!isSupabaseConfigured || !supabase) return
  const uuid = asUuid(id)
  if (!uuid) return
  try {
    await supabase.from('product_component_catalogue_items').delete().eq('id', uuid)
  } catch { /* table may not exist yet */ }
}

export const useProductComponentCatalogueStore = create(
  persist(
    (set, get) => ({
      items: [],
      hydratedFromCloud: false,

      itemsForSubcategory: (industryId, categoryId, subcategoryId) => (
        (get().items || []).filter((it) => (
          it.industryId === industryId
          && (!categoryId || it.categoryId === categoryId)
          && it.subcategoryId === subcategoryId
        ))
      ),

      addItem: (raw) => {
        const auth = useAuthStore.getState()
        const item = normalizeProductCatalogueItem({
          ...raw,
          id: raw.id || newCatalogueItemId(),
          companyId: raw.companyId || auth.tenant?.id || null,
          createdBy: raw.createdBy || auth.user?.id || null,
          sellerName: raw.sellerName || auth.tenant?.name || auth.user?.email || '',
        })
        if (!isValidCatalogueItem(item)) return null
        set((s) => ({ items: [item, ...s.items] }))
        void persistCloud(item)
        return item
      },

      removeItem: (id) => {
        set((s) => ({ items: s.items.filter((it) => it.id !== id) }))
        void deleteCloud(id)
      },

      hydrateFromCloud: async () => {
        if (!isSupabaseConfigured || !supabase || get().hydratedFromCloud) return
        try {
          const { data, error } = await supabase
            .from('product_component_catalogue_items')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(2000)
          if (error || !Array.isArray(data)) return
          const remote = data.map(normalizeProductCatalogueItem)
          const local = get().items || []
          set({ items: mergeCatalogueLocalAndRemote(remote, local), hydratedFromCloud: true })
        } catch { /* missing table must not block the app */ }
      },
    }),
    {
      name: 'strefex-product-component-catalogue',
      partialize: (s) => ({ items: s.items }),
    },
  ),
)
