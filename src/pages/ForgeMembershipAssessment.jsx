import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ForgeModuleShell from '../components/forge/ForgeModuleShell'
import { forgeSpacePath } from '../constants/forgeSpaceRoutes'
import { notifyForgeHubRefresh } from '../lib/forgeHubEvents'
import { useTranslation } from '../i18n/useTranslation'
import {
  STORE_VER,
  VALUES,
  REF_QUESTIONS,
  STAGE_TABS,
  FLAG_OPTIONS,
  calcStageAvg,
  calcRefAvg,
  calcValueAvg,
  calcComposite,
  colorClass,
  fmt,
  summarizeVotes,
  emptyAssessmentState,
  mergeLoadedState,
} from '../lib/forgeMembershipLogic'
import './ForgeMembershipAssessment.css'
import { loadMembershipAssessmentIndex, saveMembershipAssessmentIndex } from '../lib/forgeMembershipStorage'

const SECTOR_OPTIONS = [
  'Entrepreneur / Founder',
  'Corporate Executive',
  'Investor / VC / PE',
  'Young Professional',
  'Impact / Non-profit',
  'Other',
]

function StarRow({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="forge-msel-star-row">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`forge-msel-star ${n <= shown ? 'forge-msel-star--on' : 'forge-msel-star--off'}`}
          aria-label={`${n} stars`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n === value ? 0 : n)}
        >
          ★
        </button>
      ))}
      <span className="forge-msel-score-num">{value > 0 ? value : '—'}</span>
    </div>
  )
}

function thresholdBadge(n) {
  if (!n) return { text: 'Score pending', cls: 'forge-msel-warn' }
  if (n >= 3.5) return { text: '✓ Above threshold', cls: 'forge-msel-pass' }
  if (n >= 3.0) return { text: '~ Meets threshold', cls: 'forge-msel-warn' }
  return { text: '✕ Below threshold', cls: 'forge-msel-fail' }
}

export default function ForgeMembershipAssessment() {
  const [searchParams] = useSearchParams()
  const caseFromUrl = searchParams.get('case') ?? ''
  const { t } = useTranslation()
  const [shellTab, setShellTab] = useState('assess')
  const [assessmentId, setAssessmentId] = useState(null)
  const [hydrated, setHydrated] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [state, setState] = useState(emptyAssessmentState)
  const saveTimerRef = useRef(null)

  const f = useCallback(
    (key) => state.fields[key] ?? '',
    [state.fields]
  )

  const setField = useCallback((key, val) => {
    setState((s) => ({ ...s, fields: { ...s.fields, [key]: val } }))
  }, [])

  const setStar = useCallback((key, val) => {
    setState((s) => ({ ...s, stars: { ...s.stars, [key]: val } }))
  }, [])

  const setStage = useCallback((n) => {
    setState((s) => ({ ...s, stage: Math.max(0, Math.min(4, n)) }))
  }, [])

  const scores = useMemo(() => {
    const ps = calcStageAvg('ps', state.stars)
    const ref = calcRefAvg(state.stars)
    const intv = calcStageAvg('int', state.stars)
    const composite = calcComposite(ps, ref, intv)
    return { ps, ref, intv, composite }
  }, [state.stars])

  const nomVote = useMemo(
    () => summarizeVotes(state.votesNom, state.memberNames.length),
    [state.votesNom, state.memberNames.length]
  )
  const finalVote = useMemo(
    () => summarizeVotes(state.votesFinal, state.memberNames.length),
    [state.votesFinal, state.memberNames.length]
  )

  const persist = useCallback(
    (id, payload, showIndicator) => {
      if (!id) return
      if (showIndicator) setSaveStatus('saving')
      try {
        const name = (payload.fields?.candidateName || '').trim() || 'Unnamed candidate'
        const composite = calcComposite(
          calcStageAvg('ps', payload.stars || {}),
          calcRefAvg(payload.stars || {}),
          calcStageAvg('int', payload.stars || {})
        )
        const memberTypeRaw = String(payload.fields?.memberType || '').trim()
        const memberType = memberTypeRaw === 'founding' || memberTypeRaw === 'club' ? memberTypeRaw : null
        const row = {
          id,
          name,
          memberType,
          outcome: payload.outcome,
          stage: payload.stage,
          composite: composite ? +composite.toFixed(2) : 0,
          updatedAt: new Date().toISOString(),
        }
        localStorage.setItem(`${STORE_VER}-${id}`, JSON.stringify(payload))
        let index = loadMembershipAssessmentIndex()
        const i = index.findIndex((c) => c.id === id)
        if (i >= 0) index[i] = row
        else index.unshift(row)
        saveMembershipAssessmentIndex(index)
        notifyForgeHubRefresh()
        if (showIndicator) {
          setSaveStatus('saved')
          window.setTimeout(() => setSaveStatus(''), 2200)
        }
      } catch {
        if (showIndicator) setSaveStatus('error')
      }
    },
    []
  )

  useEffect(() => {
    if (!hydrated || !assessmentId) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      persist(assessmentId, state, true)
    }, 700)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [state, assessmentId, hydrated, persist])

  useEffect(() => {
    let cancelled = false
    const caseParam = caseFromUrl || null
    ;(function init() {
      try {
        const index = loadMembershipAssessmentIndex()
        if (index.length) {
          const preferred =
            caseParam && index.some((c) => c.id === caseParam) ? caseParam : index[0].id
          const last = index.find((c) => c.id === preferred) || index[0]
          const raw = localStorage.getItem(`${STORE_VER}-${last.id}`)
          const parsed = raw ? JSON.parse(raw) : null
          if (!cancelled) {
            setAssessmentId(last.id)
            setState(mergeLoadedState(emptyAssessmentState(), parsed))
            setHydrated(true)
            setSaveStatus('saved')
            window.setTimeout(() => setSaveStatus(''), 1800)
          }
        } else {
          const id = `c_${Date.now()}`
          const year = new Date().getFullYear()
          const today = new Date().toISOString().split('T')[0]
          if (!cancelled) {
            setAssessmentId(id)
            setState({
              ...emptyAssessmentState(),
              fields: { nomRef: `NOM-${year}-001`, submitDate: today },
            })
            setHydrated(true)
            setSaveStatus('')
          }
        }
      } catch {
        if (!cancelled) {
          setAssessmentId(`c_${Date.now()}`)
          setState(emptyAssessmentState())
          setHydrated(true)
          setSaveStatus('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [caseFromUrl])

  const openNewAssessment = () => {
    if (!window.confirm(t('forge.confirmNew', 'Start a new assessment? Current work is saved and can be reopened from All Assessments.')))
      return
    const id = `c_${Date.now()}`
    const index = loadMembershipAssessmentIndex()
    const year = new Date().getFullYear()
    const seq = String(index.length + 1).padStart(3, '0')
    const today = new Date().toISOString().split('T')[0]
    setAssessmentId(id)
    setState({
      ...emptyAssessmentState(),
      fields: { nomRef: `NOM-${year}-${seq}`, submitDate: today },
    })
    setManagerOpen(false)
    setSaveStatus('')
  }

  const loadAssessment = (id) => {
    try {
      const raw = localStorage.getItem(`${STORE_VER}-${id}`)
      const parsed = raw ? JSON.parse(raw) : null
      setAssessmentId(id)
      setState(mergeLoadedState(emptyAssessmentState(), parsed))
      setManagerOpen(false)
      setSaveStatus('saved')
      window.setTimeout(() => setSaveStatus(''), 1800)
    } catch {
      /* ignore */
    }
  }

  const deleteAssessment = (id) => {
    if (!window.confirm(t('forge.confirmDelete', 'Delete this assessment? This cannot be undone.'))) return
    try {
      localStorage.removeItem(`${STORE_VER}-${id}`)
      const index = loadMembershipAssessmentIndex().filter((c) => c.id !== id)
      saveMembershipAssessmentIndex(index)
      notifyForgeHubRefresh()
      if (id === assessmentId) {
        if (index.length) loadAssessment(index[0].id)
        else {
          const nid = `c_${Date.now()}`
          const year = new Date().getFullYear()
          setAssessmentId(nid)
          setState({
            ...emptyAssessmentState(),
            fields: { nomRef: `NOM-${year}-001`, submitDate: new Date().toISOString().split('T')[0] },
          })
        }
      }
    } catch {
      /* ignore */
    }
  }

  const resetCurrent = () => {
    if (!window.confirm(t('forge.confirmReset', 'Clear this assessment? It will be removed from saved records.'))) return
    deleteAssessment(assessmentId)
  }

  const globalStatus = useMemo(() => {
    if (state.outcome === 'admit') return { text: 'Admitted', cls: 'forge-msel-badge-proceed' }
    if (state.outcome === 'defer') return { text: 'Deferred', cls: 'forge-msel-badge-review' }
    if (state.outcome === 'decline') return { text: 'Declined', cls: 'forge-msel-badge-hold' }
    return { text: 'In Progress', cls: 'forge-msel-badge-review' }
  }, [state.outcome])

  const candidateLabel = (f('candidateName') || '').trim() || t('forge.noCandidate', 'No candidate entered')

  const profileComplete =
    !!(f('candidateName') || '').trim() && !!(f('memberType') || '').trim() && !!(f('sponsor') || '').trim()

  const checklist = useMemo(() => {
    const fd = state.fields
    return [
      { id: 'c1', done: profileComplete, label: 'Nomination form reviewed' },
      { id: 'c2', done: nomVote.total >= state.memberNames.length, label: 'Group vote on proceeding' },
      { id: 'c3', done: state.stage >= 1, label: 'Pre-screening pack sent' },
      { id: 'c4', done: scores.ps >= 3, label: 'Pre-screening scored ≥ 3.0' },
      { id: 'c5', done: state.stage >= 2, label: 'References contacted' },
      { id: 'c6', done: state.stage >= 3, label: 'Interview conducted' },
      { id: 'c7', done: scores.intv >= 3, label: 'Interview scored ≥ 3.0' },
      { id: 'c8', done: finalVote.total >= state.memberNames.length, label: 'Final vote cast' },
      { id: 'c9', done: !!state.outcome && !!(fd.finalCommDate || '').trim(), label: 'Decision communicated' },
    ]
  }, [
    profileComplete,
    nomVote.total,
    state.stage,
    state.memberNames.length,
    scores.ps,
    scores.intv,
    finalVote.total,
    state.outcome,
    state.fields,
  ])

  const psBadge = thresholdBadge(scores.ps)
  const refBadge = thresholdBadge(scores.ref)
  const intBadge = thresholdBadge(scores.intv)
  const sideBadge = thresholdBadge(scores.composite)

  const renderValueBlock = (v, prefix, showInterviewQ) => (
    <div key={`${prefix}${v.id}`} className="forge-msel-value-block">
      <div className="forge-msel-value-name">{v.name}</div>
      <div className="forge-msel-value-desc">{v.desc}</div>
      {showInterviewQ && v.interviewQ && <div className="forge-msel-interview-q">&ldquo;{v.interviewQ}&rdquo;</div>}
      <StarRow value={state.stars[`${prefix}${v.id}`] || 0} onChange={(n) => setStar(`${prefix}${v.id}`, n)} />
      <div className="forge-msel-field" style={{ marginTop: '0.65rem' }}>
        <textarea
          placeholder="Evidence observed..."
          value={f(`vn_${prefix}${v.id}`)}
          onChange={(e) => setField(`vn_${prefix}${v.id}`, e.target.value)}
        />
      </div>
    </div>
  )

  const savedRows = loadMembershipAssessmentIndex()

  return (
    <AppLayout>
      <ForgeModuleShell
        title={t('forge.membershipTitle', 'Membership onboarding')}
        subtitle={t('forge.membershipSubtitle', 'Nomination through final decision — auto-saves in this browser')}
        tab={shellTab}
        onTab={setShellTab}
        hubBackHref={forgeSpacePath()}
        hubBackLabel={t('forge.backToForge', 'Back to Forge')}
      >
        {shellTab === 'assess' && (
          <div className="forge-msel">
            <header className="forge-msel-app-header">
              <div className="forge-msel-header-inner">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div className="forge-msel-header-brand">
                    <svg className="forge-msel-header-emblem" viewBox="0 0 220 220" fill="none" aria-hidden>
                      <polygon
                        points="110,18 192,63 192,153 110,198 28,153 28,63"
                        fill="none"
                        stroke="#C9A444"
                        strokeWidth="1.5"
                        opacity="0.8"
                      />
                      <circle cx="110" cy="108" r="22" fill="none" stroke="#C9A444" strokeWidth="1" />
                      <polygon
                        points="110,94 114.5,103 125,104.5 117.5,111.5 119.5,122 110,117 100.5,122 102.5,111.5 95,104.5 105.5,103"
                        fill="#C9A444"
                        opacity="0.9"
                      />
                    </svg>
                    <span className="forge-msel-header-wordmark">FORGE</span>
                  </div>
                  <span className="forge-msel-header-sep" />
                  <span className="forge-msel-header-title">{t('forge.headerTool', 'Member selection assessment')}</span>
                </div>
                <div className="forge-msel-header-actions">
                  <span className="forge-msel-save-status" title={t('forge.saveHint', 'Auto-saves in this browser')}>
                    {saveStatus === 'saving' && '● Saving…'}
                    {saveStatus === 'saved' && '✓ Saved'}
                    {saveStatus === 'error' && '⚠ Save failed'}
                    {!saveStatus && hydrated && '·'}
                  </span>
                  <button type="button" className="forge-msel-btn-ghost" onClick={() => setManagerOpen(true)}>
                    {t('forge.allAssessments', 'All Assessments')}
                  </button>
                  <div className="forge-msel-candidate-pill">
                    <strong>{candidateLabel}</strong>
                  </div>
                  <div className={`forge-msel-stage-badge ${globalStatus.cls}`}>{globalStatus.text}</div>
                </div>
              </div>
            </header>

            <nav className="forge-msel-stage-nav" aria-label="Assessment stages">
              <div className="forge-msel-stage-nav-inner">
                {STAGE_TABS.map(({ n, label }) => (
                  <button
                    key={n}
                    type="button"
                    className={`forge-msel-stage-tab ${state.stage === n ? 'forge-msel-stage-tab--active' : ''} ${n < state.stage ? 'forge-msel-stage-tab--done' : ''}`}
                    onClick={() => setStage(n)}
                  >
                    <span className="forge-msel-tab-num">{n + 1}</span>
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            <div className="forge-msel-app-body">
              <div className="forge-msel-main">
                {/* Stage 0 */}
                <div className={`forge-msel-stage-panel ${state.stage === 0 ? 'forge-msel-stage-panel--active' : ''}`}>
                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div>
                        <div className="forge-msel-card-sub">Stage 1 — Nomination Review</div>
                        <div className="forge-msel-card-title">Candidate Profile</div>
                      </div>
                      <div className={`forge-msel-step-inline ${profileComplete ? 'forge-msel-step--done' : 'forge-msel-step--pending'}`}>
                        <span className="forge-msel-step-dot" />
                        {profileComplete ? 'Profile complete' : 'Profile incomplete'}
                      </div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field-grid" style={{ marginBottom: '1rem' }}>
                        <div className="forge-msel-field">
                          <label>Full Name</label>
                          <input
                            value={f('candidateName')}
                            onChange={(e) => setField('candidateName', e.target.value)}
                            placeholder="Candidate full name"
                          />
                        </div>
                        <div className="forge-msel-field">
                          <label>Nomination Reference</label>
                          <input value={f('nomRef')} onChange={(e) => setField('nomRef', e.target.value)} placeholder="NOM-2026-001" />
                        </div>
                      </div>
                      <div className="forge-msel-field-grid-3" style={{ marginBottom: '1rem' }}>
                        <div className="forge-msel-field">
                          <label>Current Title</label>
                          <input value={f('title')} onChange={(e) => setField('title', e.target.value)} placeholder="CEO / Founder…" />
                        </div>
                        <div className="forge-msel-field">
                          <label>Organisation</label>
                          <input value={f('org')} onChange={(e) => setField('org', e.target.value)} placeholder="Company or venture" />
                        </div>
                        <div className="forge-msel-field">
                          <label>Location</label>
                          <input value={f('location')} onChange={(e) => setField('location', e.target.value)} placeholder="City, Country" />
                        </div>
                      </div>
                      <div className="forge-msel-field-grid" style={{ marginBottom: '1rem' }}>
                        <div className="forge-msel-field">
                          <label>Membership Type</label>
                          <select value={f('memberType')} onChange={(e) => setField('memberType', e.target.value)}>
                            <option value="">— Select —</option>
                            <option value="founding">Founding Member</option>
                            <option value="club">Club Member</option>
                          </select>
                        </div>
                        <div className="forge-msel-field">
                          <label>Industry / Sector</label>
                          <select value={f('sector')} onChange={(e) => setField('sector', e.target.value)}>
                            <option value="">— Select —</option>
                            {SECTOR_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="forge-msel-field-grid">
                        <div className="forge-msel-field">
                          <label>Nominating Member</label>
                          <input value={f('sponsor')} onChange={(e) => setField('sponsor', e.target.value)} placeholder="Sponsoring member" />
                        </div>
                        <div className="forge-msel-field">
                          <label>Date Submitted</label>
                          <input type="date" value={f('submitDate')} onChange={(e) => setField('submitDate', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Sponsor&apos;s Case</div>
                      <div className="forge-msel-tooltip-wrap">
                        <span className="forge-msel-tooltip-icon">?</span>
                        <div className="forge-msel-tooltip-text">
                          Capture the nominating member&apos;s rationale from their nomination form before group review.
                        </div>
                      </div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field" style={{ marginBottom: '1rem' }}>
                        <label>Why this person, and why now?</label>
                        <textarea value={f('sponsorWhyNow')} onChange={(e) => setField('sponsorWhyNow', e.target.value)} placeholder="Sponsor's answer…" />
                      </div>
                      <div className="forge-msel-field" style={{ marginBottom: '1rem' }}>
                        <label>What specific value will they add to the group?</label>
                        <textarea value={f('sponsorValueAdd')} onChange={(e) => setField('sponsorValueAdd', e.target.value)} placeholder="Knowledge, network, perspective…" />
                      </div>
                      <div className="forge-msel-field">
                        <label>Strongest observed behaviour</label>
                        <textarea value={f('sponsorBehaviour')} onChange={(e) => setField('sponsorBehaviour', e.target.value)} placeholder="Story of generosity, integrity, courage…" />
                      </div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field" style={{ marginBottom: '1rem' }}>
                        <label>Candidate&apos;s most significant blind spot</label>
                        <textarea value={f('sponsorBlindspot')} onChange={(e) => setField('sponsorBlindspot', e.target.value)} placeholder="Honest growth area…" />
                      </div>
                      <div className="forge-msel-field">
                        <label>Any conflicts of interest or concerns?</label>
                        <textarea value={f('sponsorConflicts')} onChange={(e) => setField('sponsorConflicts', e.target.value)} placeholder="Disputes, reputational notes…" />
                      </div>
                    </div>
                  </div>

                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Group Vote — Proceed to Pre-Screening?</div>
                    </div>
                    <div className="forge-msel-card-body">
                      <p style={{ fontSize: 12, color: 'rgba(245,240,232,.55)', marginBottom: '1rem', lineHeight: 1.65 }}>
                        Each founding member votes independently. Proceed with unanimous or majority agreement (≥ 75% of voting members).
                      </p>
                      <div className="forge-msel-member-grid">
                        {state.memberNames.map((name, idx) => (
                          <div key={idx} className="forge-msel-member-row">
                            <div className="forge-msel-member-name">
                              <input
                                value={name}
                                onChange={(e) => {
                                  const next = [...state.memberNames]
                                  next[idx] = e.target.value
                                  setState((s) => ({ ...s, memberNames: next }))
                                }}
                                placeholder="Member name"
                              />
                            </div>
                            <div className="forge-msel-vote-row">
                              {['proceed', 'defer', 'decline', 'abstain'].map((choice) => (
                                <button
                                  key={choice}
                                  type="button"
                                  className={`forge-msel-vote-btn forge-msel-vote-btn--${choice} ${state.votesNom[idx] === choice ? 'forge-msel-vote-btn--selected' : ''}`}
                                  onClick={() =>
                                    setState((s) => {
                                      const next = { ...s.votesNom }
                                      if (next[idx] === choice) delete next[idx]
                                      else next[idx] = choice
                                      return { ...s, votesNom: next }
                                    })
                                  }
                                >
                                  {choice === 'proceed' ? 'Proceed' : choice === 'defer' ? 'Defer' : choice === 'decline' ? 'Decline' : 'Abstain'}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          marginTop: '1rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid rgba(201,164,68,.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.65rem',
                        }}
                      >
                        <div style={{ fontSize: 13, color: 'rgba(245,240,232,.6)' }}>{nomVote.countLabel}</div>
                        <div className={`forge-msel-stage-badge forge-msel-badge-${nomVote.kind === 'proceed' ? 'proceed' : nomVote.kind === 'hold' ? 'hold' : 'review'}`}>
                          {nomVote.label}
                        </div>
                      </div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field">
                        <label>Group review notes</label>
                        <textarea value={f('nomGroupNotes')} onChange={(e) => setField('nomGroupNotes', e.target.value)} placeholder="Key points from review…" />
                      </div>
                    </div>
                  </div>

                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Screening Flags</div>
                      <div className="forge-msel-tooltip-wrap">
                        <span className="forge-msel-tooltip-icon">?</span>
                        <div className="forge-msel-tooltip-text">Flags are informational — address them before advancing.</div>
                      </div>
                    </div>
                    <div className="forge-msel-flag-row">
                      {FLAG_OPTIONS.map((fl) => (
                        <button
                          key={fl.key}
                          type="button"
                          className={`forge-msel-flag forge-msel-flag--${fl.tone} ${state.flaggedKeys.includes(fl.key) ? 'forge-msel-flag--on' : ''}`}
                          onClick={() =>
                            setState((s) => ({
                              ...s,
                              flaggedKeys: s.flaggedKeys.includes(fl.key) ? s.flaggedKeys.filter((k) => k !== fl.key) : [...s.flaggedKeys, fl.key],
                            }))
                          }
                        >
                          {fl.label}
                        </button>
                      ))}
                    </div>
                    <div className="forge-msel-card-body" style={{ paddingTop: '0.65rem' }}>
                      <div className="forge-msel-field">
                        <label>Flag notes</label>
                        <textarea value={f('flagNotes')} onChange={(e) => setField('flagNotes', e.target.value)} placeholder="Explain any flags…" style={{ minHeight: 56 }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stage 1 Pre-screening */}
                <div className={`forge-msel-stage-panel ${state.stage === 1 ? 'forge-msel-stage-panel--active' : ''}`}>
                  <div>
                    <div className="forge-msel-section-label">Stage 2 — Pre-Screening</div>
                    <div className="forge-msel-section-title">Written Submissions Scorecard</div>
                    <div className="forge-msel-section-desc">
                      Two evaluators score written submissions independently. Threshold: ≥ 3.0 average across both evaluators.
                    </div>
                  </div>
                  <div className="forge-msel-dual-eval">
                    <div className="forge-msel-eval-section">
                      <div className="forge-msel-eval-head">
                        <div className="forge-msel-eval-label">Evaluator A</div>
                        <input className="forge-msel-eval-name" value={f('eval1name')} onChange={(e) => setField('eval1name', e.target.value)} placeholder="Enter your name…" />
                      </div>
                      {VALUES.map((v) => renderValueBlock(v, 'ps_e1_', false))}
                      <div className="forge-msel-rating-guide">
                        <span>
                          <span className="forge-msel-rg-num">1</span>No evidence
                        </span>
                        <span>
                          <span className="forge-msel-rg-num">3</span>Meets bar
                        </span>
                        <span>
                          <span className="forge-msel-rg-num">5</span>Exceptional
                        </span>
                      </div>
                    </div>
                    <div className="forge-msel-eval-section">
                      <div className="forge-msel-eval-head">
                        <div className="forge-msel-eval-label">Evaluator B</div>
                        <input className="forge-msel-eval-name" value={f('eval2name')} onChange={(e) => setField('eval2name', e.target.value)} placeholder="Enter your name…" />
                      </div>
                      {VALUES.map((v) => renderValueBlock(v, 'ps_e2_', false))}
                      <div className="forge-msel-rating-guide">
                        <span>
                          <span className="forge-msel-rg-num">1</span>No evidence
                        </span>
                        <span>
                          <span className="forge-msel-rg-num">3</span>Meets bar
                        </span>
                        <span>
                          <span className="forge-msel-rg-num">5</span>Exceptional
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Overall Submission Quality</div>
                      <span className="forge-msel-avg-chip">{scores.ps > 0 ? `Avg: ${scores.ps.toFixed(2)}` : 'Avg: —'}</span>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field-grid" style={{ marginBottom: '1rem' }}>
                        <div className="forge-msel-field">
                          <label>Personal Statement — Evaluator A</label>
                          <select value={f('psPersonalA')} onChange={(e) => setField('psPersonalA', e.target.value)}>
                            <option value="">— Rate —</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={String(n)}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="forge-msel-field">
                          <label>Personal Statement — Evaluator B</label>
                          <select value={f('psPersonalB')} onChange={(e) => setField('psPersonalB', e.target.value)}>
                            <option value="">— Rate —</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={String(n)}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="forge-msel-field-grid">
                        <div className="forge-msel-field">
                          <label>Impact Story — Evaluator A</label>
                          <select value={f('psImpactA')} onChange={(e) => setField('psImpactA', e.target.value)}>
                            <option value="">— Rate —</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={String(n)}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="forge-msel-field">
                          <label>Impact Story — Evaluator B</label>
                          <select value={f('psImpactB')} onChange={(e) => setField('psImpactB', e.target.value)}>
                            <option value="">— Rate —</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={String(n)}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field-grid">
                        <div className="forge-msel-field">
                          <label>Evaluator A — Overall notes</label>
                          <textarea value={f('psNotesA')} onChange={(e) => setField('psNotesA', e.target.value)} placeholder="Observations…" />
                        </div>
                        <div className="forge-msel-field">
                          <label>Evaluator B — Overall notes</label>
                          <textarea value={f('psNotesB')} onChange={(e) => setField('psNotesB', e.target.value)} placeholder="Observations…" />
                        </div>
                      </div>
                    </div>
                    <div className="forge-msel-card-body" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: 'rgba(245,240,232,.55)' }}>Pre-screening threshold: ≥ 3.0 average</div>
                      <div className={`forge-msel-pass-fail ${psBadge.cls}`}>{psBadge.text}</div>
                    </div>
                  </div>
                </div>

                {/* Stage 2 References */}
                <div className={`forge-msel-stage-panel ${state.stage === 2 ? 'forge-msel-stage-panel--active' : ''}`}>
                  <div>
                    <div className="forge-msel-section-label">Stage 3 — References</div>
                    <div className="forge-msel-section-title">Reference Assessment</div>
                    <div className="forge-msel-section-desc">Score each reference on specificity and credibility. References weighted at 10% of composite.</div>
                  </div>
                  {[1, 2].map((refNum) => (
                    <div key={refNum} className="forge-msel-card">
                      <div className="forge-msel-card-header">
                        <div>
                          <div className="forge-msel-card-sub">{refNum === 1 ? 'Reference 1 — Peer' : 'Reference 2 — Character'}</div>
                          <div className="forge-msel-card-title">{refNum === 1 ? 'Professional Peer' : 'Long-Standing Character Witness'}</div>
                        </div>
                      </div>
                      <div className="forge-msel-card-body">
                        <div className="forge-msel-field-grid">
                          <div className="forge-msel-field">
                            <label>Reference Name</label>
                            <input value={f(`ref${refNum}_name`)} onChange={(e) => setField(`ref${refNum}_name`, e.target.value)} />
                          </div>
                          <div className="forge-msel-field">
                            <label>{refNum === 1 ? 'Role / Organisation' : 'Role / Relationship'}</label>
                            <input value={f(`ref${refNum}_role`)} onChange={(e) => setField(`ref${refNum}_role`, e.target.value)} />
                          </div>
                        </div>
                      </div>
                      {REF_QUESTIONS.map((q, qi) => (
                        <div key={qi} className="forge-msel-ref-block">
                          <div className="forge-msel-ref-q">{q}</div>
                          <div className="forge-msel-field" style={{ marginBottom: '0.65rem' }}>
                            <label>Summary of response</label>
                            <textarea value={f(`ref${refNum}_sum${qi + 1}`)} onChange={(e) => setField(`ref${refNum}_sum${qi + 1}`, e.target.value)} placeholder="Specific, candid, credible?" />
                          </div>
                          <div className="forge-msel-ref-scores">
                            <span style={{ fontSize: 11, color: 'var(--forge-warm-grey)', textTransform: 'uppercase' }}>Quality:</span>
                            <StarRow
                              value={state.stars[`ref${refNum}_q${qi + 1}`] || 0}
                              onChange={(n) => setStar(`ref${refNum}_q${qi + 1}`, n)}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="forge-msel-card-body">
                        <div className="forge-msel-field">
                          <label>Overall reference quality</label>
                          <StarRow value={state.stars[`refOverall${refNum}`] || 0} onChange={(n) => setStar(`refOverall${refNum}`, n)} />
                        </div>
                        <div className="forge-msel-field" style={{ marginTop: '0.65rem' }}>
                          <label>Notes on this reference</label>
                          <textarea value={f(`ref${refNum}_notes`)} onChange={(e) => setField(`ref${refNum}_notes`, e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Reference Synthesis</div>
                      <span className="forge-msel-avg-chip">{scores.ref > 0 ? `Avg: ${scores.ref.toFixed(2)}` : 'Avg: —'}</span>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field" style={{ marginBottom: '1rem' }}>
                        <label>Consistent themes across references</label>
                        <textarea value={f('refSynthThemes')} onChange={(e) => setField('refSynthThemes', e.target.value)} />
                      </div>
                      <div className="forge-msel-field">
                        <label>Concerns or discrepancies</label>
                        <textarea value={f('refSynthConcerns')} onChange={(e) => setField('refSynthConcerns', e.target.value)} />
                      </div>
                    </div>
                    <div className="forge-msel-card-body" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: 'rgba(245,240,232,.55)' }}>References weighted at 10% of composite</div>
                      <div className={`forge-msel-pass-fail ${refBadge.cls}`}>{refBadge.text}</div>
                    </div>
                  </div>
                </div>

                {/* Stage 3 Interview */}
                <div className={`forge-msel-stage-panel ${state.stage === 3 ? 'forge-msel-stage-panel--active' : ''}`}>
                  <div>
                    <div className="forge-msel-section-label">Stage 4 — Interview</div>
                    <div className="forge-msel-section-title">Interview Scorecard</div>
                    <div className="forge-msel-section-desc">Interview scorecard carries 55% of composite. Threshold: ≥ 3.0 average.</div>
                  </div>
                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Interview Details</div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field-grid-3">
                        <div className="forge-msel-field">
                          <label>Date</label>
                          <input type="date" value={f('interviewDate')} onChange={(e) => setField('interviewDate', e.target.value)} />
                        </div>
                        <div className="forge-msel-field">
                          <label>Format</label>
                          <select value={f('interviewFormat')} onChange={(e) => setField('interviewFormat', e.target.value)}>
                            <option value="In-person">In-person</option>
                            <option value="Video call">Video call</option>
                            <option value="Hybrid">Hybrid</option>
                          </select>
                        </div>
                        <div className="forge-msel-field">
                          <label>Duration (minutes)</label>
                          <input type="number" value={f('interviewDur')} onChange={(e) => setField('interviewDur', e.target.value)} placeholder="60" min={15} max={180} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="forge-msel-dual-eval">
                    <div className="forge-msel-eval-section">
                      <div className="forge-msel-eval-head">
                        <div className="forge-msel-eval-label">Interviewer A</div>
                        <input className="forge-msel-eval-name" value={f('int1name')} onChange={(e) => setField('int1name', e.target.value)} placeholder="Enter your name…" />
                      </div>
                      {VALUES.map((v) => renderValueBlock(v, 'int_e1_', true))}
                      <div className="forge-msel-rating-guide">
                        <span>
                          <span className="forge-msel-rg-num">1</span>No evidence
                        </span>
                        <span>
                          <span className="forge-msel-rg-num">3</span>Meets bar
                        </span>
                        <span>
                          <span className="forge-msel-rg-num">5</span>Exceptional
                        </span>
                      </div>
                    </div>
                    <div className="forge-msel-eval-section">
                      <div className="forge-msel-eval-head">
                        <div className="forge-msel-eval-label">Interviewer B</div>
                        <input className="forge-msel-eval-name" value={f('int2name')} onChange={(e) => setField('int2name', e.target.value)} placeholder="Enter your name…" />
                      </div>
                      {VALUES.map((v) => renderValueBlock(v, 'int_e2_', true))}
                      <div className="forge-msel-rating-guide">
                        <span>
                          <span className="forge-msel-rg-num">1</span>No evidence
                        </span>
                        <span>
                          <span className="forge-msel-rg-num">3</span>Meets bar
                        </span>
                        <span>
                          <span className="forge-msel-rg-num">5</span>Exceptional
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Professional & Cultural Fit</div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field-grid">
                        <div>
                          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--forge-warm-grey)', marginBottom: '0.65rem' }}>Interviewer A</div>
                          <div className="forge-msel-field" style={{ marginBottom: '0.65rem' }}>
                            <label>Depth of professional context</label>
                            <select value={f('intProfA')} onChange={(e) => setField('intProfA', e.target.value)}>
                              <option value="">— Rate —</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={String(n)}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="forge-msel-field">
                            <label>Complementarity with existing members</label>
                            <select value={f('intCompA')} onChange={(e) => setField('intCompA', e.target.value)}>
                              <option value="">— Rate —</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={String(n)}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--forge-warm-grey)', marginBottom: '0.65rem' }}>Interviewer B</div>
                          <div className="forge-msel-field" style={{ marginBottom: '0.65rem' }}>
                            <label>Depth of professional context</label>
                            <select value={f('intProfB')} onChange={(e) => setField('intProfB', e.target.value)}>
                              <option value="">— Rate —</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={String(n)}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="forge-msel-field">
                            <label>Complementarity with existing members</label>
                            <select value={f('intCompB')} onChange={(e) => setField('intCompB', e.target.value)}>
                              <option value="">— Rate —</option>
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={String(n)}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field-grid">
                        <div className="forge-msel-field">
                          <label>Interviewer A — Post-interview notes</label>
                          <textarea value={f('intNotesA')} onChange={(e) => setField('intNotesA', e.target.value)} />
                        </div>
                        <div className="forge-msel-field">
                          <label>Interviewer B — Post-interview notes</label>
                          <textarea value={f('intNotesB')} onChange={(e) => setField('intNotesB', e.target.value)} />
                        </div>
                      </div>
                    </div>
                    <div className="forge-msel-card-body" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ fontSize: 12, color: 'rgba(245,240,232,.55)' }}>Interview weighted at 55% of composite</div>
                      <div className={`forge-msel-pass-fail ${intBadge.cls}`}>{intBadge.text}</div>
                    </div>
                  </div>
                </div>

                {/* Stage 4 Final */}
                <div className={`forge-msel-stage-panel ${state.stage === 4 ? 'forge-msel-stage-panel--active' : ''}`}>
                  <div>
                    <div className="forge-msel-section-label">Stage 5 — Final Decision</div>
                    <div className="forge-msel-section-title">Admission Recommendation</div>
                    <div className="forge-msel-section-desc">Composite updates from prior stages. Record founding vote and official outcome.</div>
                  </div>
                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Composite Score Summary</div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-final-grid">
                        <div className="forge-msel-final-tile">
                          <div className="forge-msel-composite-num" style={{ fontSize: '2rem' }}>
                            {fmt(scores.ps)}
                          </div>
                          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--forge-warm-grey)' }}>Pre-Screening</div>
                          <div style={{ fontSize: 10, color: 'rgba(245,240,232,.35)', marginTop: 4 }}>Weight 35%</div>
                        </div>
                        <div className="forge-msel-final-tile">
                          <div className="forge-msel-composite-num" style={{ fontSize: '2rem' }}>
                            {fmt(scores.ref)}
                          </div>
                          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--forge-warm-grey)' }}>References</div>
                          <div style={{ fontSize: 10, color: 'rgba(245,240,232,.35)', marginTop: 4 }}>Weight 10%</div>
                        </div>
                        <div className="forge-msel-final-tile">
                          <div className="forge-msel-composite-num" style={{ fontSize: '2rem' }}>
                            {fmt(scores.intv)}
                          </div>
                          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--forge-warm-grey)' }}>Interview</div>
                          <div style={{ fontSize: 10, color: 'rgba(245,240,232,.35)', marginTop: 4 }}>Weight 55%</div>
                        </div>
                        <div className="forge-msel-final-tile forge-msel-final-tile--emph">
                          <div className="forge-msel-composite-num" style={{ fontSize: '2.25rem' }}>
                            {fmt(scores.composite)}
                          </div>
                          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--forge-gold-dim)' }}>Composite</div>
                          <div style={{ fontSize: 10, color: 'rgba(201,164,68,.4)', marginTop: 4 }}>Threshold ≥ 3.0</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--forge-warm-grey)', marginBottom: '0.65rem' }}>Values — combined average</div>
                      {VALUES.map((v) => {
                        const avg = calcValueAvg(v.id, state.stars)
                        const pct = avg > 0 ? (avg / 5) * 100 : 0
                        const fill = avg >= 3.5 ? '#6dbf8c' : avg >= 3 ? 'var(--forge-gold)' : '#e87878'
                        return (
                          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: 6 }}>
                            <div style={{ fontSize: 11, color: 'rgba(245,240,232,.6)', minWidth: 160, lineHeight: 1.35 }}>{v.name}</div>
                            <div className="forge-msel-mini-track" style={{ flex: 1 }}>
                              <div className="forge-msel-mini-fill" style={{ width: `${pct}%`, background: fill }} />
                            </div>
                            <div style={{ fontFamily: 'var(--forge-serif)', fontSize: '1rem', color: 'var(--forge-gold-light)', minWidth: 28, textAlign: 'right' }}>
                              {avg > 0 ? avg.toFixed(1) : '—'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Founding Member Final Vote</div>
                    </div>
                    <div className="forge-msel-card-body">
                      <p style={{ fontSize: 12, color: 'rgba(245,240,232,.55)', marginBottom: '1rem', lineHeight: 1.65 }}>
                        All founding members vote. Admission requires unanimous agreement for founding members, or ≥ 75% for club members.
                      </p>
                      <div className="forge-msel-member-grid">
                        {state.memberNames.map((name, idx) => (
                          <div key={`f-${idx}`} className="forge-msel-member-row">
                            <div className="forge-msel-member-name">
                              <input
                                value={name}
                                onChange={(e) => {
                                  const next = [...state.memberNames]
                                  next[idx] = e.target.value
                                  setState((s) => ({ ...s, memberNames: next }))
                                }}
                              />
                            </div>
                            <div className="forge-msel-vote-row">
                              {['proceed', 'defer', 'decline', 'abstain'].map((choice) => (
                                <button
                                  key={choice}
                                  type="button"
                                  className={`forge-msel-vote-btn forge-msel-vote-btn--${choice} ${state.votesFinal[idx] === choice ? 'forge-msel-vote-btn--selected' : ''}`}
                                  onClick={() =>
                                    setState((s) => {
                                      const next = { ...s.votesFinal }
                                      if (next[idx] === choice) delete next[idx]
                                      else next[idx] = choice
                                      return { ...s, votesFinal: next }
                                    })
                                  }
                                >
                                  {choice === 'proceed' ? 'Proceed' : choice === 'defer' ? 'Defer' : choice === 'decline' ? 'Decline' : 'Abstain'}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          marginTop: '1rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid rgba(201,164,68,.1)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.65rem',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ fontSize: 13, color: 'rgba(245,240,232,.6)' }}>{finalVote.countLabel}</div>
                        <div className={`forge-msel-stage-badge forge-msel-badge-${finalVote.kind === 'proceed' ? 'proceed' : finalVote.kind === 'hold' ? 'hold' : 'review'}`}>
                          {finalVote.label}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="forge-msel-card">
                    <div className="forge-msel-card-header">
                      <div className="forge-msel-card-title">Official Outcome</div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-outcome-grid">
                        {[
                          { id: 'admit', icon: '✦', title: 'Admit', desc: 'Meets criteria. Send invitation and onboarding.' },
                          { id: 'defer', icon: '◐', title: 'Defer', desc: 'Reapplication in 6–12 months may be appropriate.' },
                          { id: 'decline', icon: '◯', title: 'Decline', desc: 'Does not meet the bar at this time.' },
                        ].map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            className={`forge-msel-outcome-card ${state.outcome === o.id ? `forge-msel-outcome-card--${o.id === 'admit' ? 'admit' : o.id === 'defer' ? 'defer' : 'decline'}` : ''}`}
                            onClick={() => setState((s) => ({ ...s, outcome: o.id }))}
                          >
                            <div style={{ fontSize: '1.6rem' }}>{o.icon}</div>
                            <div className="forge-msel-outcome-label">{o.title}</div>
                            <div className="forge-msel-outcome-desc">{o.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="forge-msel-card-body">
                      <div className="forge-msel-field-grid">
                        <div className="forge-msel-field">
                          <label>Decision communicated by</label>
                          <input value={f('finalCommBy')} onChange={(e) => setField('finalCommBy', e.target.value)} />
                        </div>
                        <div className="forge-msel-field">
                          <label>Communication date</label>
                          <input type="date" value={f('finalCommDate')} onChange={(e) => setField('finalCommDate', e.target.value)} />
                        </div>
                      </div>
                      <div className="forge-msel-field" style={{ marginTop: '1rem' }}>
                        <label>Rationale (internal record)</label>
                        <textarea value={f('finalRationale')} onChange={(e) => setField('finalRationale', e.target.value)} />
                      </div>
                      <div className="forge-msel-field" style={{ marginTop: '0.65rem' }}>
                        <label>Conditions (if deferring)</label>
                        <textarea value={f('finalConditions')} onChange={(e) => setField('finalConditions', e.target.value)} style={{ minHeight: 56 }} />
                      </div>
                    </div>
                  </div>

                  <div className="forge-msel-print">
                    <p>Generate a complete assessment report via your browser print dialog (PDF).</p>
                    <button type="button" className="forge-msel-btn forge-msel-btn-gold" style={{ width: 'auto' }} onClick={() => window.print()}>
                      Print / Export PDF
                    </button>
                  </div>
                </div>
              </div>

              <aside className="forge-msel-side">
                <div className="forge-msel-score-summary">
                  <div className="forge-msel-score-sum-h">Live Score Summary</div>
                  <div className="forge-msel-composite">
                    <div className="forge-msel-composite-num">{scores.composite > 0 ? scores.composite.toFixed(2) : '—'}</div>
                    <div className="forge-msel-composite-label">Composite / 5.0</div>
                    <div className="forge-msel-bar-track">
                      <div className="forge-msel-bar-fill" style={{ width: scores.composite > 0 ? `${(scores.composite / 5) * 100}%` : '0%' }} />
                      <div className="forge-msel-threshold-line" />
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(245,240,232,.3)', marginTop: 4 }}>Threshold at 3.0</div>
                    <div className={`forge-msel-pass-fail ${sideBadge.cls}`} style={{ marginTop: 10 }}>
                      {scores.composite > 0 ? sideBadge.text : 'Awaiting scores'}
                    </div>
                  </div>
                  <div className="forge-msel-stage-scores">
                    <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--forge-warm-grey)', marginBottom: 6 }}>By Stage</div>
                    {[
                      { k: 'PS', v: scores.ps },
                      { k: 'Ref', v: scores.ref },
                      { k: 'Int', v: scores.intv },
                    ].map(({ k, v }) => (
                      <div key={k} className="forge-msel-mini-row">
                        <div className="forge-msel-mini-label">{k === 'PS' ? 'Pre-Screen' : k}</div>
                        <div className="forge-msel-mini-track">
                          <div className="forge-msel-mini-fill" style={{ width: v > 0 ? `${(v / 5) * 100}%` : '0%' }} />
                        </div>
                        <div className={`forge-msel-mini-num ${v > 0 ? colorClass(v) : ''}`}>{v > 0 ? v.toFixed(1) : '—'}</div>
                      </div>
                    ))}
                  </div>
                  <div className="forge-msel-score-rows">
                    <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--forge-warm-grey)', marginBottom: 6 }}>By Value</div>
                    {VALUES.map((v) => {
                      const avg = calcValueAvg(v.id, state.stars)
                      return (
                        <div key={v.id} className="forge-msel-score-row">
                          <span style={{ color: 'rgba(245,240,232,.65)', maxWidth: '65%' }}>{v.name}</span>
                          <span className={`forge-msel-score-row-val ${avg > 0 ? colorClass(avg) : ''}`}>{avg > 0 ? avg.toFixed(1) : '—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="forge-msel-card">
                  <div className="forge-msel-card-header" style={{ padding: '0.85rem 1.1rem' }}>
                    <div className="forge-msel-card-title" style={{ fontSize: '0.95rem' }}>
                      Quick Actions
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button type="button" className="forge-msel-btn forge-msel-btn-gold" onClick={() => setStage(state.stage < 4 ? state.stage + 1 : 4)}>
                      Next Stage →
                    </button>
                    <button type="button" className="forge-msel-btn forge-msel-btn-outline" onClick={resetCurrent}>
                      Reset Assessment
                    </button>
                    <button type="button" className="forge-msel-btn forge-msel-btn-muted" onClick={() => window.print()}>
                      Print / Export
                    </button>
                  </div>
                </div>

                <div className="forge-msel-card">
                  <div className="forge-msel-card-header" style={{ padding: '0.85rem 1.1rem' }}>
                    <div className="forge-msel-card-title" style={{ fontSize: '0.95rem' }}>
                      Stage Checklist
                    </div>
                  </div>
                  <div style={{ padding: '0.85rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {checklist.map((c) => (
                      <div key={c.id} className={`forge-msel-step ${c.done ? 'forge-msel-step--done' : 'forge-msel-step--pending'}`}>
                        <span className="forge-msel-step-dot" />
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            {managerOpen && (
              <div
                className="forge-msel-modal-back"
                role="dialog"
                aria-modal
                aria-labelledby="forge-saved-title"
                onClick={(e) => e.target === e.currentTarget && setManagerOpen(false)}
              >
                <div className="forge-msel-modal">
                  <div className="forge-msel-modal-h">
                    <div>
                      <div className="forge-msel-section-label">FORGE</div>
                      <h2 id="forge-saved-title" className="forge-msel-section-title" style={{ fontSize: '1.2rem', marginBottom: 0 }}>
                        Saved Assessments
                      </h2>
                    </div>
                    <button type="button" className="forge-msel-btn-ghost" onClick={() => setManagerOpen(false)}>
                      Close
                    </button>
                  </div>
                  <div className="forge-msel-card-body" style={{ borderBottom: '1px solid rgba(201,164,68,.1)' }}>
                    <button type="button" className="forge-msel-btn forge-msel-btn-gold" onClick={openNewAssessment}>
                      + Start New Assessment
                    </button>
                  </div>
                  <div className="forge-msel-modal-list">
                    {!savedRows.length && <div style={{ textAlign: 'center', color: 'var(--forge-warm-grey)', padding: '2rem 0' }}>No saved assessments yet.</div>}
                    {savedRows.map((row) => {
                      const d = row.updatedAt ? new Date(row.updatedAt) : null
                      const dateStr = d
                        ? `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : '—'
                      const isCurrent = row.id === assessmentId
                      return (
                        <div key={row.id} className="forge-msel-saved-row">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--forge-serif)', color: 'var(--forge-ivory)', fontWeight: 500 }}>
                              {row.name}
                              {isCurrent && (
                                <span style={{ fontSize: 10, color: 'var(--forge-gold-dim)', marginLeft: 6, textTransform: 'uppercase' }}>current</span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--forge-warm-grey)', marginTop: 4 }}>{dateStr}</div>
                          </div>
                          <div style={{ fontFamily: 'var(--forge-serif)', color: 'var(--forge-gold-light)' }}>{row.composite ? row.composite.toFixed(2) : '—'}</div>
                          {!isCurrent && (
                            <button type="button" className="forge-msel-btn-ghost" style={{ width: 'auto', padding: '0.25rem 0.6rem' }} onClick={() => loadAssessment(row.id)}>
                              Load
                            </button>
                          )}
                          <button
                            type="button"
                            style={{
                              background: 'rgba(163,45,45,.2)',
                              border: '1px solid rgba(163,45,45,.4)',
                              borderRadius: 6,
                              color: '#e87878',
                              fontSize: 11,
                              padding: '0.25rem 0.5rem',
                              cursor: 'pointer',
                            }}
                            onClick={() => deleteAssessment(row.id)}
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ForgeModuleShell>
    </AppLayout>
  )
}
