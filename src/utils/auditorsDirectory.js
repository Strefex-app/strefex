import { formatDisplayLabel } from './displayLabel'

export const AUDITORS_DIRECTORY_PATH = '/management/contracts-compliance/auditors'
export const AUDITORS_DIRECTORY_ALIAS = '/management/auditors'

/** Compact audit operations screens. */
export const AUDITORS_SOP_NAV = [
  { label: 'Supplier pool', leaf: 'pool', view: '', to: `${AUDITORS_DIRECTORY_PATH}/pool`, superadminOnly: true },
  { label: 'Calendar', leaf: 'calendar', view: '', to: `${AUDITORS_DIRECTORY_PATH}/calendar`, badgeReminders: true },
  { label: 'Panel', leaf: 'auditors', view: '', to: `${AUDITORS_DIRECTORY_PATH}/auditors` },
  { label: 'Records', leaf: 'suppliers', view: 'records', to: `${AUDITORS_DIRECTORY_PATH}/suppliers?view=records` },
]

const RECORD_LEAVES = new Set(['suppliers', 'record', 'findings', 'print'])

export function auditorsSopView(search = '') {
  return new URLSearchParams(String(search).startsWith('?') ? String(search).slice(1) : search).get('view') || ''
}

export function isAuditorsSopNavActive(item, pathname = '', search = '') {
  const leaf = auditorsHubLeaf(pathname)
  if (item.leaf === 'suppliers' && item.view === 'records') {
    return RECORD_LEAVES.has(leaf)
  }
  if (item.leaf === 'calendar') {
    return leaf === 'calendar' || leaf === '' || leaf === 'conduct'
  }
  if (item.leaf === 'pool') return leaf === 'pool'
  if (item.leaf === 'auditors') return leaf === 'auditors' || leaf === 'standards'
  return false
}

export function isAuditorsHubPath(pathname = '') {
  const p = String(pathname).split('?')[0]
  return (
    p === AUDITORS_DIRECTORY_ALIAS
    || p.startsWith(`${AUDITORS_DIRECTORY_ALIAS}/`)
    || p === AUDITORS_DIRECTORY_PATH
    || p.startsWith(`${AUDITORS_DIRECTORY_PATH}/`)
  )
}

export function auditorsHubLeaf(pathname = '') {
  const p = String(pathname).split('?')[0]
  const match = p.match(/\/auditors\/?(.*)$/)
  if (!match) return ''
  return (match[1] || '').split('/').filter(Boolean)[0] || ''
}

import { formatDisplayLabel } from './displayLabel'

export function sellerCategoryLabel(supplier) {
  const industry = String(supplier?.industry || '').trim()
  return formatDisplayLabel(industry || 'Uncategorized')
}

export function groupSellersByCategory(suppliers = []) {
  const map = new Map()
  for (const seller of suppliers) {
    const cat = sellerCategoryLabel(seller)
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat).push(seller)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function plannedAuditsByCategory(audits = [], suppliers = []) {
  const byId = new Map((suppliers || []).map((s) => [s.id, s]))
  const map = new Map()
  for (const audit of audits) {
    if (!audit?.plannedDate) continue
    const supplier = byId.get(audit.supplierId)
    const cat = sellerCategoryLabel(supplier || { industry: audit.industry })
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat).push(audit)
  }
  for (const [, rows] of map) {
    rows.sort((a, b) => String(a.plannedDate).localeCompare(String(b.plannedDate)))
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

export function standardsCatalogue(auditStandards = {}, getQuestionnaire, getTotalQuestions, language = 'en') {
  const rows = []
  for (const [industry, types] of Object.entries(auditStandards)) {
    for (const [auditType, standards] of Object.entries(types || {})) {
      for (const standard of standards || []) {
        const questionnaire = typeof getQuestionnaire === 'function'
          ? getQuestionnaire(standard, auditType, language)
          : []
        const questionCount = typeof getTotalQuestions === 'function'
          ? getTotalQuestions(questionnaire)
          : 0
        rows.push({
          industry,
          auditType,
          standard,
          questionCount,
          sectionCount: questionnaire?.length || 0,
        })
      }
    }
  }
  return rows
}
