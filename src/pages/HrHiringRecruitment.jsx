import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import HrModuleShell from '../components/hr/HrModuleShell'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { useTranslation } from '../i18n/useTranslation'
import {
  extractContactsFromCvText,
  extractManyCvFiles,
  extractTextFromCvFile,
  displayNameFromFileName,
} from '../utils/hrCvExtract'
import { scoreCvAgainstPosition } from '../utils/hrCvFitScore'
import {
  getCvBlob,
  storeCvFileFromUpload,
  deleteCvFile,
  HR_CV_MAX_FILE_BYTES,
  resolveCvPreviewMime,
} from '../utils/hrCvFileStorage'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
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
  cvStoredFileId: '',
  cvMimeType: '',
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
  const talentPoolEntries = useHrSpaceStore((s) => s.talentPoolEntries ?? [])
  const archiveCandidate = useHrSpaceStore((s) => s.archiveCandidate)
  const restoreCandidate = useHrSpaceStore((s) => s.restoreCandidate)
  const promoteCandidateToTalentPool = useHrSpaceStore((s) => s.promoteCandidateToTalentPool)
  const addTalentPoolEntry = useHrSpaceStore((s) => s.addTalentPoolEntry)
  const updateTalentPoolEntry = useHrSpaceStore((s) => s.updateTalentPoolEntry)
  const removeTalentPoolEntry = useHrSpaceStore((s) => s.removeTalentPoolEntry)
  const recalculateTalentPoolFit = useHrSpaceStore((s) => s.recalculateTalentPoolFit)

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
  const singleCvInputRef = useRef(null)
  const bulkInputRef = useRef(null)
  const poolFileRef = useRef(null)

  const [trackShowArchived, setTrackShowArchived] = useState(false)
  const [manageCandFilter, setManageCandFilter] = useState('active')
  const [cvPreview, setCvPreview] = useState(null)
  const [poolFilterIndustry, setPoolFilterIndustry] = useState('')
  const [poolFilterRole, setPoolFilterRole] = useState('')
  const [poolUploadName, setPoolUploadName] = useState('')
  const [poolUploadIndustries, setPoolUploadIndustries] = useState('')
  const [poolUploadRoles, setPoolUploadRoles] = useState('')
  const [poolUploadNotes, setPoolUploadNotes] = useState('')
  const [poolUploadBusy, setPoolUploadBusy] = useState(false)
  const [poolFitSelect, setPoolFitSelect] = useState({})

  const hiringTabs = useMemo(
    () => [
      { id: 'plan', label: t('hrSpace.tabPlan', 'Plan') },
      { id: 'track', label: t('hrSpace.tabTrack', 'Track') },
      { id: 'manage', label: t('hrSpace.tabManage', 'Manage data') },
      { id: 'archive', label: t('hrSpace.tabTalentArchive', 'Talent archive') },
    ],
    [t]
  )

  const openList = useMemo(() => openPositions.filter((p) => p.status === 'open'), [openPositions])

  const activeNonHiredCount = useMemo(
    () => candidates.filter((c) => !c.archived && c.status !== 'hired').length,
    [candidates]
  )

  const pipelineRows = useMemo(() => {
    const copy = candidates.filter((c) => trackShowArchived || !c.archived)
    copy.sort((a, b) => {
      const sa = a.fitScore != null ? a.fitScore : -1
      const sb = b.fitScore != null ? b.fitScore : -1
      if (sb !== sa) return sb - sa
      return (a.name || '').localeCompare(b.name || '')
    })
    return copy
  }, [candidates, trackShowArchived])

  const manageCandidatesList = useMemo(() => {
    if (manageCandFilter === 'archived') return candidates.filter((c) => c.archived)
    if (manageCandFilter === 'all') return candidates
    return candidates.filter((c) => !c.archived)
  }, [candidates, manageCandFilter])

  const filteredTalentPool = useMemo(() => {
    const ind = poolFilterIndustry.trim().toLowerCase()
    const rol = poolFilterRole.trim().toLowerCase()
    return talentPoolEntries.filter((e) => {
      const indOk =
        !ind ||
        (e.industries || []).some((x) => String(x).toLowerCase().includes(ind)) ||
        String(e.notes || '').toLowerCase().includes(ind)
      const rolOk =
        !rol ||
        (e.matchedRoles || []).some((x) => String(x).toLowerCase().includes(rol)) ||
        String(e.name || '').toLowerCase().includes(rol)
      return indOk && rolOk
    })
  }, [talentPoolEntries, poolFilterIndustry, poolFilterRole])

  useEffect(
    () => () => {
      if (cvPreview?.url) URL.revokeObjectURL(cvPreview.url)
    },
    [cvPreview?.url]
  )

  const openCvPreview = useCallback(async (storedId, mimeType, title, options = {}) => {
    const textFallback = String(options.textFallback || '').trim()
    const sid = storedId != null ? String(storedId).trim() : ''
    const showText = (txt) => {
      setCvPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url)
        return { url: null, mimeType: 'text/plain', title, textPreview: txt }
      })
    }
    if (!sid) {
      if (textFallback) showText(textFallback)
      return
    }
    let blob
    try {
      blob = await getCvBlob(sid)
    } catch {
      blob = null
    }
    if (!blob) {
      if (textFallback) {
        showText(textFallback)
        return
      }
      window.alert(t('hrSpace.cvPreviewMissing', 'No file in browser storage for this record. Re-upload the CV to attach it.'))
      return
    }
    const type = await resolveCvPreviewMime(blob, mimeType, title)
    if (type.includes('text/plain')) {
      const textPreview = await blob.text()
      setCvPreview((prev) => {
        if (prev?.url) URL.revokeObjectURL(prev.url)
        return { url: null, mimeType: type, title, textPreview }
      })
      return
    }
    const url = URL.createObjectURL(blob)
    setCvPreview((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url)
      return { url, mimeType: type, title, textPreview: null }
    })
  }, [t])

  const openHrCvRecord = useCallback(
    (rec) => {
      const title = rec.cvFileName || rec.name || 'CV'
      const textFallback = String(rec.cvExtractedText || rec.cvSummary || '').trim()
      const sid = rec.cvStoredFileId != null ? String(rec.cvStoredFileId).trim() : ''
      if (!sid && !textFallback) {
        window.alert(t('hrSpace.cvPreviewMissing', 'No file in browser storage for this record. Re-upload the CV to attach it.'))
        return
      }
      void openCvPreview(sid, rec.cvMimeType, title, { textFallback })
    },
    [openCvPreview, t]
  )

  const closeCvPreview = useCallback(() => {
    setCvPreview((p) => {
      if (p?.url) URL.revokeObjectURL(p.url)
      return null
    })
  }, [])

  const handlePoolFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPoolUploadBusy(true)
    try {
      const text = await extractTextFromCvFile(file)
      const contacts = extractContactsFromCvText(text)
      const stored = await storeCvFileFromUpload(file)
      const industries = poolUploadIndustries.split(',').map((s) => s.trim()).filter(Boolean)
      const roles = poolUploadRoles.split(',').map((s) => s.trim()).filter(Boolean)
      addTalentPoolEntry({
        name:
          poolUploadName.trim() ||
          (contacts.name || '').trim() ||
          displayNameFromFileName(file.name) ||
          file.name.replace(/\.[^.]+$/i, '').replace(/[_]+/g, ' ').trim() ||
          file.name,
        email: contacts.email || '',
        phone: contacts.phone || '',
        cvFileName: file.name,
        cvMimeType: stored?.mimeType || file.type || '',
        cvStoredFileId: stored?.id || null,
        cvExtractedText: text,
        industries,
        matchedRoles: roles,
        notes: poolUploadNotes.trim(),
      })
      setPoolUploadName('')
      setPoolUploadIndustries('')
      setPoolUploadRoles('')
      setPoolUploadNotes('')
    } finally {
      setPoolUploadBusy(false)
    }
  }, [poolUploadName, poolUploadIndustries, poolUploadRoles, poolUploadNotes, addTalentPoolEntry])

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
      if (pos) {
        const r = scoreCvAgainstPosition(pos, text)
        fitScore = r.score
        fitReasons = r.reasons
      }
      const stored = await storeCvFileFromUpload(file)
      setCandForm((f) => {
        if (stored) {
          if (f.cvStoredFileId && f.cvStoredFileId !== stored.id) void deleteCvFile(f.cvStoredFileId)
        } else if (f.cvStoredFileId) {
          void deleteCvFile(f.cvStoredFileId)
        }
        const fromDoc = (v, prev) => (singleAutoFill ? (v || prev) : (prev || v))
        return {
          ...f,
          cvFileName: file.name,
          cvExtractedText: text,
          cvStoredFileId: stored ? stored.id : '',
          cvMimeType: stored ? stored.mimeType : (file.type || ''),
          name: fromDoc(contacts.name?.trim() || '', f.name),
          email: fromDoc(contacts.email || '', f.email),
          phone: fromDoc(contacts.phone || '', f.phone),
          cvSummary: f.cvSummary || (text ? `${text.slice(0, 400)}${text.length > 400 ? '…' : ''}` : f.cvSummary),
          _fitScore: fitScore,
          _fitReasons: fitReasons,
        }
      })
    } finally {
      setSingleScanBusy(false)
    }
  }, [openPositions, candForm.positionId, singleAutoFill])

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
      let skippedLarge = 0
      for (const { file, fileName, text } of extracted) {
        const contacts = extractContactsFromCvText(text)
        const nameFromDoc = (contacts.name || '').trim()
        const stemPretty = displayNameFromFileName(fileName)
        const stemRaw = fileName.replace(/\.[^.]+$/i, '').replace(/[_]+/g, ' ').trim()
        const baseName = nameFromDoc || (bulkAutoFill ? stemPretty || stemRaw : stemRaw) || fileName
        let fitScore = null
        let fitReasons = []
        if (bulkScore) {
          const r = scoreCvAgainstPosition(pos, text)
          fitScore = r.score
          fitReasons = r.reasons
        }
        const stored = file ? await storeCvFileFromUpload(file) : null
        if (file && !stored && file.size > HR_CV_MAX_FILE_BYTES) skippedLarge += 1
        rows.push({
          name: baseName,
          email: contacts.email || '',
          phone: contacts.phone || '',
          cvFileName: fileName,
          cvMimeType: stored?.mimeType || file?.type || '',
          cvStoredFileId: stored?.id || null,
          cvSummary: text ? `${text.slice(0, 500)}${text.length > 500 ? '…' : ''}` : '',
          cvExtractedText: text,
          fitScore,
          fitReasons,
        })
      }
      addCandidatesBulk(bulkPositionId, rows)
      bulkInputRef.current.value = ''
      let msg = t('hrSpace.bulkDone', 'Added {n} candidate(s).').replace('{n}', String(rows.length))
      if (skippedLarge) {
        msg += ` ${t('hrSpace.bulkSkippedLarge', '{n} file(s) over {mb} MB were not stored for preview.').replace('{n}', String(skippedLarge)).replace('{mb}', String(Math.round(HR_CV_MAX_FILE_BYTES / (1024 * 1024))))}`
      }
      setBulkMsg(msg)
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
        tabs={hiringTabs}
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
                <strong>{activeNonHiredCount}</strong>
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
            <p className="hr-emp-prof-hint">
              {t(
                'hrSpace.pipelineFitHint',
                'Sorted by fit score (when computed). Edit the candidate name in the list if recognition was wrong. Use Manage → bulk CV import or Re-score on a position.'
              )}
            </p>
            <ToggleCheckButton
              className="hr-mod-check-btn"
              style={{ marginBottom: 12 }}
              checked={trackShowArchived}
              onChange={setTrackShowArchived}
            >
              {t('hrSpace.showArchivedPipeline', 'Show archived candidates in this list')}
            </ToggleCheckButton>
            <div className="hr-mod-table-scroll">
            <table className="hr-mod-table hr-mod-table--pipeline">
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
                      <td>
                        <input
                          type="text"
                          className="hr-mod-pipeline-name-input"
                          defaultValue={c.name || ''}
                          key={`${c.id}-${c.name || ''}`}
                          aria-label={t('hrSpace.candidateName', 'Candidate name')}
                          onBlur={(e) => {
                            const v = e.target.value.trim()
                            if (!v) {
                              e.target.value = c.name || ''
                              return
                            }
                            if (v !== String(c.name || '').trim()) updateCandidate(c.id, { name: v })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur()
                          }}
                        />
                        {c.archived ? (
                          <span className="hr-mod-pipeline-archived-tag"> ({t('hrSpace.archived', 'archived')})</span>
                        ) : null}
                      </td>
                      <td>{pos?.title || '—'}</td>
                      <td title={tip}>
                        {c.fitScore != null ? <strong>{c.fitScore}</strong> : '—'}
                      </td>
                      <td>{c.status}</td>
                      <td>
                        <div className="hr-mod-actions" style={{ flexWrap: 'wrap', gap: 6 }}>
                          {c.cvStoredFileId || String(c.cvExtractedText || c.cvSummary || '').trim() ? (
                            <button type="button" className="hr-mod-btn" onClick={() => openHrCvRecord(c)}>
                              {t('hrSpace.cvPreview', 'Preview CV')}
                            </button>
                          ) : null}
                          {c.status !== 'hired' && !c.archived && (
                            <button type="button" className="hr-mod-btn hr-mod-btn--primary" onClick={() => { setHireModal(c); setHireForm({ department: pos?.department || '', role: pos?.title || '', hireDate: new Date().toISOString().slice(0, 10) }) }}>
                              {t('hrSpace.hire', 'Hire')}
                            </button>
                          )}
                          {c.linkedEmployeeId && (
                            <Link to={`${hrSpacePath(`employees/${c.linkedEmployeeId}`)}`}>{t('hrSpace.viewProfile', 'Profile')}</Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {tab === 'manage' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.bulkCvTitle', 'Bulk CV import')}</h3>
              <p className="hr-emp-prof-hint">{t('hrSpace.bulkCvBody', 'Upload many résumés at once. Each file is read (including OCR for scanned PDFs when needed), stored locally for Preview (up to {mb} MB per file), then optional auto-fill and fit scoring run against the selected role.').replace('{mb}', String(Math.round(HR_CV_MAX_FILE_BYTES / (1024 * 1024))))}</p>
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
              <div className="hr-mod-check-group">
                <ToggleCheckButton className="hr-mod-check-btn" checked={bulkAutoFill} onChange={setBulkAutoFill}>
                  {t('hrSpace.bulkAutoFill', 'Guess name from file name when missing')}
                </ToggleCheckButton>
                <ToggleCheckButton className="hr-mod-check-btn" checked={bulkScore} onChange={setBulkScore}>
                  {t('hrSpace.bulkScore', 'Score fit vs selected role')}
                </ToggleCheckButton>
              </div>
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
              <div className="hr-mod-table-scroll">
              <table className="hr-mod-table hr-mod-table--positions">
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
                        <div className="hr-mod-actions">
                          <button type="button" className="hr-mod-btn" onClick={() => recomputeFitScoresForPosition(p.id)}>{t('hrSpace.rescore', 'Re-score')}</button>
                          <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteOpenPosition(p.id)}>{t('hrSpace.delete', 'Delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.addCandidate', 'Add candidate')}</h3>
              <p className="hr-emp-prof-hint">{t('hrSpace.scanCvHint', 'Pick a position, then use “Scan CV” to read PDF / image / text and fill fields. You can edit before saving.')}</p>
              <ToggleCheckButton
                className="hr-mod-check-btn"
                style={{ marginBottom: 8 }}
                checked={singleAutoFill}
                onChange={setSingleAutoFill}
              >
                {t('hrSpace.singleAutoFill', 'Replace name, email, and phone from CV on each scan')}
              </ToggleCheckButton>
              <p className="hr-emp-prof-hint" style={{ marginTop: 0 }}>
                {t('hrSpace.singleAutoFillOffHint', 'When off, only empty fields are filled from the CV.')}
              </p>
              <p className="hr-emp-prof-hint" style={{ marginTop: 6 }}>
                {t('hrSpace.singleScoreAlways', 'Fit vs the selected position is computed automatically after each scan.')}
              </p>
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
              {candForm.positionId && (candForm.cvFileName || candForm.cvExtractedText) && candForm._fitScore != null && (
                <p className="hr-emp-prof-hint">
                  {t('hrSpace.previewFit', 'Preview fit')}: <strong>{candForm._fitScore}</strong>
                  {Array.isArray(candForm._fitReasons) && candForm._fitReasons.length ? ` — ${candForm._fitReasons.join(' ')}` : ''}
                </p>
              )}
              <button
                type="button"
                className="hr-mod-btn hr-mod-btn--primary"
                onClick={() => {
                  if (!candForm.positionId) return
                  const text = candForm.cvExtractedText || candForm.cvSummary || ''
                  const parsed = extractContactsFromCvText(text)
                  const stem = (candForm.cvFileName || '').replace(/\.[^.]+$/i, '').replace(/[_]+/g, ' ').trim()
                  const displayName =
                    candForm.name.trim() ||
                    (parsed.name || '').trim() ||
                    displayNameFromFileName(candForm.cvFileName || '') ||
                    stem ||
                    t('hrSpace.candidateUnnamed', 'Candidate')
                  const pos = openPositions.find((p) => p.id === candForm.positionId)
                  let fitScore = candForm._fitScore
                  let fitReasons = candForm._fitReasons
                  if (pos && (fitScore == null || !Array.isArray(fitReasons) || fitReasons.length === 0)) {
                    const r = scoreCvAgainstPosition(pos, text)
                    fitScore = r.score
                    fitReasons = r.reasons
                  }
                  addCandidate({
                    positionId: candForm.positionId,
                    name: displayName,
                    email: (candForm.email || '').trim() || parsed.email || '',
                    phone: (candForm.phone || '').trim() || parsed.phone || '',
                    cvFileName: candForm.cvFileName,
                    cvMimeType: candForm.cvMimeType || '',
                    cvStoredFileId: candForm.cvStoredFileId || null,
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
              <h3>{t('hrSpace.candidatesManage', 'Candidate database')}</h3>
              <p className="hr-emp-prof-hint">{t('hrSpace.candidateDbHint', 'CV files are kept in this browser (IndexedDB) for preview. Archive removes someone from the active pipeline; talent archive stores profiles for future roles.')}</p>
              <div className="hr-mod-field" style={{ marginBottom: 12 }}>
                <label>{t('hrSpace.manageFilter', 'Show')}</label>
                <select value={manageCandFilter} onChange={(e) => setManageCandFilter(e.target.value)}>
                  <option value="active">{t('hrSpace.filterActive', 'Active (not archived)')}</option>
                  <option value="archived">{t('hrSpace.filterArchived', 'Archived only')}</option>
                  <option value="all">{t('hrSpace.filterAll', 'All')}</option>
                </select>
              </div>
              <div className="hr-mod-table-scroll">
              <table className="hr-mod-table hr-mod-table--candidates">
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
                  {manageCandidatesList.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}{c.archived ? ` · ${t('hrSpace.archived', 'archived')}` : ''}</td>
                      <td>{c.email}</td>
                      <td title={Array.isArray(c.fitReasons) ? c.fitReasons.join('\n') : ''}>{c.fitScore != null ? c.fitScore : '—'}</td>
                      <td>
                        {c.cvSummary ? (
                          <span className="hr-mod-cell-clamp" title={c.cvSummary}>{c.cvSummary}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <div className="hr-mod-actions" style={{ flexWrap: 'wrap', gap: 6 }}>
                          {c.cvStoredFileId || String(c.cvExtractedText || c.cvSummary || '').trim() ? (
                            <button type="button" className="hr-mod-btn" onClick={() => openHrCvRecord(c)}>
                              {t('hrSpace.cvPreview', 'Preview CV')}
                            </button>
                          ) : null}
                          <select value={c.status} onChange={(e) => updateCandidate(c.id, { status: e.target.value })}>
                            {['applied', 'screening', 'offer', 'hired', 'rejected'].map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                          {!c.archived ? (
                            <button type="button" className="hr-mod-btn" onClick={() => archiveCandidate(c.id)}>{t('hrSpace.archive', 'Archive')}</button>
                          ) : (
                            <button type="button" className="hr-mod-btn" onClick={() => restoreCandidate(c.id)}>{t('hrSpace.restore', 'Restore')}</button>
                          )}
                          <button
                            type="button"
                            className="hr-mod-btn"
                            onClick={() => {
                              promoteCandidateToTalentPool(c.id, { notes: '' })
                            }}
                          >
                            {t('hrSpace.toTalentArchive', 'Talent archive')}
                          </button>
                          <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => deleteCandidate(c.id)}>{t('hrSpace.delete', 'Delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}

        {tab === 'archive' && (
          <>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.talentArchiveTitle', 'Talent archive (future roles)')}</h3>
              <p className="hr-emp-prof-hint">{t('hrSpace.talentArchiveBody', 'Search by industry tags or role titles. Score any stored CV against a current opening to see fit before you create a new requisition. Files live in this browser only.')}</p>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.poolFilterIndustry', 'Filter by industry / tag')}</label>
                  <input value={poolFilterIndustry} onChange={(e) => setPoolFilterIndustry(e.target.value)} placeholder={t('hrSpace.poolFilterIndustryPh', 'e.g. Automotive')} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.poolFilterRole', 'Filter by role / title')}</label>
                  <input value={poolFilterRole} onChange={(e) => setPoolFilterRole(e.target.value)} placeholder={t('hrSpace.poolFilterRolePh', 'e.g. Engineer')} />
                </div>
              </div>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.poolUploadTitle', 'Upload CV into talent archive')}</h3>
              <p className="hr-emp-prof-hint">{t('hrSpace.poolUploadHint', 'Optional name; industries and roles as comma-separated tags for later search.')}</p>
              <div className="hr-mod-grid2">
                <div className="hr-mod-field">
                  <label>{t('hrSpace.candidateName', 'Name')}</label>
                  <input value={poolUploadName} onChange={(e) => setPoolUploadName(e.target.value)} />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.poolIndustries', 'Industries / sectors')}</label>
                  <input value={poolUploadIndustries} onChange={(e) => setPoolUploadIndustries(e.target.value)} placeholder="Automotive, Machinery" />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.poolRoles', 'Target roles (future)')}</label>
                  <input value={poolUploadRoles} onChange={(e) => setPoolUploadRoles(e.target.value)} placeholder="Quality Engineer, CNC" />
                </div>
                <div className="hr-mod-field">
                  <label>{t('hrSpace.notes', 'Notes')}</label>
                  <input value={poolUploadNotes} onChange={(e) => setPoolUploadNotes(e.target.value)} />
                </div>
              </div>
              <input ref={poolFileRef} type="file" accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,image/*" style={{ display: 'none' }} onChange={(ev) => void handlePoolFileUpload(ev)} />
              <button type="button" className="hr-mod-btn hr-mod-btn--primary" disabled={poolUploadBusy} onClick={() => poolFileRef.current?.click()}>
                {poolUploadBusy ? '…' : t('hrSpace.poolPickFile', 'Choose CV file')}
              </button>
            </div>
            <div className="hr-mod-panel">
              <h3>{t('hrSpace.poolTableTitle', 'Archived profiles')}</h3>
              <div className="hr-mod-table-scroll">
              <table className="hr-mod-table hr-mod-table--talent">
                <thead>
                  <tr>
                    <th>{t('hrSpace.candidateName', 'Name')}</th>
                    <th>{t('hrSpace.roleIndustry', 'Industries')}</th>
                    <th>{t('hrSpace.poolRolesCol', 'Roles')}</th>
                    <th>{t('hrSpace.fitScore', 'Last fit')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredTalentPool.map((e) => (
                    <tr key={e.id}>
                      <td>{e.name}</td>
                      <td>
                        {(e.industries || []).length ? (
                          <span className="hr-mod-cell-clamp" title={(e.industries || []).join(', ')}>
                            {(e.industries || []).join(', ')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {(e.matchedRoles || []).length ? (
                          <span className="hr-mod-cell-clamp" title={(e.matchedRoles || []).join(', ')}>
                            {(e.matchedRoles || []).join(', ')}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td title={Array.isArray(e.lastFitReasons) ? e.lastFitReasons.join('\n') : ''}>
                        {e.lastFitScore != null ? e.lastFitScore : '—'}
                      </td>
                      <td>
                        <div className="hr-mod-actions" style={{ flexWrap: 'wrap', gap: 6 }}>
                          {e.cvStoredFileId || String(e.cvExtractedText || '').trim() ? (
                            <button type="button" className="hr-mod-btn" onClick={() => openHrCvRecord(e)}>
                              {t('hrSpace.cvPreview', 'Preview CV')}
                            </button>
                          ) : null}
                          <select
                            value={poolFitSelect[e.id] || ''}
                            onChange={(ev) => setPoolFitSelect((s) => ({ ...s, [e.id]: ev.target.value }))}
                          >
                            <option value="">{t('hrSpace.poolPickPosition', 'Score vs opening…')}</option>
                            {openPositions.map((p) => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="hr-mod-btn"
                            disabled={!poolFitSelect[e.id]}
                            onClick={() => {
                              const pid = poolFitSelect[e.id]
                              if (pid) recalculateTalentPoolFit(e.id, pid)
                            }}
                          >
                            {t('hrSpace.poolScore', 'Score')}
                          </button>
                          <input
                            className="hr-mod-table-notes-input"
                            defaultValue={e.notes || ''}
                            placeholder={t('hrSpace.notes', 'Notes')}
                            onBlur={(ev) => updateTalentPoolEntry(e.id, { notes: ev.target.value })}
                          />
                          <button type="button" className="hr-mod-btn hr-mod-btn--danger" onClick={() => removeTalentPoolEntry(e.id)}>{t('hrSpace.delete', 'Delete')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}

        {cvPreview && (
          <div className="hm-modal-overlay" style={{ zIndex: 7000 }} role="dialog" aria-modal>
            <div className="hm-modal hm-modal--wide hm-modal--cv-preview" onClick={(ev) => ev.stopPropagation()}>
              <div className="hm-modal-header">
                <h3>{t('hrSpace.cvPreviewTitle', 'CV preview')} — {cvPreview.title}</h3>
                <button type="button" className="hm-modal-close" onClick={closeCvPreview}>×</button>
              </div>
              <div className="hm-modal-body">
                {cvPreview.textPreview != null ? (
                  <pre className="hr-cv-preview-text">{cvPreview.textPreview}</pre>
                ) : cvPreview.url && String(cvPreview.mimeType || '').toLowerCase().includes('pdf') ? (
                  <div>
                    <iframe
                      className="hr-cv-preview-iframe"
                      title={cvPreview.title}
                      src={`${cvPreview.url}#toolbar=1`}
                    />
                    <p className="hr-emp-prof-hint" style={{ padding: '8px 16px', margin: 0 }}>
                      <a href={cvPreview.url} target="_blank" rel="noopener noreferrer">
                        {t('hrSpace.cvOpenNewTab', 'Open PDF in a new tab')}
                      </a>
                      {' · '}
                      <a href={cvPreview.url} download={cvPreview.title || 'cv.pdf'}>
                        {t('hrSpace.download', 'Download')}
                      </a>
                    </p>
                  </div>
                ) : cvPreview.url && String(cvPreview.mimeType || '').startsWith('image/') ? (
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <img className="hr-cv-preview-img" src={cvPreview.url} alt="" />
                  </div>
                ) : cvPreview.url ? (
                  <div style={{ padding: 24 }}>
                    <p>{t('hrSpace.cvPreviewDownload', 'This file type is best opened externally.')}</p>
                    <a className="hr-mod-btn hr-mod-btn--primary" href={cvPreview.url} download={cvPreview.title}>{t('hrSpace.download', 'Download')}</a>
                    {' '}
                    <a className="hr-mod-btn" href={cvPreview.url} target="_blank" rel="noopener noreferrer">{t('hrSpace.cvOpenNewTab', 'Open in new tab')}</a>
                  </div>
                ) : (
                  <p style={{ padding: 16 }}>{t('hrSpace.cvPreviewEmpty', 'Nothing to display.')}</p>
                )}
              </div>
              <div className="hm-modal-footer">
                <button type="button" className="hm-modal-cancel" onClick={closeCvPreview}>{t('hrSpace.close', 'Close')}</button>
              </div>
            </div>
          </div>
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
