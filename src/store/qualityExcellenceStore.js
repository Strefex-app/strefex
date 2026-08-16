import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createTenantStorage, getUserId, getUserRole } from '../utils/tenantStorage'
import { canEdit as guardCanEdit, filterByCompanyRole, isAuditor } from '../utils/companyGuard'
import { createBlankQualityRecord, getQualityTool } from '../data/qualityExcellenceCatalog'
import { computeQualityRecord } from '../utils/qualityExcellenceCompute'

function newId() {
  return `qe-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const useQualityExcellenceStore = create(
  persist(
    (set, get) => ({
      records: [],

      canEdit: () => guardCanEdit(),
      isReadOnly: () => isAuditor(),
      getAccessLevel: () => getUserRole(),

      getSafeRecords: () => filterByCompanyRole(get().records, { creatorField: '_createdBy' }),

      listByTool: (toolId) => get().getSafeRecords().filter((r) => r.toolId === toolId),

      getById: (id) => get().getSafeRecords().find((r) => r.id === id) || null,

      stats: () => {
        const list = get().getSafeRecords()
        return {
          total: list.length,
          inProgress: list.filter((r) => r.status === 'in_progress').length,
          verified: list.filter((r) => r.status === 'verified' || r.status === 'closed').length,
          toolsUsed: new Set(list.map((r) => r.toolId)).size,
        }
      },

      createRecord: (toolId, patch = {}) => {
        const tool = getQualityTool(toolId)
        if (!tool) return null
        const blank = createBlankQualityRecord(tool)
        const now = new Date().toISOString()
        const record = computeQualityRecord(toolId, {
          id: newId(),
          toolId,
          number: tool.number,
          title: patch.title || blank.fields.title || `${tool.number} record`,
          status: patch.status || blank.fields.status || 'draft',
          fields: { ...blank.fields, ...(patch.fields || {}) },
          tables: { ...blank.tables, ...(patch.tables || {}) },
          createdAt: now,
          updatedAt: now,
          _createdBy: getUserId(),
        })
        if (record.fields.title) record.title = record.fields.title
        if (record.fields.status) record.status = record.fields.status
        set((s) => ({ records: [record, ...s.records] }))
        return record
      },

      updateRecord: (id, patch = {}) => {
        set((s) => ({
          records: s.records.map((row) => {
            if (row.id !== id) return row
            const merged = computeQualityRecord(row.toolId, {
              ...row,
              ...patch,
              fields: { ...(row.fields || {}), ...(patch.fields || {}) },
              tables: { ...(row.tables || {}), ...(patch.tables || {}) },
              updatedAt: new Date().toISOString(),
            })
            if (merged.fields?.title) merged.title = merged.fields.title
            if (merged.fields?.status) merged.status = merged.fields.status
            return merged
          }),
        }))
      },

      deleteRecord: (id) => {
        set((s) => ({ records: s.records.filter((r) => r.id !== id) }))
      },
    }),
    {
      name: 'strefex-quality-excellence',
      storage: createTenantStorage(),
      partialize: (state) => ({ records: state.records }),
    },
  ),
)

export default useQualityExcellenceStore
