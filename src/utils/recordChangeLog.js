import { getUserId } from './tenantStorage'

const SKIP = new Set(['changeLog', 'updatedAt', 'createdAt', '_createdBy', 'ncrIds'])

export function makeLogEntry({
  action = 'updated',
  summary = '',
  changes = [],
  reason = '',
  entityType = '',
  entityId = '',
  entityLabel = '',
  department = '',
} = {}) {
  return {
    id: `cl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    actor: getUserId(),
    action,
    summary: summary || action,
    reason: reason || '',
    changes: Array.isArray(changes) ? changes : [],
    entityType,
    entityId,
    entityLabel,
    department,
  }
}

export function diffFields(before, patch, keys) {
  const list = keys || Object.keys(patch || {})
  return list
    .filter((key) => !SKIP.has(key))
    .map((key) => {
      const oldValue = stringifyLogValue(before?.[key])
      const newValue = stringifyLogValue(patch?.[key])
      if (oldValue === newValue) return null
      return { field: key, oldValue, newValue }
    })
    .filter(Boolean)
}

export function stringifyLogValue(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function applyLoggedPatch(row, patch, { action = 'updated', reason = '', stamp } = {}) {
  const changes = diffFields(row, patch)
  const summary = changes.length
    ? changes.map((c) => c.field).join(', ')
    : action
  const entry = makeLogEntry({
    action,
    summary,
    changes,
    reason,
    entityId: row?.id,
    department: patch.department ?? row?.department ?? '',
  })
  const next = {
    ...patch,
    changeLog: [entry, ...(row?.changeLog || [])],
  }
  return stamp ? stamp(row, next) : { ...row, ...next }
}

export function withCreateLog(row, summary = 'Created') {
  return {
    ...row,
    changeLog: [
      makeLogEntry({
        action: 'created',
        summary,
        entityId: row?.id,
        department: row?.department || '',
      }),
      ...(row?.changeLog || []),
    ],
  }
}

export function collectRecordLogs(records, { type, labelOf } = {}) {
  const rows = []
  ;(records || []).forEach((record) => {
    const label = labelOf ? labelOf(record) : (record.title || record.name || record.lotNumber || record.number || record.id)
    ;(record.changeLog || []).forEach((entry) => {
      rows.push({
        ...entry,
        entityType: entry.entityType || type || '',
        entityId: entry.entityId || record.id,
        entityLabel: entry.entityLabel || label,
        department: entry.department || record.department || '',
      })
    })
  })
  return rows.sort((a, b) => String(b.at).localeCompare(String(a.at)))
}

export function collectDepartmentLogs(name, {
  documents = [],
  lots = [],
  ncrs = [],
  departmentLogs = [],
} = {}) {
  const fromRecords = [
    ...collectRecordLogs(documents, { type: 'document', labelOf: (r) => r.docNumber || r.title }),
    ...collectRecordLogs(lots, { type: 'lot', labelOf: (r) => r.lotNumber }),
    ...collectRecordLogs(ncrs, { type: 'ncr', labelOf: (r) => r.number }),
  ].filter((entry) => !name || entry.department === name)
  const dept = (departmentLogs || []).filter((entry) => (
    !name || entry.department === name || String(entry.summary || '').includes(name)
  ))
  return [...fromRecords, ...dept].sort((a, b) => String(b.at).localeCompare(String(a.at)))
}
