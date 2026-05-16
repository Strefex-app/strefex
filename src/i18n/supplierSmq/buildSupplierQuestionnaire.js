import supplierAuditChecklistRu from '../../data/supplierAuditChecklistRu.json'
import { LANGUAGE_CODES } from '../languages'

import { mergeOverlayParts } from './mergeOverlayParts'

import enSec from './overlays/en.sections.json'
import enQ1 from './overlays/en.q1.json'
import enQ2 from './overlays/en.q2.json'

import zhSec from './overlays/zh.sections.json'
import zhText from './localeText/zh.text.json'

import esSec from './overlays/es.sections.json'
import esText from './localeText/es.text.json'

import frSec from './overlays/fr.sections.json'
import frText from './localeText/fr.text.json'

import deSec from './overlays/de.sections.json'
import deText from './localeText/de.text.json'

import ptSec from './overlays/pt.sections.json'
import ptText from './localeText/pt.text.json'

const overlayEn = mergeOverlayParts(enSec, enQ1, enQ2)

function overlayFromEnWithFlatText(sections, textById) {
  const questions = {}
  for (const id of Object.keys(overlayEn.questions)) {
    const base = overlayEn.questions[id]
    const t = textById[id]
    questions[id] =
      t !== undefined && t !== null && t !== ''
        ? { ...base, text: typeof t === 'string' ? t : String(t) }
        : { ...base }
  }
  return { sections, questions }
}

const OVERLAYS_BY_LANG = {
  en: overlayEn,
  zh: overlayFromEnWithFlatText(zhSec, zhText),
  es: overlayFromEnWithFlatText(esSec, esText),
  fr: overlayFromEnWithFlatText(frSec, frText),
  de: overlayFromEnWithFlatText(deSec, deText),
  pt: overlayFromEnWithFlatText(ptSec, ptText),
}

function normalizeSupplierLang(language) {
  const c = String(language || 'en').trim().toLowerCase()
  if (c === 'ru') return 'ru'
  return LANGUAGE_CODES.includes(c) ? c : 'en'
}

function pickOverlay(lang) {
  return OVERLAYS_BY_LANG[normalizeSupplierLang(lang)] ?? overlayEn
}

function mergeRuWithOverlay(rawSections, overlay) {
  const enFallback = overlayEn
  return rawSections.map((sec) => {
    const clause = String(sec.clause)
    const title = overlay.sections?.[clause] ?? enFallback.sections?.[clause] ?? sec.section

    const questions = (sec.questions || []).map((q) => {
      const ov = overlay.questions?.[q.id]
      const fv = enFallback.questions?.[q.id]
      return {
        ...q,
        text: ov?.text ?? fv?.text ?? q.text,
        examples: ov?.examples ?? fv?.examples ?? q.examples,
        docs: ov?.docs != null ? ov.docs : fv?.docs != null ? fv.docs : [...(q.docs || [])],
      }
    })

    return { ...sec, section: title, questions }
  })
}

function mapToConductShape(sec) {
  return {
    section: sec.section,
    clause: String(sec.clause),
    questions: (sec.questions || []).map((q) => ({
      id: q.id,
      checklistNo: q.checklistNo,
      text: q.text,
      reference: q.reference,
      isoRef: q.isoRef,
      iatfRef: q.iatfRef,
      examples: q.examples,
      docs: q.docs,
      weight: 2,
    })),
  }
}

/**
 * Supplier SMQ checklist (IATF 16949:2016 & ISO 9001:2015) in UI language.
 */
export function buildSupplierSmqQuestionnaireForLanguage(language) {
  const lang = normalizeSupplierLang(language)
  const raw = supplierAuditChecklistRu
  if (lang === 'ru') return raw.map(mapToConductShape)
  const overlay = pickOverlay(lang)
  return mergeRuWithOverlay(raw, overlay).map(mapToConductShape)
}

export function normalizeSupplierQuestionnaireLang(language) {
  return normalizeSupplierLang(language)
}
