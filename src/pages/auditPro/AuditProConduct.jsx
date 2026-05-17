import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import useAuditProStore, { auditHasConductProgress } from '../../store/auditProStore'
import { auditProUid } from '../../utils/auditProUid'
import {
  Btn,
  Card,
  Field,
  FINDING_TYPES,
  getQuestionnaire,
  getTotalQuestions,
  Grid2,
  InfoRow,
  Input,
  Select,
  StatusBadge,
  Tag,
  Textarea,
  getQuestionnaireVerdictPreset,
  VERDICT_PRESET_SUPPLIER_RU_SCORE,
} from './auditProUi'
import { useTranslation } from '../../i18n/useTranslation'
import { notifyWorkspaceKeyDirty } from '../../services/workspaceCloudSync'
import useAuditStore from '../../store/auditStore'
import AuditProOfficialReport from './auditProOfficialReport'

const ISO_VERDICT_OPTIONS = ['Conforms', 'Minor NC', 'Major NC', 'N/A', 'Observation']

/** Балл по чек-листу (NA / 1–3): подпись как в шаблоне Excel. */
const SUPPLIER_VERDICT_OPTIONS = [
  { value: 'NA', short: 'Н/Д', label: 'Не применимо' },
  { value: '1', short: '1', label: 'Не выполняется' },
  { value: '2', short: '2', label: 'Не в полном объёме' },
  { value: '3', short: '3', label: 'Полностью' },
]

const vColor = {
  Conforms: '#10B981',
  'Minor NC': '#F59E0B',
  'Major NC': '#EF4444',
  'N/A': '#6B7280',
  Observation: '#3B82F6',
  NA: '#6B7280',
  '1': '#EF4444',
  '2': '#F59E0B',
  '3': '#10B981',
}

function supplierScoreBtnBg(sel, v) {
  if (sel !== v) return '#1A2535'
  if (v === 'NA') return '#1F2937'
  if (v === '1') return '#7F1D1D'
  if (v === '2') return '#78350F'
  return '#065F46'
}

function supplierScoreBtnFg(sel, v) {
  if (sel !== v) return '#4B5563'
  if (v === 'NA') return '#9CA3AF'
  if (v === '1') return '#FCA5A5'
  if (v === '2') return '#FCD34D'
  return '#6EE7B7'
}

const CONDUCT_TABS = new Set(['info', 'questionnaire', 'findings', 'report'])

const CAPA_DAYS_DEFAULT = 30

function defaultCapaDueDate() {
  const d = new Date()
  d.setDate(d.getDate() + CAPA_DAYS_DEFAULT)
  return d.toISOString().slice(0, 10)
}

/** Builds/updates findings from questionnaire verdicts (linked via `fromResponseKey`). */
function syncFindingsFromQuestionnaire({ conduct, questionnaire, responses, verdictPreset }) {
  const manual = (conduct.findings || []).filter((f) => !f.fromResponseKey)
  const prevQ = new Map((conduct.findings || []).filter((f) => f.fromResponseKey).map((f) => [f.fromResponseKey, f]))
  const fromQ = []
  const supplierMode = verdictPreset === VERDICT_PRESET_SUPPLIER_RU_SCORE
  if (!questionnaire?.length) return [...manual]

  questionnaire.forEach((sec, si) => {
    sec.questions?.forEach((q, qi) => {
      const k = `${si}-${qi}`
      const r = responses[k]
      const v = r?.verdict
      let type = null
      if (supplierMode) {
        if (v === '1') type = 'Major NC'
        else if (v === '2') type = 'Minor NC'
      } else if (v === 'Major NC' || v === 'Minor NC') {
        type = v
      }
      if (type) {
        const prev = prevQ.get(k)
        const rawNotes = r?.notes != null ? String(r.notes).trim() : ''
        const desc = rawNotes || (q.text || '').slice(0, 500) || 'Nonconformity'
        fromQ.push({
          id: prev?.id || auditProUid(),
          fromResponseKey: k,
          type,
          description: desc,
          reference: q.reference || '',
          section: [sec.section, sec.clause].filter(Boolean).join(' — ') || sec.section || '—',
          status: 'Open',
          dueDate: prev?.dueDate || defaultCapaDueDate(),
          responsibleParty: prev?.responsibleParty || '',
        })
      }
    })
  })
  return [...manual, ...fromQ]
}

/** Drops orphan CAPA reminders and adds rows for open questionnaire NC findings with due dates. */
function rebuildNcReminders(auditId, standard, nextFindings, allReminders) {
  const nextFindingIds = new Set((nextFindings || []).map((f) => f.id))
  let out = (allReminders || []).filter((r) => {
    if (r.auditId !== auditId) return true
    if (!r.findingId) return true
    return nextFindingIds.has(r.findingId)
  })
  const qcOpen = (nextFindings || []).filter(
    (f) =>
      f.fromResponseKey &&
      f.status === 'Open' &&
      (f.type === 'Major NC' || f.type === 'Minor NC') &&
      f.dueDate,
  )
  const have = new Set(out.filter((r) => r.auditId === auditId && r.findingId).map((r) => r.findingId))
  for (const f of qcOpen) {
    if (have.has(f.id)) continue
    out = [
      ...out,
      {
        id: auditProUid(),
        auditId,
        findingId: f.id,
        title: `CAPA follow-up: ${(f.description || 'NC').slice(0, 52)}${(f.description || '').length > 52 ? '…' : ''} (${standard})`,
        dueDate: f.dueDate,
        status: 'Open',
        type: 'finding_due',
      },
    ]
  }
  return out
}

function countSectionNc(responses, si, nQuestions, verdictPreset) {
  let maj = 0
  let min = 0
  const supplierMode = verdictPreset === VERDICT_PRESET_SUPPLIER_RU_SCORE
  for (let qi = 0; qi < (nQuestions || 0); qi++) {
    const v = responses?.[`${si}-${qi}`]?.verdict
    if (supplierMode) {
      if (v === '1') maj += 1
      if (v === '2') min += 1
    } else {
      if (v === 'Major NC') maj += 1
      if (v === 'Minor NC') min += 1
    }
  }
  return { maj, min }
}

function countGlobalNc(responses, verdictPreset) {
  let maj = 0
  let min = 0
  if (!responses) return { maj, min }
  const supplierMode = verdictPreset === VERDICT_PRESET_SUPPLIER_RU_SCORE
  Object.values(responses).forEach((r) => {
    const v = r?.verdict
    if (supplierMode) {
      if (v === '1') maj += 1
      if (v === '2') min += 1
    } else {
      if (v === 'Major NC') maj += 1
      if (v === 'Minor NC') min += 1
    }
  })
  return { maj, min }
}

export default function AuditProConduct() {
  const { auditId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const qnParam = searchParams.get('qn')
  const secParam = searchParams.get('sec')
  const findingFocus = searchParams.get('finding')
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)
  const audits = useAuditProStore((s) => s.audits)
  const replaceAudit = useAuditProStore((s) => s.replaceAudit)
  const setReminders = useAuditProStore((s) => s.setReminders)
  const addAuditLog = useAuditProStore((s) => s.addAuditLog)
  const completeAudit = useAuditProStore((s) => s.completeAudit)
  const showToast = useAuditProStore((s) => s.showToast)
  const { language } = useTranslation()

  const [tab, setTab] = useState('info')
  const [local, setLocal] = useState(null)
  const [newF, setNewF] = useState({
    section: '',
    type: 'Minor NC',
    description: '',
    reference: '',
    status: 'Open',
    dueDate: '',
    responsibleParty: '',
  })
  const [showFF, setShowFF] = useState(false)
  /** Draft text for "Add follow-up" per finding id (CAPA / closure notes after audit complete). */
  const [followUpDraft, setFollowUpDraft] = useState({})
  const [expanded, setExpanded] = useState({})
  /** When set for index `si`, overrides default fold (completed sections start folded). */
  const [clauseExpandedOverride, setClauseExpandedOverride] = useState({})
  const sectionRefs = useRef({})

  const base = audits.find((a) => String(a?.id ?? '').trim() === String(auditId ?? '').trim())

  const resolvedTab = tabParam && CONDUCT_TABS.has(tabParam) ? tabParam : tab
  const questionnaireMode =
    resolvedTab === 'questionnaire' ? (qnParam === 'list' ? 'list' : 'score') : null

  const goConductSearch = useCallback(
    (next) => {
      if (!auditId) return
      const p = new URLSearchParams()
      Object.entries(next).forEach(([k, v]) => {
        if (v != null && v !== '') p.set(k, String(v))
      })
      navigate(`/management/auditors/conduct/${auditId}?${p}`, { replace: true })
    },
    [auditId, navigate],
  )

  const goTab = useCallback(
    (t) => {
      setTab(t)
      if (t === 'questionnaire') {
        goConductSearch({ tab: 'questionnaire', qn: 'list' })
      } else {
        goConductSearch({ tab: t })
      }
    },
    [goConductSearch],
  )

  useEffect(() => {
    if (!base) {
      setLocal(null)
      return
    }
    const qn = getQuestionnaire(base.standard, base.auditType)
    const vp = getQuestionnaireVerdictPreset(base.standard)
    const responses = { ...(base.responses || {}) }
    const stub = {
      ...base,
      findings: [...(base.findings || [])],
      responses,
    }
    const findingsMerged = syncFindingsFromQuestionnaire({
      conduct: stub,
      questionnaire: qn,
      responses,
      verdictPreset: vp,
    })
    setLocal({
      ...base,
      findings: findingsMerged,
      responses,
    })
    setExpanded({})
    setClauseExpandedOverride({})
    setTab(tabParam && CONDUCT_TABS.has(tabParam) ? tabParam : 'info')
    const nextRem = rebuildNcReminders(base.id, base.standard, findingsMerged, useAuditProStore.getState().reminders)
    setReminders(nextRem)
  }, [auditId, base, tabParam, language])

  useEffect(() => {
    if (questionnaireMode !== 'score' || secParam == null || secParam === '') return
    const si = Number.parseInt(secParam, 10)
    if (Number.isNaN(si)) return
    setClauseExpandedOverride((prev) => ({ ...prev, [si]: true }))
    const id = window.requestAnimationFrame(() => {
      sectionRefs.current[si]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [questionnaireMode, secParam, auditId])

  /** Deep-link from dashboard reminders: switch to Findings tab when `finding` is in the URL. */
  useEffect(() => {
    if (!findingFocus || !auditId) return
    if (tabParam === 'findings') return
    navigate(`/management/auditors/conduct/${auditId}?tab=findings&finding=${encodeURIComponent(findingFocus)}`, {
      replace: true,
    })
  }, [findingFocus, auditId, tabParam, navigate])

  useEffect(() => {
    if (!findingFocus || resolvedTab !== 'findings') return
    const domId = `ap-finding-${findingFocus}`
    const tid = window.setTimeout(() => {
      const el = document.getElementById(domId)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ap-finding--pulse')
      window.setTimeout(() => el.classList.remove('ap-finding--pulse'), 2200)
    }, 300)
    return () => window.clearTimeout(tid)
  }, [findingFocus, resolvedTab, auditId])

  /** Flush persisted row when hiding tab / leaving page — helps after connection drops mid-edit. */
  useEffect(() => {
    if (!auditId) return
    const id = String(auditId)
    const flush = () => {
      const row = useAuditProStore.getState().audits.find((a) => String(a?.id ?? '') === id)
      if (!row || row.status === 'Cancelled') return
      useAuditProStore.getState().replaceAudit(row)
      notifyWorkspaceKeyDirty('audit_pro', true)
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [auditId])

  if (!auditId || !base) {
    return <Navigate to="/management/auditors/plans" replace />
  }

  /** Before useEffect clones into `local`, use store row so first paint doesn't redirect via !local */
  const conduct = local ?? {
    ...base,
    findings: [...(base.findings || [])],
    responses: { ...(base.responses || {}) },
  }

  const auditor = auditors.find((a) => a.id === conduct.auditorId)
  const secondaryAuditor = auditors.find((a) => a.id === conduct.secondaryAuditorId)
  const supplier = suppliers.find((s) => s.id === conduct.supplierId)
  const questionnaire = getQuestionnaire(conduct.standard, conduct.auditType, language)
  const verdictPreset = getQuestionnaireVerdictPreset(conduct.standard)
  const totalQ = getTotalQuestions(questionnaire)
  const answered = (questionnaire || []).reduce(
    (acc, sec, si) =>
      acc + (sec.questions || []).reduce((a, _, qi) => a + (conduct.responses?.[`${si}-${qi}`]?.verdict ? 1 : 0), 0),
    0,
  )
  const pct = totalQ ? Math.round((answered / totalQ) * 100) : 0

  const save = (updated) => {
    let next = { ...updated }
    if (['Planned', 'Draft'].includes(next.status) && auditHasConductProgress(next)) {
      next = { ...next, status: 'In Progress' }
    }
    next = { ...next, lastProgressSavedAt: new Date().toISOString() }
    setLocal(next)
    replaceAudit(next)
  }

  const appendFindingFollowUp = (findingId, rawNote) => {
    const note = String(rawNote || '').trim()
    if (!note) {
      showToast('Enter a note for this record.', 'error')
      return
    }
    const by = auditor?.name || 'Auditor'
    const entry = { at: new Date().toISOString(), note, by }
    save({
      ...conduct,
      findings: (conduct.findings || []).map((x) =>
        x.id === findingId
          ? {
              ...x,
              activityLog: [...(Array.isArray(x.activityLog) ? x.activityLog : []), entry],
            }
          : x,
      ),
    })
    addAuditLog(conduct.id, 'Finding follow-up', by, `${findingId}: ${note.slice(0, 160)}`)
    setFollowUpDraft((d) => ({ ...d, [findingId]: '' }))
    showToast('Follow-up recorded and synced.')
  }

  const setResp = (key, val) => {
    const nextResponses = { ...(conduct.responses || {}), [key]: val }
    const nextFindings = syncFindingsFromQuestionnaire({
      conduct,
      questionnaire,
      responses: nextResponses,
      verdictPreset,
    })
    const nextReminders = rebuildNcReminders(conduct.id, conduct.standard, nextFindings, useAuditProStore.getState().reminders)
    save({ ...conduct, responses: nextResponses, findings: nextFindings })
    setReminders(nextReminders)
  }

  const alignQuestionnaireToConforms = (responseKey) => {
    const resp = conduct.responses?.[responseKey] || {}
    const cleared = verdictPreset === VERDICT_PRESET_SUPPLIER_RU_SCORE ? '3' : 'Conforms'
    setResp(responseKey, { ...resp, verdict: cleared })
  }

  const globalNc = countGlobalNc(conduct.responses, verdictPreset)

  /** All questions answered and no majors/minors in this clause (supplier 1–2 or iso NC). */
  const isClauseFullyCompleteClean = useCallback(
    (si) => {
      const sec = questionnaire?.[si]
      if (!sec?.questions?.length) return true
      const n = sec.questions.length
      const answeredCt =
        sec.questions.filter((_, qi) => conduct.responses?.[`${si}-${qi}`]?.verdict).length || 0
      const { maj, min } = countSectionNc(conduct.responses, si, n, verdictPreset)
      return answeredCt >= n && maj === 0 && min === 0
    },
    [conduct.responses, questionnaire, verdictPreset],
  )

  const isClauseBodyOpen = (si) => {
    const k = clauseExpandedOverride
    const has = Object.prototype.hasOwnProperty.call(k, si)
    if (has) return !!k[si]
    return !isClauseFullyCompleteClean(si)
  }

  const toggleClauseFold = (si) => {
    const next = !isClauseBodyOpen(si)
    setClauseExpandedOverride((o) => ({ ...o, [si]: next }))
  }

  const expandAllClauses = () => {
    const o = {}
    ;(questionnaire || []).forEach((_, si) => {
      o[si] = true
    })
    setClauseExpandedOverride(o)
  }

  const foldFinishedClauses = () => {
    const o = {}
    ;(questionnaire || []).forEach((_, si) => {
      o[si] = !isClauseFullyCompleteClean(si)
    })
    setClauseExpandedOverride(o)
  }

  const addFinding = () => {
    if (!newF.description) {
      showToast('Description required.', 'error')
      return
    }
    const f = { ...newF, id: auditProUid() }
    const updated = { ...conduct, findings: [...(conduct.findings || []), f] }
    save(updated)
    if (f.dueDate) {
      const rList = useAuditProStore.getState().reminders
      setReminders([
        ...rList,
        {
          id: auditProUid(),
          auditId: conduct.id,
          findingId: f.id,
          title: `CAPA Due: ${f.description.slice(0, 55)} (${conduct.standard})`,
          dueDate: f.dueDate,
          status: 'Open',
          type: 'finding_due',
        },
      ])
    }
    addAuditLog(conduct.id, 'Finding Added', auditor?.name || 'Auditor', `${f.type}: ${f.description.slice(0, 80)}`)
    setNewF({
      section: '',
      type: 'Minor NC',
      description: '',
      reference: '',
      status: 'Open',
      dueDate: '',
      responsibleParty: '',
    })
    setShowFF(false)
    showToast('Finding recorded.')
  }

  const handleComplete = () => {
    const done = completeAudit(conduct.id, auditor?.name || 'Auditor')
    if (done) {
      showToast(`Audit complete! Next step scheduled.`)
      notifyWorkspaceKeyDirty('audit_pro', true)
      navigate('/management/auditors/plans')
    }
  }

  /** Persists plan + scoring/findings, writes Audit Pro activity log + platform audit trail, pushes company workspace snapshot. */
  const saveCheckpoint = () => {
    save(conduct)
    const detail = `Questionnaire ${answered}/${totalQ} answered (${pct}%); ${conduct.findings?.length || 0} finding(s).`
    addAuditLog(conduct.id, 'Checkpoint saved', auditor?.name || 'Auditor', detail)
    useAuditStore.getState().addLog({
      module: 'audit_management',
      action: 'audit_checkpoint_saved',
      entity: conduct.id,
      description: `${(conduct.title || 'Audit').slice(0, 90)} — ${detail}`,
      severity: 'info',
      user: auditor?.name || 'Auditor',
      details: { auditId: conduct.id, pct, findings: conduct.findings?.length || 0 },
    })
    notifyWorkspaceKeyDirty('audit_pro', true)
    showToast('Saved to Audit activity logs. Sync pushed to company workspace.')
  }

  const tabs = [
    { id: 'info', label: 'Overview' },
    { id: 'questionnaire', label: `Questionnaire (${pct}% · Maj ${globalNc.maj} · Min ${globalNc.min})` },
    { id: 'findings', label: `Findings (${conduct.findings?.length || 0})` },
    { id: 'report', label: 'Report' },
  ]

  let lastSavedLabel = null
  if (conduct.lastProgressSavedAt) {
    try {
      lastSavedLabel = new Date(conduct.lastProgressSavedAt).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    } catch {
      lastSavedLabel = null
    }
  }

  return (
    <div>
      <div className="ap-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <button
              type="button"
              onClick={() => navigate('/management/auditors/plans')}
              className="ap-text-secondary stx-click-feedback"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-caption)', marginBottom: 5, padding: 0 }}
            >
              ← Back
            </button>
            <div className="stx-text-wrap stx-text-section" style={{ fontWeight: 'var(--font-semibold)', color: 'var(--color-primary)' }}>
              {conduct.title}
            </div>
            <div style={{ display: 'flex', gap: 7, marginTop: 7, flexWrap: 'wrap' }}>
              <Tag color="var(--accent)">{conduct.industry}</Tag>
              <Tag color="var(--rfqi-purple)">{conduct.auditType}</Tag>
              <Tag color="var(--rfqi-amber)">{conduct.standard}</Tag>
              <StatusBadge status={conduct.status} />
              {conduct.isAutoPlanned ? <Tag color="var(--rfqi-teal)">Auto-Planned</Tag> : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {['Planned', 'Draft'].includes(conduct.status) && (
              <Btn
                onClick={() => {
                  const u = { ...conduct, status: 'In Progress' }
                  save(u)
                  addAuditLog(u.id, 'Audit Started', auditor?.name || 'Auditor', 'Audit set to In Progress')
                  showToast('Audit started!')
                  setTab('questionnaire')
                  goConductSearch({ tab: 'questionnaire', qn: 'list' })
                  notifyWorkspaceKeyDirty('audit_pro', true)
                }}
                color="#D97706"
              >
                ▶ Start
              </Btn>
            )}
            {conduct.status === 'In Progress' ? (
              <Btn onClick={handleComplete} variant="success">
                ✓ Complete
              </Btn>
            ) : null}
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 6 }}>
            <span className="stx-text-caption ap-text-muted">Questionnaire completion</span>
            <span className="stx-text-caption" style={{ color: 'var(--accent)', fontWeight: 'var(--font-semibold)' }}>
              {answered}/{totalQ} ({pct}%) ·{' '}
              <span style={{ color: 'var(--danger-text)' }}>Maj {globalNc.maj}</span> ·{' '}
              <span style={{ color: 'var(--callout-warn-text)' }}>Min {globalNc.min}</span>
            </span>
          </div>
          <div style={{ background: 'var(--border-light)', borderRadius: 5, height: 7 }}>
            <div
              style={{
                background: 'var(--accent)',
                width: `${pct}%`,
                height: '100%',
                borderRadius: 5,
                transition: 'width .4s',
              }}
            />
          </div>
        </div>
        <div className="am-conduct-toolbar">
          <Btn onClick={saveCheckpoint} variant="primary">
            Save checkpoint
          </Btn>
          <Btn onClick={() => navigate(`/management/auditors/print/${conduct.id}`)} variant="secondary">
            Print report
          </Btn>
          <span className="stx-text-caption ap-text-muted stx-text-wrap" style={{ flex: '1 1 200px', minWidth: 0 }}>
            Answers and notes autosave locally as you work; reconnecting merges your draft instead of overwriting it when possible.
            From{' '}
            <button
              type="button"
              onClick={() => navigate('/management/auditors/plans')}
              style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 'var(--font-medium)' }}
            >
              Audit Plans
            </button>
            , use <strong style={{ fontWeight: 'var(--font-medium)' }}>Continue audit</strong> anytime. Minor/Major NC on the questionnaire
            opens a CAPA reminder (due in {CAPA_DAYS_DEFAULT} days by default).
          </span>
        </div>
        {lastSavedLabel ? (
          <div className="stx-text-caption ap-text-muted" style={{ marginTop: 10 }}>
            Last saved: {lastSavedLabel}
          </div>
        ) : null}
      </div>

      <div className="ap-card am-conduct-tabs" role="tablist" aria-label="Conduct sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={resolvedTab === t.id}
            onClick={() => goTab(t.id)}
            className={`am-conduct-tab${resolvedTab === t.id ? ' am-conduct-tab--active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {resolvedTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card title="Audit Information" icon="◫">
            <InfoRow label="Standard" value={conduct.standard} />
            <InfoRow label="Planned Date" value={conduct.plannedDate} />
            <InfoRow label="Completed" value={conduct.completedDate || 'Pending'} />
            {conduct.nextAuditDate ? <InfoRow label="Next Audit" value={<span style={{ color: '#34D399', fontWeight: 600 }}>{conduct.nextAuditDate}</span>} /> : null}
            <InfoRow label="Status" value={<StatusBadge status={conduct.status} />} />
            <InfoRow label="Duration" value={`${conduct.auditDays || 1} day(s)`} />
            <InfoRow label="Language" value={conduct.language || 'English'} />
          </Card>
          <Card title="Parties" icon="◉">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--ap-muted)', marginBottom: 5, fontWeight: 700, letterSpacing: '.06em' }}>LEAD AUDITOR</div>
              {auditor ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ap-text)' }}>{auditor.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ap-muted)' }} className="stx-text-wrap">
                    {auditor.role} · {auditor.email}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                    {(auditor.certifications || []).map((c) => (
                      <Tag key={c} color="#1E40AF" small>
                        {c}
                      </Tag>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: '#374151' }}>Not assigned</div>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--ap-border)', paddingTop: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--ap-muted)', marginBottom: 5, fontWeight: 700, letterSpacing: '.06em' }}>SUPPORTING AUDITOR</div>
              {secondaryAuditor ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ap-text)' }}>{secondaryAuditor.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ap-muted)' }} className="stx-text-wrap">
                    {secondaryAuditor.role} · {secondaryAuditor.email}
                  </div>
                </>
              ) : (
                <div style={{ color: '#374151', fontSize: 12 }}>Not assigned</div>
              )}
            </div>
            <div style={{ borderTop: '1px solid var(--ap-border)', paddingTop: 14 }}>
              <div style={{ fontSize: 10, color: 'var(--ap-muted)', marginBottom: 5, fontWeight: 700, letterSpacing: '.06em' }}>SUPPLIER / AUDITEE</div>
              {supplier ? (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ap-text)' }}>{supplier.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ap-muted)' }} className="stx-text-wrap">
                    {supplier.country}
                    {supplier.city ? <> · {supplier.city}</> : null}
                    {supplier.contact ? <> · {supplier.contact}</> : null}
                    {supplier.email ? <> · {supplier.email}</> : null}
                  </div>
                  {supplier.address ? (
                    <div style={{ fontSize: 11, color: '#374151', marginTop: 3 }} className="stx-text-wrap">
                      {supplier.address}
                    </div>
                  ) : null}
                  {supplier.notes ? (
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }} className="stx-text-wrap">
                      {supplier.notes}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="stx-text-caption"
                    style={{
                      marginTop: 8,
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--accent)',
                      fontWeight: 'var(--font-medium)',
                      textDecoration: 'underline',
                      textUnderlineOffset: 3,
                      fontSize: 'var(--text-caption)',
                      display: 'block',
                      textAlign: 'left',
                    }}
                    onClick={() =>
                      navigate(`/management/auditors/suppliers?edit=${encodeURIComponent(supplier.id)}`)
                    }
                  >
                    Update supplier details
                  </button>
                </>
              ) : (
                <div style={{ color: '#374151' }}>Not assigned</div>
              )}
            </div>
          </Card>
          <Card title="Scope" icon="⬡" style={{ gridColumn: '1 / -1' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }} className="stx-text-wrap">
              {conduct.scope || 'No scope defined.'}
            </div>
          </Card>
        </div>
      )}

      {questionnaireMode === 'list' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div className="stx-text-small ap-text-muted" style={{ flex: '1 1 220px', minWidth: 0 }}>
              {verdictPreset === VERDICT_PRESET_SUPPLIER_RU_SCORE ? (
                <>
                  Балл по чек-листу:{' '}
                  <span className="stx-text-body" style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-primary)' }}>
                    Н/Д, 1–3
                  </span>{' '}
                  (см. легенду в режиме оценки). Сворачивайте разделы для обзора; незавершённые остаются развёрнутыми. Откройте оценку по разделам.
                </>
              ) : (
                <>
                  Sections load from the audit standard. Each clause folds for a shorter outline; unfinished clauses stay open.
                  Use{' '}
                  <span className="stx-text-body" style={{ fontWeight: 'var(--font-medium)', color: 'var(--color-primary)' }}>
                    Open scoring
                  </span>{' '}
                  below or open Rank / score to assign conformance per question.
                </>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Btn type="button" onClick={expandAllClauses} variant="secondary">
                Expand all clauses
              </Btn>
              <Btn type="button" onClick={foldFinishedClauses} variant="secondary">
                Show unfinished only
              </Btn>
              <Btn onClick={() => goConductSearch({ tab: 'questionnaire', qn: 'score' })} variant="primary">
                Open ranking (all sections)
              </Btn>
            </div>
          </div>
          {!questionnaire?.length ? (
            <Card title="No questionnaire" icon="⧉">
              <div className="stx-text-body ap-text-muted stx-text-wrap">
                No question set is configured for «{conduct.standard}» ({conduct.auditType}). Adjust industry, audit type, and standard on the audit plan.
              </div>
            </Card>
          ) : (
            [...questionnaire.map((sec, si) => {
                  const n = sec.questions?.length || 0
                  const answeredSec =
                    sec.questions?.filter((_, qi) => conduct.responses?.[`${si}-${qi}`]?.verdict).length || 0
                  const spct = n ? Math.round((answeredSec / n) * 100) : 0
                  const { maj, min } = countSectionNc(conduct.responses, si, n, verdictPreset)
                  return { si, sec, n, answered: answeredSec, spct, maj, min }
                })]
              .sort((a, b) => {
                if (b.maj !== a.maj) return b.maj - a.maj
                if (b.min !== a.min) return b.min - a.min
                return b.spct - a.spct
              })
              .map(({ si, sec, n, answered, spct, maj, min }) => {
                const listExpanded = isClauseBodyOpen(si)
                const listDone = isClauseFullyCompleteClean(si)
                return (
                  <div
                    key={si}
                    className="ap-card stx-text-wrap"
                    style={{ marginBottom: 11, padding: 0, overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <button
                        type="button"
                        aria-expanded={listExpanded}
                        aria-label={listExpanded ? 'Collapse clause' : 'Expand clause'}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleClauseFold(si)
                        }}
                        className="stx-click-feedback"
                        style={{
                          flexShrink: 0,
                          width: 42,
                          border: 'none',
                          borderRight: '1px solid var(--ap-border)',
                          background: 'var(--bg-surface)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'center',
                          paddingTop: 16,
                          color: 'var(--ap-muted)',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            display: 'inline-block',
                            transform: listExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                            transition: 'transform 0.15s ease',
                            fontSize: 'var(--text-caption)',
                          }}
                        >
                          ▼
                        </span>
                      </button>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          goConductSearch({ tab: 'questionnaire', qn: 'score', sec: si })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ')
                            goConductSearch({ tab: 'questionnaire', qn: 'score', sec: si })
                        }}
                        className="stx-click-feedback"
                        style={{
                          cursor: 'pointer',
                          flex: 1,
                          minWidth: 0,
                          padding: '14px 16px',
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                          <div className="stx-text-wrap stx-text-heading" style={{ color: 'var(--color-primary)', marginBottom: 4 }}>
                            {sec.section}
                          </div>
                          <div className="stx-text-caption ap-text-muted">
                            Clause {sec.clause} · {n} question{n === 1 ? '' : 's'} · {answered}/{n} scored
                          </div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {!listDone ? (
                              <Tag color="var(--accent)" small>
                                Continue here
                              </Tag>
                            ) : (
                              <Tag color="var(--badge-success-text)" small>
                                Clause done
                              </Tag>
                            )}
                            {maj > 0 ? (
                              <Tag color="var(--danger-text)" small>
                                Major {maj}
                              </Tag>
                            ) : null}
                            {min > 0 ? (
                              <Tag color="var(--callout-warn-text)" small>
                                Minor {min}
                              </Tag>
                            ) : null}
                          </div>
                        </div>
                        <span
                          className="stx-text-small"
                          style={{
                            color: 'var(--accent)',
                            fontWeight: 'var(--font-semibold)',
                            flexShrink: 0,
                            paddingTop: 2,
                          }}
                        >
                          Open scoring →
                        </span>
                      </div>
                    </div>
                    {listExpanded ? (
                      <div
                        style={{
                          padding: '12px 16px 16px 42px',
                          borderTop: '1px solid var(--ap-border)',
                          background: 'var(--ap-panel-2)',
                        }}
                      >
                        <div className="stx-text-caption ap-text-muted" style={{ marginBottom: 8 }}>
                          Progress ({spct}% complete for this clause)
                        </div>
                        <div style={{ background: 'var(--border-light)', borderRadius: 5, height: 8, maxWidth: 420 }}>
                          <div
                            style={{
                              background: 'var(--accent)',
                              width: `${spct}%`,
                              height: '100%',
                              borderRadius: 5,
                              transition: 'width .3s',
                            }}
                          />
                        </div>
                        <div className="stx-text-caption ap-text-muted" style={{ marginTop: 12 }}>
                          Click the header row above to jump to questionnaire scoring for this clause.
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })
          )}
        </div>
      )}

      {questionnaireMode === 'score' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            <Btn onClick={() => goConductSearch({ tab: 'questionnaire', qn: 'list' })} variant="secondary">
              ← Questionnaire outline
            </Btn>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <Btn type="button" onClick={expandAllClauses} variant="secondary">
                Expand all clauses
              </Btn>
              <Btn type="button" onClick={foldFinishedClauses} variant="secondary">
                Show unfinished only
              </Btn>
              <span className="stx-text-caption ap-text-muted stx-text-wrap" style={{ flex: '1 1 200px', minWidth: 0 }}>
                Tap a clause header to fold or unfold. Incomplete clauses stay open by default so you can see where to continue.
              </span>
            </div>
          </div>
          <p className="stx-text-caption ap-text-muted stx-text-wrap" style={{ marginBottom: 12 }}>
            {verdictPreset === VERDICT_PRESET_SUPPLIER_RU_SCORE
              ? 'Н/Д — не применимо · 1 — не выполняется · 2 — не в полном объёме · 3 — полностью. Разверните строку вопроса для подсказок аудита.'
              : 'Tap a verdict for each question. Expand each question row for audit guidance.'}
          </p>
          {(questionnaire || []).map((sec, si) => {
            const nSec = sec.questions?.length || 0
            const { maj: secMaj, min: secMin } = countSectionNc(conduct.responses, si, nSec, verdictPreset)
            const answeredDone =
              sec.questions?.filter((_, qi) => conduct.responses?.[`${si}-${qi}`]?.verdict).length || 0
            const clauseOpenState = isClauseBodyOpen(si)
            const doneClean = isClauseFullyCompleteClean(si)
            return (
              <div
                key={si}
                id={`am-qsec-${auditId}-${si}`}
                ref={(el) => {
                  sectionRefs.current[si] = el
                }}
                className="stx-text-wrap"
                style={{ background: 'var(--ap-panel)', border: '1px solid var(--ap-border)', borderRadius: 11, marginBottom: 14, overflow: 'hidden' }}
              >
                <button
                  type="button"
                  aria-expanded={clauseOpenState}
                  aria-controls={`am-clause-body-${auditId}-${si}`}
                  id={`am-clause-head-${auditId}-${si}`}
                  onClick={() => toggleClauseFold(si)}
                  className="stx-click-feedback"
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    padding: '13px 16px',
                    background: 'var(--ap-panel-2)',
                    border: 'none',
                    borderBottom: clauseOpenState ? '1px solid var(--ap-border)' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'inherit',
                    font: 'inherit',
                  }}
                >
                  <div style={{ minWidth: 0, flex: '1 1 220px' }} className="stx-text-wrap">
                    <span
                      aria-hidden
                      style={{
                        display: 'inline-block',
                        marginRight: 8,
                        transform: clauseOpenState ? 'rotate(0deg)' : 'rotate(-90deg)',
                        transition: 'transform 0.15s ease',
                        fontSize: 'var(--text-caption)',
                        color: 'var(--ap-muted)',
                      }}
                    >
                      ▼
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 'var(--font-semibold)', color: '#60A5FA' }}>{sec.section}</span>
                    <div style={{ fontSize: 'var(--text-caption)', color: 'var(--ap-muted)', marginTop: 4, paddingLeft: 26 }}>
                      Clause {sec.clause} · {nSec} question{nSec === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexShrink: 0,
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {!doneClean ? (
                      <Tag color="var(--accent)" small>
                        Continue here
                      </Tag>
                    ) : (
                      <Tag color="var(--badge-success-text)" small>
                        Clause done
                      </Tag>
                    )}
                    {secMaj > 0 ? (
                      <span className="stx-text-caption" style={{ color: 'var(--danger-text)', fontWeight: 'var(--font-semibold)' }}>
                        Maj {secMaj}
                      </span>
                    ) : null}
                    {secMin > 0 ? (
                      <span className="stx-text-caption" style={{ color: 'var(--callout-warn-text)', fontWeight: 'var(--font-semibold)' }}>
                        Min {secMin}
                      </span>
                    ) : null}
                    <span className="stx-text-caption" style={{ color: 'var(--ap-muted)', flexShrink: 0 }}>
                      {answeredDone}/{nSec} done
                    </span>
                  </div>
                </button>
                {clauseOpenState ? (
                  <div
                    id={`am-clause-body-${auditId}-${si}`}
                    role="region"
                    aria-labelledby={`am-clause-head-${auditId}-${si}`}
                    style={{ padding: '12px 14px' }}
                  >
                    {sec.questions?.map((q, qi) => {
                      const key = `${si}-${qi}`
                      const resp = conduct.responses?.[key] || {}
                      const isExp = expanded[key]
                      return (
                        <div
                          key={qi}
                          style={{
                            marginBottom: 12,
                            background: '#070D1C',
                            borderRadius: 9,
                            border: `1px solid ${resp.verdict ? `${vColor[resp.verdict] || '#aaa'}45` : 'var(--ap-border)'}`,
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ padding: '11px 13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.55, marginBottom: 5 }} className="stx-text-wrap">
                                  <span style={{ color: '#374151', marginRight: 7, fontSize: 10 }}>
                                    {q.checklistNo ?? `${qi + 1}.`}
                                  </span>
                                  {q.text}
                                </div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    color: '#1E40AF',
                                    background: '#1E3A5F25',
                                    padding: '2px 8px',
                                    borderRadius: 5,
                                    display: 'inline-block',
                                  }}
                                >
                                  📋 {q.reference}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExpanded((e) => ({ ...e, [key]: !e[key] }))}
                                style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: 13, padding: '0 3px', flexShrink: 0 }}
                              >
                                {isExp ? '▲' : '▼'}
                              </button>
                            </div>
                            {isExp && (
                              <div
                                style={{
                                  background: 'var(--ap-panel-2)',
                                  borderRadius: 7,
                                  padding: '10px 12px',
                                  margin: '10px 0',
                                  border: '1px solid var(--ap-border)',
                                }}
                              >
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', marginBottom: 5, letterSpacing: '.05em' }}>
                                  AUDIT GUIDANCE & EXAMPLES
                                </div>
                                <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6, marginBottom: 10 }} className="stx-text-wrap">
                                  {q.examples}
                                </div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', marginBottom: 6, letterSpacing: '.05em' }}>
                                  DOCUMENTS TO REQUEST
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                  {(q.docs || []).map((d, di) => (
                                    <span
                                      key={di}
                                      style={{
                                        background: '#1E3A5F25',
                                        border: '1px solid #1E40AF35',
                                        color: '#93C5FD',
                                        borderRadius: 5,
                                        padding: '2px 7px',
                                        fontSize: 10,
                                      }}
                                    >
                                      📄 {d}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
                              {verdictPreset === VERDICT_PRESET_SUPPLIER_RU_SCORE
                                ? SUPPLIER_VERDICT_OPTIONS.map((o) => (
                                    <button
                                      key={o.value}
                                      type="button"
                                      title={o.label}
                                      onClick={() => setResp(key, { ...resp, verdict: o.value })}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontSize: 'var(--text-small, 11px)',
                                        fontWeight: 500,
                                        background: supplierScoreBtnBg(resp.verdict, o.value),
                                        color: supplierScoreBtnFg(resp.verdict, o.value),
                                        border:
                                          resp.verdict === o.value ? `1px solid ${vColor[o.value] || '#374151'}` : '1px solid #1A2535',
                                      }}
                                    >
                                      {o.short}
                                    </button>
                                  ))
                                : ISO_VERDICT_OPTIONS.map((opt) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setResp(key, { ...resp, verdict: opt })}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        cursor: 'pointer',
                                        fontSize: 'var(--text-small, 11px)',
                                        fontWeight: 500,
                                        background:
                                          resp.verdict === opt
                                            ? opt === 'Conforms'
                                              ? '#065F46'
                                              : opt === 'Major NC'
                                                ? '#7F1D1D'
                                                : opt === 'Minor NC'
                                                  ? '#78350F'
                                                  : opt === 'N/A'
                                                    ? '#1F2937'
                                                    : '#1E3A5F'
                                            : '#1A2535',
                                        color:
                                          resp.verdict === opt
                                            ? opt === 'Conforms'
                                              ? '#6EE7B7'
                                              : opt === 'Major NC'
                                                ? '#FCA5A5'
                                                : opt === 'Minor NC'
                                                  ? '#FCD34D'
                                                  : opt === 'N/A'
                                                    ? '#9CA3AF'
                                                    : '#93C5FD'
                                            : '#4B5563',
                                        border:
                                          resp.verdict === opt ? `1px solid ${vColor[opt] || '#374151'}` : '1px solid #1A2535',
                                      }}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                            </div>
                            <textarea
                              placeholder="Notes, evidence observed, document numbers reviewed…"
                              value={resp.notes || ''}
                              onChange={(e) => setResp(key, { ...resp, notes: e.target.value })}
                              className="ap-textarea"
                              rows={2}
                              style={{ minHeight: 48 }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {resolvedTab === 'findings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#6B7280' }}>
              {(conduct.findings || []).length} finding(s) · {(conduct.findings || []).filter((f) => f.status === 'Open').length} open
            </div>
            <Btn onClick={() => setShowFF((v) => !v)}>
              + Record Finding
            </Btn>
          </div>
          {showFF && (
            <Card title="New Finding" icon="+" style={{ marginBottom: 14 }}>
              <Grid2>
                <Field label="Section / Clause">
                  <Input value={newF.section} onChange={(v) => setNewF((f) => ({ ...f, section: v }))} placeholder="e.g. 8.5.1 – Control Plan" />
                </Field>
                <Field label="Finding Type">
                  <Select value={newF.type} onChange={(v) => setNewF((f) => ({ ...f, type: v }))} options={FINDING_TYPES} />
                </Field>
              </Grid2>
              <Field label="Description *">
                <Textarea value={newF.description} onChange={(v) => setNewF((f) => ({ ...f, description: v }))} placeholder="Evidence, nonconformity detail…" rows={3} />
              </Field>
              <Grid2>
                <Field label="Standard Reference">
                  <Input value={newF.reference} onChange={(v) => setNewF((f) => ({ ...f, reference: v }))} />
                </Field>
                <Field label="Responsible Party">
                  <Input value={newF.responsibleParty} onChange={(v) => setNewF((f) => ({ ...f, responsibleParty: v }))} />
                </Field>
              </Grid2>
              <Grid2>
                <Field label="CAPA Due Date">
                  <Input type="date" value={newF.dueDate} onChange={(v) => setNewF((f) => ({ ...f, dueDate: v }))} />
                </Field>
                <Field label="Status">
                  <Select value={newF.status} onChange={(v) => setNewF((f) => ({ ...f, status: v }))} options={['Open', 'Closed']} />
                </Field>
              </Grid2>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn onClick={addFinding} variant="success">
                  Save Finding
                </Btn>
                <Btn onClick={() => setShowFF(false)} variant="secondary">
                  Cancel
                </Btn>
              </div>
            </Card>
          )}
          {(conduct.findings || []).map((f) => {
            const fc = {
              'Major NC': '#EF4444',
              'Minor NC': '#F59E0B',
              Observation: '#3B82F6',
              'Opportunity for Improvement': '#A78BFA',
              'Positive Finding': '#10B981',
            }
            const isOD = f.dueDate && f.status === 'Open' && new Date(f.dueDate) < new Date(new Date().toISOString().slice(0, 10) + 'T23:59:59')
            return (
              <div
                key={f.id}
                id={`ap-finding-${f.id}`}
                className={findingFocus === f.id ? 'ap-finding--target' : undefined}
                style={{
                  background: `${fc[f.type] || '#374151'}15`,
                  border: `1px solid ${fc[f.type] || '#374151'}60`,
                  borderRadius: 9,
                  padding: 14,
                  marginBottom: 11,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 7, flexWrap: 'wrap' }}>
                      <Tag color={fc[f.type] || '#94A3B8'}>{f.type}</Tag>
                      {f.fromResponseKey ? (
                        <Tag color="#475569" small>
                          Questionnaire
                        </Tag>
                      ) : null}
                      {f.section ? (
                        <Tag color="#475569" small>
                          {f.section}
                        </Tag>
                      ) : null}
                      {f.reference ? (
                        <Tag color="#374151" small>
                          {f.reference}
                        </Tag>
                      ) : null}
                      <Tag color={f.status === 'Closed' ? '#10B981' : '#EF4444'}>{f.status}</Tag>
                      {isOD ? <Tag color="#EF4444">OVERDUE</Tag> : null}
                    </div>
                    <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.55, marginBottom: 5 }} className="stx-text-wrap">
                      {f.description}
                    </div>
                    {Array.isArray(f.activityLog) && f.activityLog.length > 0 ? (
                      <div
                        style={{
                          marginTop: 10,
                          paddingTop: 10,
                          borderTop: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div className="stx-text-caption ap-text-muted" style={{ marginBottom: 6 }}>
                          Follow-up / closure log
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {f.activityLog.map((log, idx) => (
                            <li
                              key={`${String(log.at)}-${idx}`}
                              style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}
                              className="stx-text-wrap"
                            >
                              <span style={{ color: '#64748B' }}>
                                {log.at ? new Date(log.at).toLocaleString() : '—'}
                              </span>
                              {' · '}
                              <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--ap-text)' }}>
                                {log.by || 'Auditor'}:
                              </span>{' '}
                              {log.note}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {conduct.status !== 'Cancelled' ? (
                      <div style={{ marginTop: 10 }}>
                        <Field label="Add follow-up (closure, verification, evidence reference…)">
                          <Textarea
                            value={followUpDraft[f.id] || ''}
                            onChange={(v) => setFollowUpDraft((d) => ({ ...d, [f.id]: v }))}
                            rows={2}
                            placeholder="e.g. Issue closed — effective date verified on site."
                          />
                        </Field>
                        <div style={{ marginTop: 8 }}>
                          <Btn
                            variant="secondary"
                            onClick={() => appendFindingFollowUp(f.id, followUpDraft[f.id])}
                          >
                            Save follow-up record
                          </Btn>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (f.fromResponseKey) {
                          alignQuestionnaireToConforms(f.fromResponseKey)
                          return
                        }
                        save({
                          ...conduct,
                          findings: (conduct.findings || []).map((x) =>
                            x.id === f.id ? { ...x, status: x.status === 'Open' ? 'Closed' : 'Open' } : x,
                          ),
                        })
                      }}
                      style={{ background: '#1A2535', border: 'none', borderRadius: 6, color: '#94A3B8', cursor: 'pointer', padding: '4px 9px', fontSize: 11 }}
                    >
                      {f.status === 'Open' ? 'Close' : 'Reopen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (f.fromResponseKey) {
                          alignQuestionnaireToConforms(f.fromResponseKey)
                          return
                        }
                        save({ ...conduct, findings: (conduct.findings || []).filter((x) => x.id !== f.id) })
                      }}
                      style={{ background: '#7F1D1D20', border: 'none', borderRadius: 6, color: '#F87171', cursor: 'pointer', padding: '4px 8px', fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {!conduct.findings?.length && (
            <div style={{ color: 'var(--ap-muted)', fontSize: 12, padding: '16px 0', textAlign: 'center' }}>No findings yet.</div>
          )}
        </div>
      )}

      {resolvedTab === 'report' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <Btn onClick={() => navigate(`/management/auditors/print/${conduct.id}`)}>
              🖨 Generate Printable Report
            </Btn>
          </div>
          <AuditProOfficialReport audit={conduct} auditor={auditor} supplier={supplier} questionnaire={questionnaire} />
        </div>
      )}
    </div>
  )
}
