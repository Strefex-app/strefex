import { useMemo, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import HrModuleShell from '../components/hr/HrModuleShell'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { useTranslation } from '../i18n/useTranslation'
import { extractContactsFromCvText, extractManyCvFiles, extractTextFromCvFile } from '../utils/hrCvExtract'
import { scoreCvAgainstPosition } from '../utils/hrCvFitScore'
import '../components/hr/HrModuleShell.css'

const emptyPosForm = () => ({
  title: '',
  department: 'Production',
  description: '',
  industry: '',
  mustHaveKeywords: '',
  preferredExperience: '',
  aiMatchHints: '',
})

const emptyCandForm = () => ({
  positionId: '',
  name: '',
  email: '',
  phone: '',
  cvFileName: '',
  cvSummary: '',
  cvExtractedText: '',
})

export default function HrHiringRecruitment() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('plan')
  const [showRoleCriteria, setShowRoleCriteria] = useState(false)

  const openPositions = useHrSpaceStore((s) => s.openPositions)
  const candidates = useHrSpaceStore((s) => s.candidates)
  const employees = useHrSpaceStore((s) => s.employees)
  const addOpenPosition = useHrSpaceStore((s) => s.addOpenPosition)
  const updateOpenPosition = useHrSpaceStore((s) => s.updateOpenPosition)
  const deleteOpenPosition = useHrSpaceStore((s) => s.deleteOpenPosition)
  const addCandidate = useHrSpaceStore((s) => s.addCandidate)
  const addCandidatesBulk = useHrSpaceStore((s) => s.addCandidatesBulk)
  const updateCandidate = useHrSpaceStore((s) => s.updateCandidate)
  const deleteCandidate = useHrSpaceStore((s) => s.deleteCandidate)
  const hireCandidate = useHrSpaceStore((s) => s.hireCandidate)
  const recomputeFitScoresForPosition = useHrSpaceStore((s) => s.recomputeFitScoresForPosition)

  const [posForm, setPosForm] = useState(emptyPosForm)
  const [candForm, setCandForm] = useState(emptyCandForm)
  const [hireModal, setHireModal] = useState(null)
  const [hireForm, setHireForm] = useState({ department: '', role: '', hireDate: '' })

  const [bulkPositionId, setBulkPositionId] = useState('')
  const [bulkAutoFill, setBulkAutoFill] = useState(true)
  const [bulkScore, setBulkScore] = useState(true)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

  const [singleScanBusy, setSingleScanBusy] = useState(false)
  const [singleAutoFill, setSingleAutoFill] = useState(true)
  const [singleScore, setSingleScore] = useState(true)
  const singleCvInputRef = useRef(null)
  const bulkInputRef = useRef(null)

  const openList = useMemo(() => openPositions.filter((p) => p.status === 'open'), [openPositions])

  const pipelineRows = useMemo(() => {
    const copy = [...candidates]
    copy.sort((a, b) => {
      const sa = a.fitScore != null ? a.fitScore : -1
      const sb = b.fitScore != null ? b.fitScore : -1
      if (sb !== sa) return sb - sa
      return (a.name || '').localeCompare(b.name || '')
    })
    return copy
  }, [candidates])

  const runHire = () => {
    if (!hireModal) return
    hireCandidate(hireModal.id, {
      department: hireForm.department || undefined,
      role: hireForm.role || undefined,
      hireDate: hireForm.hireDate || undefined,
    })
    setHireModal(null)
    setHireForm({ department: '', role: '', hireDate: '' })
  }

  const handleSingleCvScan = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSingleScanBusy(true)
    try {
      const text = await extractTextFromCvFile(file)
      const contacts = extractContactsFromCvText(text)
      const pos = openPositions.find((p) => p.id === candForm.positionId)
      let fitScore = null
      let fitReasons = []
      if (pos && text.trim() && singleScore) {
        const r = scoreCvAgainstPosition(pos, text)
        fitScore = r.score
        fitReasons = r.reasons
      }
      setCandForm((f) => ({
        ...f,
        cvFileName: file.name,
        cvExtractedText: text,
        name: singleAutoFill ? (contacts.name || f.name) : f.name,
        email: singleAutoFill ? (contacts.email || f.email) : f.email,
        phone: singleAutoFill ? (contacts.phone || f.phone) : f.phone,
        cvSummary: f.cvSummary || (text ? `${text.slice(0, 400)}${text.length > 400 ? '…' : ''}` : f.cvSummary),
        _fitScore: fitScore,
        _fitReasons: fitReasons,
      }))
    } finally {
      setSingleScanBusy(false)
    }
  }, [openPositions, candForm.positionId, singleAutoFill, singleScore])

  const handleBulkImport = async () => {
    if (!bulkPositionId || !bulkInputRef.current?.files?.length) {
      setBulkMsg(t('hrSpace.bulkPickPositionFiles', 'Select a position and one or more files.'))
      return
    }
    const pos = openPositions.find((p) => p.id === bulkPositionId)
    if (!pos) return
    const files = bulkInputRef.current.files
    setBulkBusy(true)
    setBulkMsg(t('hrSpace.bulkProcessing', 'Reading files…'))
    try {
      const extracted = await extractManyCvFiles(files, (i, total, label) => {
        setBulkMsg(`${t('hrSpace.bulkProcessing', 'Reading files…')} (${i + 1}/${total}) ${label}`)
      })
      const rows = []
      for (const { fileName, text } of extracted) {
        const contacts = bulkAutoFill ? extractContactsFromCvText(text) : { name: '', email: '', phone: '' }
        let fitScore = null
        let fitReasons = []
        if (bulkScore && text.trim()) {
          const r = scoreCvAgainstPosition(pos, text)
          fitScore = r.score
          fitReasons = r.reasons
        }
        const baseName = (contacts.name || fileName.replace(/\.[^.]+$/, '')).trim() || fileName
        rows.push({
          name: baseName,
          email: contacts.email || '',
          phone: contacts.phone || '',
          cvFileName: fileName,
          cvSummary: text ? `${text.slice(0, 500)}${text.length > 500 ? '…' : ''}` : '',
          cvExtractedText: text,
          fitScore,
          fitReasons,
        })
      }
      addCandidatesBulk(bulkPositionId, rows)
      bulkInputRef.current.value = ''
      setBulkMsg(t('hrSpace.bulkDone', 'Added {n} candidate(s).').replace('{n}', String(rows.length)))
    } catch {
      setBulkMsg(t('hrSpace.bulkError', 'Import failed — try PDF, text, or image files.'))
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <AppLayout>
      <HrModuleShell
        title={t('hrSpace.page.hiring.label', 'Hiring & recruitment')}
        subtitle={t('hrSpace.page.hiring.desc', 'Open positions, candidate CVs, hire into HR Space with full module links')}
        tab={tab}
        onTab={setTab}
        extra={
          <Link to={hrSpacePath()} className="hr-mod-back" style={{ marginLeft: 'auto' }}>
            {t('hrSpace.backToHrHub', 'HR Space')}
          </Link>
        }
      >
        {tab === 'plan' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.hiringPlanTitle', 'Workforce plan')}</h3>
              <p>{t('hrSpace.hiringPlanBody', 'Define open roles first, then attach applicants. Hiring creates an employee number and seeds qualifications, onboarding tasks, training, and links across all HR modules.')}</p>
              <div className="hr-mod-stat">
                <strong>{openList.length}</strong>
                <span>{t('hrSpace.openRoles', 'open roles')}</span>
              </div>
              <div className="hr-mod-stat">
                <strong>{candidates.filter((c) => c.status !== 'hired').length}</strong>
                <span>{t('hrSpace.activeCandidates', 'active candidates')}</span>
              </div>
              <div className="hr-mod-stat">
                <strong>{employees.length}</strong>
                <span>{t('hrSpace.employeesTotal', 'employees')}</span>
              </div>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.createPosition', 'Create open position')}</h3>
              <p className="hr-emp-prof-hint" style={{ marginBottom: 12 }}>
                {t('hrSpace.createPositionHint', 'Only title is required. Optional criteria below power automatic CV ranking (keyword + role text overlap) — no external AI required.')}
              </p>
              <div className="hr-mod-field">
                <label>{t('hrSpace.jobTitle', 'Title')} *</label>
                <input value={posForm.title} onChange={(e) => setPosForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="hr-mod-field">
                <label>{t('qualificationMatrix.department', 'Department')}</label>
                <input value={posForm.department} onChange={(e) => setPosForm((p) => ({ ...p, department: e.target.value }))} />
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.description', 'Description')}</label>
                <textarea rows={3} value={posForm.description} onChange={(e) => setPosForm((p) => ({ ...p, description: e.target.value }))} />
              </div>
              <button
                type="button"
                className="hr-mod-btn"
                style={{ marginBottom: 12 }}
                onClick={() => setShowRoleCriteria((v) => !v)}
              >
                {showRoleCriteria ? '−' : '+'} {t('hrSpace.roleCriteriaToggle', 'Matching plan (industry, must-haves, hints for ranking)')}
              </button>
              {showRoleCriteria && (
                <>
                  <div className="hr-mod-field">
                    <label>{t('hrSpace.roleIndustry', 'Industry / sector')}</label>
                    <input
                      placeholder={t('hrSpace.roleIndustryPh', 'e.g. Automotive, Machinery')}
                      value={posForm.industry}
                      onChange={(e) => setPosForm((p) => ({ ...p, industry: e.target.value }))}
                    />
                  </div>
                  <div className="hr-mod-field">
                    <label>{t('hrSpace.mustHaveKeywords', 'Must-have keywords / skills')}</label>
                    <input
                      placeholder={t('hrSpace.mustHavePh', 'Comma-separated: APQP, CNC, ISO 9001')}
                      value={posForm.mustHaveKeywords}
                      onChange={(e) => setPosForm((p) => ({ ...p, mustHaveKeywords: e.target.value }))}
                    />
                  </div>
                  <div className="hr-mod-field">
                    <label>{t('hrSpace.preferredExperience', 'Experience / seniority hints')}</label>
                    <input
                      placeholder={t('hrSpace.preferredExperiencePh', 'e.g. 5+ years, shift work, supplier audits')}
                      value={posForm.preferredExperience}
                      onChange={(e) => setPosForm((p) => ({ ...p, preferredExperience: e.target.value }))}
                    />
                  </div>
                  <div className="hr-mod-field">
                    <label>{t('hrSpace.aiMatchHints', 'Extra focus for matching')}</label>
                    <textarea
                      rows={2}
                      placeholder={t('hrSpace.aiMatchHintsPh', 'Anything else HR wants weighted: languages, certifications, tools…')}
                      value={posForm.aiMatchHints}
                      onChange={(e) => setPosForm((p) => ({ ...p, aiMatchHints: e.target.value }))}
                    />
                  </div>
                </>
              )}
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!posForm.title.trim()) return
                  addOpenPosition({
                    title: posForm.title.trim(),
                    department: posForm.department,
                    description: posForm.description,
                    industry: posForm.industry.trim(),
                    mustHaveKeywords: posForm.mustHaveKeywords.trim(),
                    preferredExperience: posForm.preferredExperience.trim(),
                    aiMatchHints: posForm.aiMatchHints.trim(),
                  })
                  setPosForm(emptyPosForm())
                  setShowRoleCriteria(false)
                }}
              >
                {t('hrSpace.addPosition', 'Add position')}
              </button>
            </div>
          </>
        )}

        {tab === 'track' && (
          <div className="hr-mod-panel">
            <h3>{t('hrSpace.pipeline', 'Pipeline')}</h3>
            <p className="hr-emp-prof-hint">{t('hrSpace.pipelineFitHint', 'Sorted by fit score (when computed). Use Manage → bulk CV import or Re-score on a position.')}</p>
            <table className="hr-mod-table">
              <thead>
                <tr>
                  <th>{t('hrSpace.candidate', 'Candidate')}</th>
                  <th>{t('hrSpace.position', 'Position')}</th>
                  <th>{t('hrSpace.fitScore', 'Fit')}</th>
                  <th>{t('hrSpace.status', 'Status')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pipelineRows.map((c) => {
                  const pos = openPositions.find((p) => p.id === c.positionId)
                  const tip = Array.isArray(c.fitReasons) ? c.fitReasons.join('\n') : ''
                  return (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{pos?.title || '—'}</td>
                      <td title={tip}>
                        {c.fitScore != null ? <strong>{c.fitScore}</strong> : '—'}
                      </td>
                      <td>{c.status}</td>
                      <td>
                        {c.status !== 'hired' && (
                          <button type="button" className="hr-mod-btn hr-mod-btn--primary" onClick={() => { setHireModal(c); setHireForm({ department: pos?.department || '', role: pos?.title || '', hireDate: new Date().toISOString().slice(0, 10) }) }}>
                            {t('hrSpace.hire', 'Hire')}
                          </button>
                        )}
                        {c.linkedEmployeeId && (
                          <Link to={`${hrSpacePath(`employees/${c.linkedEmployeeId}`)}`}>{t('hrSpace.viewProfile', 'Profile')}</Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'manage' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.bulkCvTitle', 'Bulk CV import')}</h3>
              <p className="hr-emp-prof-hint">{t('hrSpace.bulkCvBody', 'Upload many résumés at once (PDF, TXT, or scanned images). Optional: auto-fill name/email/phone and compute a fit score from the position’s description and matching plan.')}</p>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.position', 'Open position')}</label>
                  <select value={bulkPositionId} onChange={(e) => setBulkPositionId(e.target.value)}>
                    <option value="">{t('hrSpace.select', 'Select…')}</option>
                    {openList.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.bulkFiles', 'Files')}</label>
                  <input
                    ref={bulkInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,image/*"
                  />
                </div>
              </div>
              <label className="hr-mod-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={bulkAutoFill} onChange={(e) => setBulkAutoFill(e.target.checked)} />
                {t('hrSpace.bulkAutoFill', 'Auto-fill name / email / phone from CV text')}
              </label>
              <label className="hr-mod-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={bulkScore} onChange={(e) => setBulkScore(e.target.checked)} />
                {t('hrSpace.bulkScore', 'Score fit vs position (automation)')}
              </label>
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                disabled={bulkBusy}
                onClick={() => void handleBulkImport()}
              >
                {bulkBusy ? t('hrSpace.bulkWorking', 'Working…') : t('hrSpace.bulkImport', 'Import & create candidates')}
              </button>
              {bulkMsg && <p className="hr-emp-prof-hint" style={{ marginTop: 8 }}>{bulkMsg}</p>}
            </div>

            <div className="hr-mod-panel">
              <h3>{t('hrSpace.positionsManage', 'Positions — criteria, re-score, delete')}</h3>
              <p className="hr-emp-prof-hint">{t('hrSpace.positionsCriteriaHint', 'Industry and must-haves feed the same matcher as optional fields on new positions. Re-score updates all applicants for that role.')}</p>
              <table className="hr-mod-table">
                <thead>
                  <tr>
                    <th>{t('hrSpace.jobTitle', 'Title')}</th>
                    <th>{t('qualificationMatrix.department', 'Department')}</th>
                    <th>{t('hrSpace.roleIndustry', 'Industry')}</th>
                    <th>{t('hrSpace.mustHaveKeywords', 'Must-haves')}</th>
                    <th>{t('hrSpace.status', 'Status')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((p) => (
                    <tr key={p.id}>
                      <td><input key={`t-${p.id}`} defaultValue={p.title} onBlur={(e) => updateOpenPosition(p.id, { title: e.target.value })} /></td>
                      <td><input key={`d-${p.id}`} defaultValue={p.department} onBlur={(e) => updateOpenPosition(p.id, { department: e.target.value })} /></td>
                      <td><input key={`i-${p.id}`} defaultValue={p.industry || ''} placeholder="—" onBlur={(e) => updateOpenPosition(p.id, { industry: e.target.value })} /></td>
                      <td><input key={`k-${p.id}`} defaultValue={p.mustHaveKeywords || ''} placeholder="—" onBlur={(e) => updateOpenPosition(p.id, { mustHaveKeywords: e.target.value })} /></td>
                      <td>{p.status}</td>
                      <td>
                        <button type="button" className="hr-mod-btn" onClick={() => recomputeFitScoresForPosition(p.id)}>{t('hrSpace.rescore', 'Re-score')}</button>
                        {' '}
                        <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteOpenPosition(p.id)}>{t('hrSpace.delete', 'Delete')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.addCandidate', 'Add candidate')}</h3>
              <p className="hr-emp-prof-hint">{t('hrSpace.scanCvHint', 'Pick a position, then use “Scan CV” to read PDF / image / text and fill fields. You can edit before saving.')}</p>
              <label className="hr-mod-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={singleAutoFill} onChange={(e) => setSingleAutoFill(e.target.checked)} />
                {t('hrSpace.singleAutoFill', 'Auto-fill contact fields from CV')}
              </label>
              <label className="hr-mod-field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={singleScore} onChange={(e) => setSingleScore(e.target.checked)} />
                {t('hrSpace.singleScore', 'Preview fit score vs position')}
              </label>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.position', 'Position')}</label>
                  <select value={candForm.positionId} onChange={(e) => setCandForm((f) => ({ ...f, positionId: e.target.value }))}>
                    <option value="">{t('hrSpace.select', 'Select…')}</option>
                    {openList.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="hr-mod-field" style={{ alignSelf: 'end' }}>
                  <input ref={singleCvInputRef} type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,image/*" style={{ display: 'none' }} onChange={handleSingleCvScan} />
                  <button type="button" className="hr-mod-btn hr-mod-btn--primary" disabled={singleScanBusy || !candForm.positionId} onClick={() => singleCvInputRef.current?.click()}>
                    {singleScanBusy ? '…' : t('hrSpace.scanCv', 'Scan CV')}
                  </button>
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.candidateName', 'Name')}</label>
                  <input value={candForm.name} onChange={(e) => setCandForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>Email</label>
                  <input type="email" value={candForm.email} onChange={(e) => setCandForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.phone', 'Phone')}</label>
                  <input value={candForm.phone} onChange={(e) => setCandForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.cvFile', 'CV file name')}</label>
                <input readOnly value={candForm.cvFileName} placeholder="—" />
              </div>
              <div className="hr-mod-field">
                <label>{t('hrSpace.cvSummary', 'CV summary / notes')}</label>
                <textarea rows={3} value={candForm.cvSummary} onChange={(e) => setCandForm((f) => ({ ...f, cvSummary: e.target.value }))} />
              </div>
              {candForm._fitScore != null && (
                <p className="hr-emp-prof-hint">
                  {t('hrSpace.previewFit', 'Preview fit')}: <strong>{candForm._fitScore}</strong>
                  {Array.isArray(candForm._fitReasons) && candForm._fitReasons.length ? ` — ${candForm._fitReasons.join(' ')}` : ''}
                </p>
              )}
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!candForm.positionId || !candForm.name.trim()) return
                  const pos = openPositions.find((p) => p.id === candForm.positionId)
                  const text = candForm.cvExtractedText || candForm.cvSummary || ''
                  let fitScore = candForm._fitScore
                  let fitReasons = candForm._fitReasons
                  if ((fitScore == null || !fitReasons?.length) && pos && text.trim()) {
                    const r = scoreCvAgainstPosition(pos, text)
                    fitScore = r.score
                    fitReasons = r.reasons
                  }
                  addCandidate({
                    positionId: candForm.positionId,
                    name: candForm.name.trim(),
                    email: candForm.email,
                    phone: candForm.phone,
                    cvFileName: candForm.cvFileName,
                    cvSummary: candForm.cvSummary,
                    cvExtractedText: text,
                    fitScore: fitScore ?? null,
                    fitReasons: Array.isArray(fitReasons) ? fitReasons : [],
                  })
                  setCandForm(emptyCandForm())
                }}
              >
                {t('hrSpace.saveCandidate', 'Save candidate')}
              </button>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.candidatesManage', 'Candidates')}</h3>
              <table className="hr-mod-table">
                <thead>
                  <tr>
                    <th>{t('hrSpace.candidateName', 'Name')}</th>
                    <th>Email</th>
                    <th>{t('hrSpace.fitScore', 'Fit')}</th>
                    <th>{t('hrSpace.cvSummary', 'CV')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>{c.email}</td>
                      <td title={Array.isArray(c.fitReasons) ? c.fitReasons.join('\n') : ''}>{c.fitScore != null ? c.fitScore : '—'}</td>
                      <td><small>{c.cvSummary?.slice(0, 80)}{c.cvSummary?.length > 80 ? '…' : ''}</small></td>
                      <td>
                        <div className="hr-mod-actions">
                          <select value={c.status} onChange={(e) => updateCandidate(c.id, { status: e.target.value })}>
                            {['applied', 'screening', 'offer', 'hired', 'rejected'].map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteCandidate(c.id)}>{t('hrSpace.delete', 'Delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {hireModal && (
          <div className="hm-modal-overlay" style={{ zIndex: 6000 }} role="dialog" aria-modal>
            <div className="hm-modal" onClick={(e) => e.stopPropagation()}>
              <div className="hm-modal-header">
                <h3>{t('hrSpace.hireConfirm', 'Hire')} — {hireModal.name}</h3>
                <button type="button" className="hm-modal-close" onClick={() => setHireModal(null)}>×</button>
              </div>
              <div className="hm-modal-body">
                <p>{t('hrSpace.hireExplain', 'Creates employee number, seeds qualifications (baseline stars), onboarding checklist, planned induction training, and links modules. Position can be marked filled.')}</p>
                <div className="hr-mod-field">
                  <label>{t('qualificationMatrix.department', 'Department')}</label>
                  <input value={hireForm.department} onChange={(e) => setHireForm((f) => ({ ...f, department: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.role', 'Role / title')}</label>
                  <input value={hireForm.role} onChange={(e) => setHireForm((f) => ({ ...f, role: e.target.value }))} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.startDate', 'Start date')}</label>
                  <input type="date" value={hireForm.hireDate} onChange={(e) => setHireForm((f) => ({ ...f, hireDate: e.target.value }))} />
                </div>
              </div>
              <div className="hm-modal-footer">
                <button type="button" className="hm-modal-cancel" onClick={() => setHireModal(null)}>{t('hrSpace.cancel', 'Cancel')}</button>
                <button type="button" className="hm-modal-save" onClick={runHire}>{t('hrSpace.confirmHire', 'Confirm hire')}</button>
              </div>
            </div>
          </div>
        )}
      </HrModuleShell>
    </AppLayout>
  )
}
