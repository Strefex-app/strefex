/** Semantic status labels for project control UI (Procore / SAP-style pills). */

export function quoteStatusMeta(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'signed') return { label: 'Signed', tone: 'success' }
  if (s === 'received') return { label: 'Received', tone: 'info' }
  if (s === 'sent') return { label: 'Sent', tone: 'info' }
  if (s === 'rejected') return { label: 'Rejected', tone: 'danger' }
  if (s === 'expired') return { label: 'Expired', tone: 'muted' }
  return { label: s || 'Draft', tone: 'muted' }
}

export function poStatusMeta(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved' || s === 'completed') return { label: 'Approved', tone: 'success' }
  if (s.startsWith('pending')) return { label: 'Pending approval', tone: 'warning' }
  if (s === 'rejected') return { label: 'Rejected', tone: 'danger' }
  return { label: s || '—', tone: 'muted' }
}

export function stageMeta(stage) {
  const s = String(stage || 'charter').toLowerCase()
  const map = {
    idea: 'Idea',
    charter: 'Charter',
    baseline: 'Baseline',
    execute: 'Execute',
    monitor: 'Monitor',
    closed: 'Closed',
    active: 'Active',
  }
  return { label: map[s] || stage, tone: s === 'closed' ? 'muted' : 'info' }
}

export function ragMeta(rag) {
  const r = String(rag || 'green').toLowerCase()
  if (r === 'red') return { label: 'At risk', tone: 'danger' }
  if (r === 'amber') return { label: 'Watch', tone: 'warning' }
  return { label: 'On track', tone: 'success' }
}
