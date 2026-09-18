import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import {
  filterAuditProAuditsForVisibility,
  filterAuditProAuditorsForVisibility,
  filterAuditProSuppliersForVisibility,
} from '../../data/auditProDemoKit'
import { Btn } from './auditProUi'
import { AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'
import { sellerSiteCode } from '../../utils/auditorsAssignmentPool'
import { formatAuditDateLabel, toAuditDateInput } from '../../utils/companyExternalAudit'
import { useTranslation } from '../../i18n/useTranslation'
import {
  auditResult,
  buildCapaRows,
  buildFindingsReports,
  findingCounts,
  sellerIsSuspended,
  yearComparison,
} from '../../utils/auditProgrammeViews'

export default function AuditProSellerRecord() {
  const { supplierId } = useParams()
  const navigate = useNavigate()
  const { language } = useTranslation()
  const auditsAll = useAuditProStore((s) => s.audits)
  const auditorsAll = useAuditProStore((s) => s.auditors)
  const suppliersAll = useAuditProStore((s) => s.suppliers)
  const demoKitShown = useAuditProDemoKitVisible()
  const audits = useMemo(
    () => filterAuditProAuditsForVisibility(auditsAll, auditorsAll, suppliersAll, demoKitShown),
    [auditsAll, auditorsAll, suppliersAll, demoKitShown],
  )
  const auditors = useMemo(
    () => filterAuditProAuditorsForVisibility(auditorsAll, demoKitShown),
    [auditorsAll, demoKitShown],
  )
  const suppliers = useMemo(
    () => filterAuditProSuppliersForVisibility(suppliersAll, demoKitShown),
    [suppliersAll, demoKitShown],
  )
  const supplier = suppliers.find((s) => s.id === supplierId)
  if (!supplierId) return <Navigate to={`${AUDITORS_DIRECTORY_ALIAS}/suppliers?view=records`} replace />
  if (!supplier) {
    return (
      <div className="ap-prog">
        <p className="ap-dir-empty">Seller record was not found in this workspace.</p>
        <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/suppliers?view=records`)}>← Back</Btn>
      </div>
    )
  }

  const sellerAudits = audits.filter((a) => a.supplierId === supplier.id)
  const reports = buildFindingsReports({ audits: sellerAudits, suppliers, auditors, language })
  const capa = buildCapaRows({ audits: sellerAudits, suppliers, auditors })
  const openNc = capa.filter((r) => r.open).length
  const comparison = yearComparison(supplier.id, sellerAudits, language)
  const nextAudit = sellerAudits
    .filter((a) => a.status !== 'Completed' && a.status !== 'Cancelled' && toAuditDateInput(a.plannedDate))
    .sort((a, b) => String(a.plannedDate).localeCompare(String(b.plannedDate)))[0]
  const latestCompleted = [...sellerAudits]
    .filter((a) => a.status === 'Completed')
    .sort((a, b) => String(b.completedDate || b.plannedDate).localeCompare(String(a.completedDate || a.plannedDate)))[0]
  const latestResult = latestCompleted ? auditResult(latestCompleted, language) : null
  const suspended = sellerIsSuspended(reports)
  const selfScore = latestCompleted ? auditResult(latestCompleted, language).score : null
  const code = sellerSiteCode(supplier)

  return (
    <div className="ap-prog ap-record">
      <div className="ap-dir-actions">
        <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/suppliers?view=records`)}>← Company records</Btn>
        {latestCompleted ? (
          <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${latestCompleted.id}?doc=closing`)}>
            Print closing report
          </Btn>
        ) : null}
        {latestCompleted && latestResult && latestResult.key !== 'rejected' ? (
          <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${latestCompleted.id}?doc=certificate`)}>
            Print certificate
          </Btn>
        ) : null}
      </div>

      <p className="ap-prog-kicker">{code}</p>
      <h2 className="ap-prog-title stx-text-wrap">{supplier.name}</h2>
      <div className="ap-dir-actions">
        {suspended ? <span className="ap-result ap-result--rejected">Suspended</span> : null}
        {supplier.industry ? <span className="ap-pool-chip is-on">{supplier.industry}</span> : null}
        <span className="ap-pool-chip">{[supplier.country, supplier.city].filter(Boolean).join(' · ') || 'Site not set'}</span>
      </div>

      <div className="ap-report-facts">
        <article><div className="ap-pool-kpi-label">Registered</div><div className="ap-fact">{formatAuditDateLabel(supplier.registeredAt) || '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Commodity</div><div className="ap-fact stx-text-wrap">{supplier.notes || supplier.industry || '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Contact</div><div className="ap-fact stx-text-wrap">{supplier.contact || supplier.email || '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Approval until</div><div className="ap-fact">{suspended ? '—' : formatAuditDateLabel(latestCompleted?.nextAuditDate) || '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Audit interval</div><div className="ap-fact">{suspended ? 'On hold' : '12 months'}</div></article>
        <article><div className="ap-pool-kpi-label">Next audit</div><div className="ap-fact">{formatAuditDateLabel(nextAudit?.plannedDate) || '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Open non-conformities</div><div className="ap-fact">{openNc} open</div></article>
        <article>
          <div className="ap-pool-kpi-label">Self-assessment</div>
          <div className="ap-fact">{selfScore != null ? `Returned · ${selfScore}%` : 'Issued'}</div>
        </article>
      </div>

      <section>
        <div className="ap-capacity-kicker">Audit history comparison</div>
        {comparison.years.length < 1 ? (
          <p className="ap-dir-empty">Complete at least one visit to compare element scores by year.</p>
        ) : (
          <div className="ap-pool-table-wrap">
            <table className="ap-pool-table">
              <thead>
                <tr>
                  <th>Element</th>
                  {comparison.years.map((y) => <th key={y}>{y}</th>)}
                  <th>Δ</th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row) => (
                  <tr key={row.name} className={(row.delta || 0) < 0 ? 'ap-regressed' : ''}>
                    <td className="stx-text-wrap">{row.name}</td>
                    {comparison.years.map((y) => (
                      <td key={y}>{row.years[y] != null ? `${row.years[y]}%` : '—'}</td>
                    ))}
                    <td>{row.delta == null ? '—' : row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                  </tr>
                ))}
                <tr>
                  <td>Overall conformity</td>
                  {comparison.overall.map((o) => (
                    <td key={o.year}>{o.score != null ? `${o.score}%` : '—'}</td>
                  ))}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="ap-pool-sub">
          {comparison.improved} elements improved, {comparison.regressed} regressed
          {comparison.years.length === 2 ? ` since ${comparison.years[0]}` : ''}.
          Regressed elements are mandatory scope on the next visit.
        </p>
      </section>

      <div className="ap-report-split">
        <section>
          <div className="ap-capacity-kicker">Audit &amp; report history</div>
          {reports.length === 0 ? (
            <p className="ap-dir-empty">No signed reports yet.</p>
          ) : reports.map((row) => {
            const counts = findingCounts(row.audit.findings)
            return (
              <article key={row.id} className="ap-finding-card">
                <div className="ap-finding-head">
                  <span>{formatAuditDateLabel(row.date)}</span>
                  <span>{row.kind}</span>
                  <span>{row.score != null ? `${row.score}%` : '—'}</span>
                </div>
                <div className="ap-pool-sub stx-text-wrap">
                  {row.reportNo} · {row.auditorLabel} · {counts.major} maj / {counts.minor} min / {counts.obs} obs · CAPA {counts.open} open
                </div>
                <div className="ap-dir-actions">
                  <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/findings/${row.id}`)}>Findings report</Btn>
                  <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${row.id}?doc=closing`)}>Print closing report</Btn>
                </div>
              </article>
            )
          })}
        </section>
        <section className="ap-report-card">
          <div className="ap-capacity-kicker">Standards in relation to this seller</div>
          {[...new Set(sellerAudits.map((a) => a.standard).filter(Boolean))].map((std) => (
            <div key={std} className="ap-cert-row"><div className="ap-pool-seller">{std}</div></div>
          ))}
          {capa.filter((r) => r.open).slice(0, 6).map((r) => (
            <div key={r.id} className="ap-pool-sub stx-text-wrap">{r.findingNo} · {r.clause} · {r.open ? 'open' : 'closed'}</div>
          ))}
        </section>
      </div>
    </div>
  )
}
