import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'
import { formatAuditDateLabel, normalizeAuditEmail } from '../../utils/companyExternalAudit'
import { utcTodayIso } from '../../utils/auditorsAssignmentPool'
import { sellerCompanyName, auditDaysForStandard, defaultSellerStandard } from '../../utils/auditSellerLabel'
import { STANDARD_MODULES } from '../../data/auditIndustryStandards'
import {
  JOURNEY_STEPS,
  SELLER_BOARD,
  journeyStage,
  journeyStepIndex,
  openAuditForSeller,
  sellerBoardStatus,
} from '../../utils/auditJourney'
import {
  planSellerAudit,
  uploadClosingReport,
} from './auditJourneyActions'
import {
  buildCompanyScorecards,
  buildRegisterRows,
  buildSelfAssessmentPipeline,
  buildSelfAssessmentTracker,
  buildStrefexCertificates,
  filterPipeline,
  pipelineCounts,
  trackerKpis,
} from '../../utils/auditSupplierRegister'

function HubBtn({ children, filled, onClick, ...rest }) {
  return (
    <button
      type="button"
      className={`ap-suphub-btn${filled ? ' is-fill' : ''}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}

function statusClass(key) {
  if (key === 'approved' || key === 'returned' || key === 'valid') return 'ap-result ap-result--approved'
  if (key === 'conditional' || key === 'expiring' || key === 'reaudit') return 'ap-result ap-result--conditional'
  if (key === 'action' || key === 'overdue' || key === 'expired' || key === 'rejected' || key === 'new') return 'ap-result ap-result--rejected'
  if (key === 'scheduled' || key === 'issued' || key === 'planned' || key === 'pre') return 'ap-result ap-result--issued'
  return 'ap-result ap-result--planned'
}

const REGISTER_FILTERS = [
  { id: 'all', label: 'All' },
  ...SELLER_BOARD,
]

export default function AuditProSupplierHub({
  suppliers,
  audits,
  auditors,
  language = 'en',
  onRegister,
  onRemind,
  superadminRole,
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = ['register', 'self', 'certs', 'records'].includes(searchParams.get('view'))
    ? searchParams.get('view')
    : 'register'
  const todayIso = utcTodayIso()
  const [query, setQuery] = useState('')
  const [regFilter, setRegFilter] = useState('all')
  const [pipeFilter, setPipeFilter] = useState('all')
  const [selectedAuditId, setSelectedAuditId] = useState('')
  const [pickedId, setPickedId] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [standardPick, setStandardPick] = useState('')
  const [busy, setBusy] = useState(false)
  const [flowMsg, setFlowMsg] = useState('')
  const authEmail = useAuthStore((s) => String(s.user?.email || '').toLowerCase())

  const registerRows = useMemo(
    () => buildRegisterRows({ suppliers, audits, todayIso, language }),
    [suppliers, audits, todayIso, language],
  )
  const boardRows = useMemo(
    () => registerRows.map((row) => {
      const audit = openAuditForSeller(audits, row.id)
      return { ...row, audit, board: sellerBoardStatus(audit, row.supplier) }
    }),
    [registerRows, audits],
  )
  const shownRegister = useMemo(() => {
    const q = query.trim().toLowerCase()
    return boardRows.filter((row) => {
      if (regFilter !== 'all' && row.board.id !== regFilter) return false
      if (!q) return true
      return [row.name, row.email, row.code, row.site, row.industry].join(' ').toLowerCase().includes(q)
    })
  }, [boardRows, query, regFilter])
  const boardCounts = useMemo(() => {
    const c = { all: boardRows.length }
    SELLER_BOARD.forEach((b) => { c[b.id] = boardRows.filter((r) => r.board.id === b.id).length })
    return c
  }, [boardRows])
  const pipeline = useMemo(
    () => buildSelfAssessmentPipeline({ audits, suppliers, todayIso, language }),
    [audits, suppliers, todayIso, language],
  )
  const shownPipeline = useMemo(() => filterPipeline(pipeline, pipeFilter), [pipeline, pipeFilter])
  const pipeCounts = pipelineCounts(pipeline)
  const tracker = useMemo(
    () => buildSelfAssessmentTracker({ suppliers, audits, todayIso, language }),
    [suppliers, audits, todayIso, language],
  )
  const tKpis = trackerKpis(tracker)
  const certs = useMemo(
    () => buildStrefexCertificates({ suppliers, audits, todayIso, language }),
    [suppliers, audits, todayIso, language],
  )
  const scorecards = useMemo(
    () => buildCompanyScorecards({ suppliers, audits, auditors, language }),
    [suppliers, audits, auditors, language],
  )
  const scoreYears = useMemo(() => {
    const years = new Set()
    scorecards.forEach((row) => (row.comparison.years || []).forEach((y) => years.add(y)))
    return [...years].sort()
  }, [scorecards])

  const setView = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'register') params.delete('view')
    else params.set('view', next)
    setSearchParams(params)
  }

  const tabs = [
    { id: 'register', label: 'Register', count: registerRows.length },
    { id: 'self', label: 'Self-assessment', count: pipeCounts.overdue },
    { id: 'certs', label: 'Certificates' },
    { id: 'records', label: 'Company records' },
  ]

  const openRecord = (supplierId) => navigate(`${AUDITORS_DIRECTORY_ALIAS}/record/${encodeURIComponent(supplierId)}`)
  const printClosing = (auditId) => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${encodeURIComponent(auditId)}?doc=closing`)
  const printCert = (auditId) => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${encodeURIComponent(auditId)}?doc=certificate`)

  const picked = (suppliers || []).find((s) => s.id === pickedId) || null
  const pickedAudit = picked ? openAuditForSeller(audits, picked.id) : null
  const pickedStage = journeyStage(pickedAudit, picked)
  const pickedBoard = sellerBoardStatus(pickedAudit, picked)
  const selfAuditor = (auditors || []).find((a) => normalizeAuditEmail(a.email) === authEmail) || null
  const lead = (auditors || []).find((a) => a.id === pickedAudit?.auditorId) || selfAuditor
  const standardOptions = STANDARD_MODULES.map((m) => m.name)
  const activeStandard = standardPick || pickedAudit?.standard || defaultSellerStandard(picked || {})
  const visitDays = auditDaysForStandard(activeStandard)

  const run = async (fn, ok) => {
    setBusy(true)
    setFlowMsg('')
    try {
      await fn()
      setFlowMsg(ok)
    } catch (err) {
      setFlowMsg(err?.message || 'Could not save that step.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ap-suphub">
      <ol className="ap-flow-steps" aria-label="Audit path">
        {JOURNEY_STEPS.map((step) => (
          <li
            key={step.id}
            className={`ap-flow-step${picked && journeyStepIndex(pickedStage.id) >= journeyStepIndex(step.id) ? ' is-on' : ''}`}
          >
            <span className="ap-flow-n">{step.n}</span>
            {step.label}
          </li>
        ))}
      </ol>
      <p className="ap-suphub-panel-copy stx-text-wrap">
        Click a New or Need action seller, pick the standard and visit date, then plan. Self-assessment goes out automatically. Drag unplanned sellers onto Calendar if you prefer.
      </p>

      <div className="ap-suphub-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            className={`ap-suphub-tab${view === tab.id ? ' is-on' : ''}`}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
            {tab.count ? <span className="ap-suphub-tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      {view === 'register' ? (
        <>
          <div className="ap-suphub-toolbar">
            <input
              className="ap-suphub-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search supplier, country or code"
              aria-label="Search supplier register"
            />
            <div className="ap-suphub-filters" role="group" aria-label="Seller status">
              {REGISTER_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`ap-suphub-chip${regFilter === f.id ? ' is-on' : ''}`}
                  onClick={() => setRegFilter(f.id)}
                >
                  {f.label}{boardCounts[f.id] != null ? ` · ${boardCounts[f.id]}` : ''}
                </button>
              ))}
            </div>
            <HubBtn filled onClick={onRegister}>Register supplier</HubBtn>
          </div>
          <div className="ap-suphub-table-wrap">
            <table className="ap-suphub-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th>Visit</th>
                  <th>Standard</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shownRegister.length === 0 ? (
                  <tr><td colSpan={6} className="ap-pool-empty">No sellers in this status.</td></tr>
                ) : shownRegister.map((row) => (
                  <tr
                    key={row.id}
                    className={pickedId === row.id ? 'is-selected' : ''}
                    onClick={() => {
                      setPickedId(row.id)
                      setStandardPick(row.audit?.standard || defaultSellerStandard(row.supplier))
                      setVisitDate(row.audit?.plannedDate || '')
                    }}
                  >
                    <td>
                      <div className="ap-pool-seller stx-text-wrap">{row.name}</div>
                      <div className="ap-pool-sub stx-text-wrap">{row.email || row.supplier?.email || '—'}</div>
                      {row.site ? <div className="ap-pool-sub">{row.site}</div> : null}
                    </td>
                    <td className="stx-text-wrap">{row.industry}</td>
                    <td><span className={statusClass(row.board.id)}>{row.board.label}</span></td>
                    <td>{formatAuditDateLabel(row.audit?.plannedDate) || '—'}</td>
                    <td className="stx-text-wrap">{row.audit?.standard || '—'}</td>
                    <td className="ap-suphub-actions">
                      <HubBtn onClick={(e) => { e.stopPropagation(); openRecord(row.id) }}>Record</HubBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {picked ? (
            <section className="ap-suphub-panel" style={{ marginTop: 14 }}>
              <div className="ap-suphub-panel-kicker">{pickedBoard.label} · {sellerCompanyName(picked)}</div>
              <p className="ap-suphub-panel-copy stx-text-wrap">{pickedStage.label}.</p>
              <div className="ap-suphub-actions" style={{ flexWrap: 'wrap' }}>
                {(pickedBoard.id === 'new' || pickedBoard.id === 'action' || pickedStage.action === 'plan') ? (
                  <>
                    <select
                      className="ap-select"
                      value={activeStandard}
                      onChange={(e) => setStandardPick(e.target.value)}
                      aria-label="Audit standard"
                    >
                      {standardOptions.map((name) => (
                        <option key={name} value={name}>{name} · {auditDaysForStandard(name)}d</option>
                      ))}
                    </select>
                    <input
                      className="ap-input"
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      aria-label="Visit date"
                    />
                    <HubBtn
                      filled
                      disabled={busy || !visitDate || !lead}
                      onClick={() => run(
                        () => planSellerAudit({ supplier: picked, date: visitDate, auditor: lead, standard: activeStandard }),
                        `Visit planned for ${visitDate} (${visitDays} day${visitDays === 1 ? '' : 's'}). Self-assessment sent. Check Calendar.`,
                      )}
                    >
                      Plan visit · send self-assessment
                    </HubBtn>
                  </>
                ) : null}
                {pickedAudit?.id ? (
                  <HubBtn
                    filled={pickedStage.action === 'conduct'}
                    onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/conduct/${encodeURIComponent(pickedAudit.id)}?tab=questionnaire&qn=list`)}
                  >
                    Open questionnaire
                  </HubBtn>
                ) : null}
                {pickedBoard.id === 'scheduled' ? (
                  <HubBtn onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/calendar`)}>Open calendar</HubBtn>
                ) : null}
                {pickedAudit ? (
                  <label className={`ap-suphub-btn${pickedStage.action === 'upload' ? ' is-fill' : ''}`}>
                    Upload closing report
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      hidden
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (!file) return
                        void run(
                          () => uploadClosingReport({ audit: pickedAudit, supplier: picked, auditor: lead, file }),
                          'Closing report stored. Seller marked Audited.',
                        )
                      }}
                    />
                  </label>
                ) : null}
              </div>
              {flowMsg ? <p className="ap-suphub-caption stx-text-wrap">{flowMsg}</p> : null}
            </section>
          ) : (
            <p className="ap-suphub-caption">Select a New or Need action seller to plan a visit. Self-assessment is sent when you set the date.</p>
          )}
        </>
      ) : null}

      {view === 'self' ? (
        <>
          <section className="ap-suphub-panel">
            <div className="ap-suphub-panel-kicker">Step 1 · Select from the audit pipeline</div>
            <p className="ap-suphub-panel-copy stx-text-wrap">
              Pick the audit the questionnaire is being issued for. The reason for the audit sets which standard modules the supplier must answer and how much notice they get.
            </p>
            <div className="ap-suphub-filters" role="group" aria-label="Pipeline filter">
              {[
                { id: 'all', label: `All · ${pipeCounts.all}` },
                { id: 'overdue', label: `Overdue · ${pipeCounts.overdue}` },
                { id: 'new', label: `New supplier · ${pipeCounts.new}` },
                { id: 'reaudit', label: `Re-audit · ${pipeCounts.reaudit}` },
                { id: 'annual', label: `Annual · ${pipeCounts.annual}` },
              ].map((f) => (
                <button key={f.id} type="button" className={`ap-suphub-chip${pipeFilter === f.id ? ' is-on' : ''}`} onClick={() => setPipeFilter(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="ap-suphub-table-wrap is-flush">
              <table className="ap-suphub-table">
                <thead>
                  <tr>
                    <th className="ap-suphub-radio" />
                    <th>Company</th>
                    <th>Audit reason</th>
                    <th>Audit type</th>
                    <th>Planned date</th>
                    <th>Issue by</th>
                    <th>Modules in scope</th>
                    <th>Questionnaire</th>
                  </tr>
                </thead>
                <tbody>
                  {shownPipeline.length === 0 ? (
                    <tr><td colSpan={8} className="ap-pool-empty">No audits in this pipeline.</td></tr>
                  ) : shownPipeline.map((row) => (
                    <tr key={row.id} className={selectedAuditId === row.id ? 'is-selected' : ''}>
                      <td className="ap-suphub-radio">
                        <input
                          type="radio"
                          name="ap-pipe"
                          checked={selectedAuditId === row.id}
                          onChange={() => setSelectedAuditId(row.id)}
                          aria-label={`Select ${row.supplierName}`}
                        />
                      </td>
                      <td>
                        <div className="ap-pool-seller stx-text-wrap">{row.supplierName}</div>
                        <div className="ap-pool-sub">{row.supplier?.email || row.code}{row.site ? ` · ${row.site}` : ''}</div>
                      </td>
                      <td>
                        <span className={statusClass(row.overdue ? 'overdue' : row.reason.id)}>
                          {row.overdue ? 'OVERDUE' : row.reason.label}
                        </span>
                      </td>
                      <td>{row.auditType}</td>
                      <td>
                        {formatAuditDateLabel(row.plannedDate) || '—'}
                        {row.previousDate && row.previousDate !== row.plannedDate ? (
                          <div className="ap-pool-sub">(was {formatAuditDateLabel(row.previousDate)})</div>
                        ) : null}
                      </td>
                      <td>{formatAuditDateLabel(row.issueBy) || '—'}</td>
                      <td className="stx-text-wrap">{row.modules}</td>
                      <td className={row.state.key === 'overdue' ? 'ap-suphub-late' : ''}>{row.questionnaire}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selectedAuditId ? (
              <div className="ap-suphub-actions" style={{ marginTop: 12 }}>
                <HubBtn filled onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/conduct/${encodeURIComponent(selectedAuditId)}`)}>
                  Open questionnaire
                </HubBtn>
                <HubBtn onClick={() => printClosing(selectedAuditId)}>Print closing report</HubBtn>
              </div>
            ) : null}
          </section>

          <p className="ap-suphub-caption">
            {tKpis.out} out with the supplier · {tKpis.overdue} overdue · {tKpis.returned} returned and scored
          </p>
          <div className="ap-suphub-table-wrap">
            <table className="ap-suphub-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Issued</th>
                  <th>Due back</th>
                  <th>State</th>
                  <th>Self-score</th>
                  <th>To verify</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tracker.length === 0 ? (
                  <tr><td colSpan={7} className="ap-pool-empty">No self-assessments issued yet.</td></tr>
                ) : tracker.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="ap-pool-seller stx-text-wrap">{row.name}</div>
                      <div className="ap-pool-sub">{row.code} · {row.site || '—'}</div>
                    </td>
                    <td>{formatAuditDateLabel(row.issued) || '—'}</td>
                    <td className={row.state?.key === 'overdue' ? 'ap-suphub-late' : ''}>{formatAuditDateLabel(row.dueBack) || '—'}</td>
                    <td><span className={statusClass(row.state?.key)}>{row.state?.label || '—'}</span></td>
                    <td>{row.score != null ? `${row.score}%` : '—'}</td>
                    <td className={row.toVerify ? 'ap-suphub-verify' : ''}>{row.toVerify != null && row.toVerify > 0 ? row.toVerify : '—'}</td>
                    <td className="ap-suphub-actions">
                      {row.state?.key === 'returned' ? (
                        <HubBtn onClick={() => openRecord(row.id)}>Open record</HubBtn>
                      ) : (
                        <HubBtn filled onClick={() => onRemind?.(row)}>Send reminder</HubBtn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {view === 'certs' ? (
        <>
          <div className="ap-suphub-panel-kicker">Issued by STREFEX</div>
          <div className="ap-suphub-table-wrap">
            <table className="ap-suphub-table">
              <thead>
                <tr>
                  <th>Certificate</th>
                  <th>Supplier</th>
                  <th>Scope</th>
                  <th>Issued</th>
                  <th>Valid to</th>
                  <th>State</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {certs.length === 0 ? (
                  <tr><td colSpan={7} className="ap-pool-empty">No STREFEX certificates yet — complete an audit with a passing result.</td></tr>
                ) : certs.map((row) => (
                  <tr key={row.id}>
                    <td>{row.certNo}</td>
                    <td>
                      <button type="button" className="ap-suphub-name" onClick={() => openRecord(row.supplier?.id)}>{row.supplierName}</button>
                    </td>
                    <td className="stx-text-wrap">{row.scope}</td>
                    <td>{formatAuditDateLabel(row.issued) || '—'}</td>
                    <td className={row.state === 'expiring' || row.state === 'expired' ? 'ap-suphub-late' : ''}>
                      {formatAuditDateLabel(row.validTo) || '—'}
                    </td>
                    <td><span className={statusClass(row.state)}>{row.state === 'valid' ? 'VALID' : row.state === 'expiring' ? 'EXPIRING' : 'EXPIRED'}</span></td>
                    <td className="ap-suphub-actions"><HubBtn onClick={() => printCert(row.id)}>Print</HubBtn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {view === 'records' ? (
        <div className="ap-suphub-table-wrap">
          <table className="ap-suphub-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Last audit</th>
                <th>Rating</th>
                <th>Score</th>
                {scoreYears.map((y) => <th key={y}>{y}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {scorecards.length === 0 ? (
                <tr><td colSpan={6 + scoreYears.length} className="ap-pool-empty">Complete a visit to raise a company scorecard.</td></tr>
              ) : scorecards.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="ap-pool-seller stx-text-wrap">{row.name}</div>
                    <div className="ap-pool-sub">{row.code} · {row.site || '—'}</div>
                  </td>
                  <td>{formatAuditDateLabel(row.latest?.completedDate || row.latest?.plannedDate) || '—'}</td>
                  <td><span className={statusClass(row.result?.key)}>{row.rating}</span></td>
                  <td>{row.score != null ? `${row.score}%` : '—'}</td>
                  {scoreYears.map((y) => (
                    <td key={`${row.id}-${y}`}>
                      {row.comparison.overall.find((o) => o.year === y)?.score != null
                        ? `${row.comparison.overall.find((o) => o.year === y).score}%`
                        : '—'}
                    </td>
                  ))}
                  <td className="ap-suphub-actions">
                    <HubBtn filled onClick={() => openRecord(row.id)}>Open</HubBtn>
                    <HubBtn onClick={() => printClosing(row.latest.id)}>Print closing report</HubBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
