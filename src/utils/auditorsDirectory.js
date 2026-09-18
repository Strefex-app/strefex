export const AUDITORS_DIRECTORY_PATH = '/management/contracts-compliance/auditors'
export const AUDITORS_DIRECTORY_ALIAS = '/management/auditors'

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

export function sellerCategoryLabel(supplier) {
  const industry = String(supplier?.industry || '').trim()
  return industry || 'Uncategorized'
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
