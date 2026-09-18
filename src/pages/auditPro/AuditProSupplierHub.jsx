import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'
import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { utcTodayIso } from '../../utils/auditorsAssignmentPool'
import {
  buildCompanyScorecards,
  buildRegisterRows,
  buildSelfAssessmentPipeline,
  buildSelfAssessmentTracker,
  buildStrefexCertificates,
  filterPipeline,
  filterRegisterByQueryAndStatus,
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
  if (key === 'action' || key === 'overdue' || key === 'expired' || key === 'rejected') return 'ap-result ap-result--rejected'
  if (key === 'scheduled' || key === 'issued' || key === 'planned') return 'ap-result ap-result--issued'
  return 'ap-result ap-result--planned'
}

const REGISTER_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'conditional', label: 'Conditional' },
  { id: 'action', label: 'Needs action' },
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

  const registerRows = useMemo(
    () => buildRegisterRows({ suppliers, audits, todayIso, language }),
    [suppliers, audits, todayIso, language],
  )
  const shownRegister = useMemo(
    () => filterRegisterByQueryAndStatus(registerRows, query, regFilter),
    [registerRows, query, regFilter],
  )
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

  return (
    <div className="ap-suphub">
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
            <div className="ap-suphub-filters" role="group" aria-label="Approval filter">
              {REGISTER_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`ap-suphub-chip${regFilter === f.id ? ' is-on' : ''}`}
                  onClick={() => setRegFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <HubBtn filled onClick={onRegister}>Register supplier</HubBtn>
          </div>
          <div className="ap-suphub-table-wrap">
            <table className="ap-suphub-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Supplier</th>
                  <th>Industry / process</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Self-assessment</th>
                  <th>Score</th>
                  <th>Approval until</th>
                  {superadminRole ? <th>Workspace</th> : null}
                  <th />
                </tr>
              </thead>
              <tbody>
                {shownRegister.length === 0 ? (
                  <tr><td colSpan={superadminRole ? 10 : 9} className="ap-pool-empty">No suppliers match this filter.</td></tr>
                ) : shownRegister.map((row) => (
                  <tr key={row.id}>
                    <td>{row.code}</td>
                    <td>
                      <div className="ap-pool-seller stx-text-wrap">{row.name}</div>
                      <div className="ap-pool-sub">{row.site || '—'}</div>
                    </td>
                    <td>
                      <div className="stx-text-wrap">{row.industry}</div>
                      <div className="ap-pool-sub stx-text-wrap">{row.process}</div>
                    </td>
                    <td>{formatAuditDateLabel(row.registeredAt) || '—'}</td>
                    <td><span className={statusClass(row.status.key)}>{row.status.label}</span></td>
                    <td className={row.selfAssessment?.key === 'overdue' ? 'ap-suphub-late' : ''}>{row.selfLabel}</td>
                    <td>{row.score != null ? `${row.score}%` : '—'}</td>
                    <td className={row.expiring ? 'ap-suphub-late' : ''}>{formatAuditDateLabel(row.approvalUntil) || '—'}</td>
                    {superadminRole ? (
                      <td className="ap-pool-sub">{row.supplier._readOnlyPeer ? 'Peer' : 'This workspace'}</td>
                    ) : null}
                    <td className="ap-suphub-actions">
                      <HubBtn onClick={() => openRecord(row.id)}>Record</HubBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                        <div className="ap-pool-sub">{row.code} · {row.site || '—'}</div>
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
