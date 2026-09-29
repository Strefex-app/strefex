import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'
import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { utcTodayIso } from '../../utils/auditorsAssignmentPool'
import { sellerCompanyName } from '../../utils/auditSellerLabel'
import { formatDisplayLabel } from '../../utils/displayLabel'
import { sellerBoardStatus } from '../../utils/auditJourney'
import {
  buildCompanyScorecards,
  buildRegisterRows,
  buildStrefexCertificates,
} from '../../utils/auditSupplierRegister'
import {
  buildCapaRows,
  buildFindingsReports,
  capaKpis,
  findingCounts,
  findingsKpis,
} from '../../utils/auditProgrammeViews'

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
  if (key === 'approved' || key === 'returned' || key === 'valid' || key === 'audited' || key === 'closed') {
    return 'ap-result ap-result--approved'
  }
  if (key === 'conditional' || key === 'expiring' || key === 'reaudit' || key === 'action') {
    return 'ap-result ap-result--conditional'
  }
  if (key === 'overdue' || key === 'expired' || key === 'rejected' || key === 'new') {
    return 'ap-result ap-result--rejected'
  }
  if (key === 'scheduled' || key === 'issued' || key === 'planned' || key === 'pre') {
    return 'ap-result ap-result--issued'
  }
  return 'ap-result ap-result--planned'
}

const RECORD_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'audited', label: 'Audited' },
  { id: 'action', label: 'Action plan needed' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'reports', label: 'Reports' },
]

export default function AuditProSupplierHub({
  suppliers,
  audits,
  auditors,
  language = 'en',
}) {
  const navigate = useNavigate()
  const todayIso = utcTodayIso()
  const [query, setQuery] = useState('')
  const [recFilter, setRecFilter] = useState('all')

  const registerRows = useMemo(
    () => buildRegisterRows({ suppliers, audits, todayIso, language }),
    [suppliers, audits, todayIso, language],
  )
  const reports = useMemo(
    () => buildFindingsReports({ audits, suppliers, auditors, language }),
    [audits, suppliers, auditors, language],
  )
  const capa = useMemo(
    () => buildCapaRows({ audits, suppliers, auditors, todayIso }),
    [audits, suppliers, auditors, todayIso],
  )
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
  const reportKpis = findingsKpis(reports)
  const actionKpis = capaKpis(capa)

  const workRows = useMemo(() => {
    return registerRows
      .map((row) => {
        const sellerReports = reports.filter((r) => r.supplier?.id === row.id || r.supplierId === row.id)
        const sellerCapa = capa.filter((r) => r.supplierId === row.id)
        const openPlans = sellerCapa.filter((r) => r.open)
        const overduePlans = openPlans.filter((r) => r.overdue)
        const cert = certs.find((c) => c.supplier?.id === row.id)
        const score = scorecards.find((s) => s.id === row.id)
        const latestReport = sellerReports[0] || null
        const findings = latestReport ? findingCounts(latestReport.audit?.findings) : { major: 0, minor: 0, open: 0 }
        const board = sellerBoardStatus(row.latest || row.planned, row.supplier)
        const done = board.id === 'audited' || sellerReports.length > 0 || Boolean(score)
        if (!done) return null
        const statusId = overduePlans.length
          ? 'overdue'
          : openPlans.length
            ? 'action'
            : cert?.state === 'expiring' || cert?.state === 'expired'
              ? cert.state
              : 'audited'
        const statusLabel = overduePlans.length
          ? 'Action plan overdue'
          : openPlans.length
            ? 'Action plan needed'
            : cert?.state === 'expiring'
              ? 'Certificate expiring'
              : cert?.state === 'expired'
                ? 'Certificate expired'
                : 'Audited'
        return {
          ...row,
          board,
          sellerReports,
          openPlans,
          overduePlans,
          cert,
          score,
          latestReport,
          findings,
          statusId,
          statusLabel,
        }
      })
      .filter(Boolean)
  }, [registerRows, reports, capa, certs, scorecards])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return workRows.filter((row) => {
      if (recFilter === 'audited' && row.statusId !== 'audited') return false
      if (recFilter === 'action' && row.openPlans.length === 0) return false
      if (recFilter === 'overdue' && row.overduePlans.length === 0) return false
      if (recFilter === 'reports' && row.sellerReports.length === 0) return false
      if (!q) return true
      return [row.name, row.email, row.code, row.site, row.industry].join(' ').toLowerCase().includes(q)
    })
  }, [workRows, query, recFilter])

  const filterCounts = useMemo(() => ({
    all: workRows.length,
    audited: workRows.filter((r) => r.statusId === 'audited').length,
    action: workRows.filter((r) => r.openPlans.length > 0).length,
    overdue: workRows.filter((r) => r.overduePlans.length > 0).length,
    reports: workRows.filter((r) => r.sellerReports.length > 0).length,
  }), [workRows])

  const openRecord = (supplierId) => {
    if (!supplierId) return
    navigate(`${AUDITORS_DIRECTORY_ALIAS}/record/${encodeURIComponent(supplierId)}`)
  }
  const printClosing = (auditId) => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${encodeURIComponent(auditId)}?doc=closing`)
  const printCert = (auditId) => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${encodeURIComponent(auditId)}?doc=certificate`)

  return (
    <div className="ap-suphub">
      <div className="stx-indicator-strip ap-pool-kpis">
        <article className="ap-pool-kpi ap-pool-kpi--ok">
          <div className="ap-pool-kpi-label">Suppliers on record</div>
          <div className="ap-pool-kpi-value">{workRows.length}</div>
          <div className="ap-pool-kpi-hint">{filterCounts.audited} closed without open plans</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--info">
          <div className="ap-pool-kpi-label">Reports</div>
          <div className="ap-pool-kpi-value">{reportKpis.reports}</div>
          <div className="ap-pool-kpi-hint">{certs.length} certificates on file</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--warn">
          <div className="ap-pool-kpi-label">Action plans open</div>
          <div className="ap-pool-kpi-value">{actionKpis.open}</div>
          <div className="ap-pool-kpi-hint">{actionKpis.suppliersAffected} suppliers</div>
        </article>
        <article className="ap-pool-kpi ap-pool-kpi--danger">
          <div className="ap-pool-kpi-label">Overdue</div>
          <div className="ap-pool-kpi-value">{actionKpis.overdue}</div>
          <div className="ap-pool-kpi-hint">{actionKpis.majorLate} major past lead time</div>
        </article>
      </div>

      <div className="ap-suphub-toolbar">
        <input
          className="ap-suphub-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search supplier, country or code"
          aria-label="Search records"
        />
        <div className="ap-suphub-filters" role="group" aria-label="Record status">
          {RECORD_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`ap-suphub-chip${recFilter === f.id ? ' is-on' : ''}`}
              onClick={() => setRecFilter(f.id)}
            >
              {f.label}{filterCounts[f.id] != null ? ` · ${filterCounts[f.id]}` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="ap-suphub-table-wrap">
        <table className="ap-suphub-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Status</th>
              <th>Last visit</th>
              <th>Score</th>
              {scoreYears.map((y) => <th key={y}>{y}</th>)}
              <th>Findings</th>
              <th>Action plan</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={7 + scoreYears.length} className="ap-pool-empty">
                  No completed visits yet. Planned work stays on Calendar.
                </td>
              </tr>
            ) : shown.map((row) => (
              <tr key={row.id}>
                <td>
                  <button type="button" className="ap-suphub-name" onClick={() => openRecord(row.id)}>
                    {sellerCompanyName(row.supplier) || row.name}
                  </button>
                  <div className="ap-pool-sub stx-text-wrap">{row.email || row.site || formatDisplayLabel(row.industry) || '—'}</div>
                </td>
                <td><span className={statusClass(row.statusId)}>{row.statusLabel}</span></td>
                <td>{formatAuditDateLabel(row.latestReport?.date || row.latest?.completedDate || row.planned?.plannedDate) || '—'}</td>
                <td>{row.score?.score != null ? `${row.score.score}%` : row.latestReport?.score != null ? `${row.latestReport.score}%` : '—'}</td>
                {scoreYears.map((y) => (
                  <td key={`${row.id}-${y}`}>
                    {row.score?.comparison.overall.find((o) => o.year === y)?.score != null
                      ? `${row.score.comparison.overall.find((o) => o.year === y).score}%`
                      : '—'}
                  </td>
                ))}
                <td>
                  {row.findings.major || row.findings.minor
                    ? `${row.findings.major} maj / ${row.findings.minor} min`
                    : '—'}
                </td>
                <td>
                  {row.openPlans.length
                    ? <span className={statusClass(row.overduePlans.length ? 'overdue' : 'action')}>
                        {row.overduePlans.length ? `${row.overduePlans.length} overdue` : `${row.openPlans.length} open`}
                      </span>
                    : <span className={statusClass('closed')}>Closed</span>}
                </td>
                <td className="ap-suphub-actions">
                  {row.latestReport ? (
                    <>
                      <HubBtn filled onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/findings/${encodeURIComponent(row.latestReport.id)}`)}>
                        Findings
                      </HubBtn>
                      <HubBtn onClick={() => printClosing(row.latestReport.id)}>Signature report</HubBtn>
                    </>
                  ) : (
                    <HubBtn filled onClick={() => openRecord(row.id)}>Open</HubBtn>
                  )}
                  {row.cert ? <HubBtn onClick={() => printCert(row.cert.id)}>Certificate</HubBtn> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
