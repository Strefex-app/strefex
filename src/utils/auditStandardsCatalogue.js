import { AUDIT_SCORING_ANCHORS, getQuestionnaire, getTotalQuestions } from '../data/auditManagementDetailedData'
import {
  STANDARD_INDUSTRY_FILTERS,
  STANDARD_MODULES,
  moduleByName,
  modulesForIndustry,
} from '../data/auditIndustryStandards'
import { fieldQuestionnaireForName } from '../data/auditFieldQuestionnaires'

export { STANDARD_INDUSTRY_FILTERS, STANDARD_MODULES, modulesForIndustry }

export function isSpecialProcessStandard(name) {
  return /nadcap|special process|ndt|heat treat|coating|iso 3834/i.test(String(name || ''))
}

export function standardFamilyLabel(name) {
  const mod = moduleByName(name)
  if (mod?.family) return mod.family
  const s = String(name || '')
  if (/^ISO/i.test(s)) return 'ISO'
  if (/^IATF/i.test(s)) return 'IATF'
  if (/^VDA/i.test(s)) return 'VDA'
  if (/^AS9|EN 9100/i.test(s)) return 'IAQG'
  if (/^EU |MDR|Machinery CE/i.test(s)) return 'EU'
  if (/^IEC/i.test(s)) return 'IEC'
  if (isSpecialProcessStandard(s)) return 'Nadcap-aligned'
  return 'STREFEX'
}

export function uniqueAuditStandards() {
  return STANDARD_MODULES.map((row) => ({
    ...row,
    standard: row.name,
    industries: row.industries,
    special: row.id === 'special-process' || row.id === 'iso-3834',
  }))
}

export function standardMatchesFilter(row, filterId) {
  if (!filterId || filterId === 'ALL') return true
  return (row.industries || []).includes(filterId)
}

export function questionnaireForStandard(row, language = 'en') {
  const name = row?.standard || row?.name
  const field = fieldQuestionnaireForName(name)
  if (field?.length) return field
  return getQuestionnaire(name, 'Manufacturing / Quality', language) || []
}

export function flattenQuestionnaireRows(questionnaire = []) {
  const rows = []
  for (const section of questionnaire || []) {
    for (const q of section.questions || []) {
      const docs = Array.isArray(q.docs) ? q.docs.filter(Boolean) : []
      const rawClause = String(q.isoRef || q.iatfRef || q.checklistNo || q.clause || q.reference || section.clause || '').trim()
      const clause = rawClause.split(/[·,;/]| and /)[0].trim() || '—'
      rows.push({
        id: q.id,
        clause,
        element: String(section.section || q.element || '').trim() || '—',
        text: q.text,
        lookAt: q.lookAt || q.examples,
        reference: q.reference,
        docs,
      })
    }
  }
  return rows
}

export function catalogueEntryWithCounts(row, language = 'en') {
  const questionnaire = questionnaireForStandard(row, language)
  return {
    ...row,
    standard: row.standard || row.name,
    family: row.family || standardFamilyLabel(row.standard || row.name),
    questionnaire,
    questionCount: getTotalQuestions(questionnaire),
    sectionCount: questionnaire.length,
    scoring: AUDIT_SCORING_ANCHORS,
    lead: row.lead || 'STREFEX-authored questions mapped to clause references. The requirement text of the issuing body is not reproduced.',
    structure: row.structure || (questionnaire.map((s) => s.section).filter(Boolean).slice(0, 8).join(' · ') || 'Clause-mapped field questions.'),
  }
}

export function questionnaireFormCode(standard) {
  const raw = String(standard || 'STD')
  let h = 0
  for (let i = 0; i < raw.length; i += 1) h = (h * 31 + raw.charCodeAt(i)) | 0
  const n = String(1 + (Math.abs(h) % 24)).padStart(2, '0')
  const slug = raw.replace(/:\d{4}/g, '').replace(/[^A-Za-z0-9]+/g, '').slice(0, 10).toUpperCase() || 'STD'
  return `SQ-C${n} · ${slug} rev 6`
}

export function chunkQuestionnairePages(rows = [], size = 8) {
  const out = []
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size))
  return out.length ? out : [[]]
}

/** Cover sheet (header + first questions), continuation sheets (questions only), closing signatures. */
export function questionnairePrintSheets(rows = [], coverSize = 4, contSize = 8) {
  const list = Array.isArray(rows) ? rows : []
  const sheets = [{ kind: 'cover', questions: list.slice(0, coverSize) }]
  chunkQuestionnairePages(list.slice(coverSize), contSize)
    .filter((chunk) => chunk.length)
    .forEach((questions) => sheets.push({ kind: 'cont', questions }))
  sheets.push({ kind: 'sign', questions: [] })
  return sheets
}

export function standardsReferredByAuditor(auditor, catalogue = []) {
  const needles = [
    ...(auditor?.certifications || []),
    ...(auditor?.standards || []),
  ].map((s) => String(s || '').toLowerCase()).filter(Boolean)
  if (!needles.length) return []
  return (catalogue || []).filter((row) => {
    const name = String(row.standard || row.name || '').toLowerCase()
    const stem = name.replace(/:\d{4}.*$/, '')
    return needles.some((n) => n.includes(stem) || name.includes(n) || n.includes(name) || stem.includes(n))
  })
}

export function industryStandardsCatalogue(filterId, language = 'en') {
  return modulesForIndustry(filterId).map((row) => catalogueEntryWithCounts({
    ...row,
    standard: row.name,
  }, language))
}
