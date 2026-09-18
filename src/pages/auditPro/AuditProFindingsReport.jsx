import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import useAuditProStore from '../../store/auditProStore'
import { useAuditProDemoKitVisible } from '../../hooks/useAuditProDemoKitVisible'
import { filterAuditProAuditsForVisibility, filterAuditProAuditorsForVisibility, filterAuditProSuppliersForVisibility } from '../../data/auditProDemoKit'
import { Btn } from './auditProUi'
import { AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'
import { sellerSiteCode } from '../../utils/auditorsAssignmentPool'
import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { useTranslation } from '../../i18n/useTranslation'
import {
  auditKindLabel,
  auditorCode,
  auditResult,
  findingCounts,
  reportNumber,
  sectionScores,
} from '../../utils/auditProgrammeViews'

export default function AuditProFindingsReport() {
  const { auditId } = useParams()
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

  const audit = audits.find((a) => a.id === auditId)
  if (!auditId) return <Navigate to={`${AUDITORS_DIRECTORY_ALIAS}/calendar?view=findings`} replace />
  if (!audit) {
    return (
      <div className="ap-prog">
        <p className="ap-dir-empty">That findings report is not in this workspace.</p>
        <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/calendar?view=findings`)}>
          ← Audit register
        </Btn>
      </div>
    )
  }

  const supplier = suppliers.find((s) => s.id === audit.supplierId)
  const auditor = auditors.find((a) => a.id === audit.auditorId)
  const scores = sectionScores(audit, language)
  const result = auditResult(audit, language)
  const counts = findingCounts(audit.findings)
  const kind = auditKindLabel(audit)

  return (
    <div className="ap-prog ap-report">
      <div className="ap-dir-actions">
        <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/calendar?view=findings`)}>
          ← Audit register
        </Btn>
        <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${audit.id}?doc=closing`)}>
          Print closing report
        </Btn>
        {result.key !== 'rejected' ? (
          <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/print/${audit.id}?doc=certificate`)}>
            Print certificate
          </Btn>
        ) : null}
        {supplier?.id ? (
          <Btn onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/record/${supplier.id}`)}>
            Company record
          </Btn>
        ) : null}
      </div>
      <p className="ap-prog-kicker">{reportNumber(audit)} · {kind} audit</p>
      <h2 className="ap-prog-title stx-text-wrap">{supplier?.name || audit.title}</h2>

      <div className="ap-report-facts">
        <article><div className="ap-pool-kpi-label">Supplier code</div><div className="ap-fact">{sellerSiteCode(supplier || { id: audit.supplierId })}</div></article>
        <article><div className="ap-pool-kpi-label">Site</div><div className="ap-fact stx-text-wrap">{[supplier?.country, supplier?.city].filter(Boolean).join(' · ') || '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Audit date</div><div className="ap-fact">{formatAuditDateLabel(audit.completedDate || audit.plannedDate) || '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Lead auditor</div><div className="ap-fact stx-text-wrap">{auditor ? `${auditor.name} (${auditorCode(auditor)})` : '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Standard</div><div className="ap-fact stx-text-wrap">{audit.standard || '—'}</div></article>
        <article><div className="ap-pool-kpi-label">Findings</div><div className="ap-fact">{counts.major} major · {counts.minor} minor · {counts.obs} observations</div></article>
      </div>

      <div className="ap-report-split">
        <section className="ap-report-card">
          <div className="ap-capacity-kicker">Element scores</div>
          {scores.map((sec) => (
            <div key={sec.name} className="ap-score-row">
              <span className="stx-text-wrap">{sec.name}</span>
              <div className="ap-util-track"><div className={`ap-util-fill${(sec.pct || 0) < 80 ? ' is-hot' : ''}`} style={{ width: `${sec.pct || 0}%` }} /></div>
              <strong>{sec.pct != null ? `${sec.pct}%` : '—'}</strong>
            </div>
          ))}
        </section>
        <section className="ap-report-card ap-report-card--result">
          <div className="ap-capacity-kicker">Audit conclusion</div>
          <div className="ap-pool-kpi-value">{result.score != null ? `${result.score}%` : '—'}</div>
          <p className="ap-pool-sub stx-text-wrap">
            Weighted across {scores.filter((s) => s.pct != null).length || scores.length} elements · pass ≥ 80%, no major.
            {result.key === 'conditional'
              ? ' Approval is maintained under condition. Major findings must be closed and verified before the next delivery release.'
              : result.key === 'rejected'
                ? ' Approval withdrawn until a follow-up visit confirms closure.'
                : ' Approval maintained.'}
          </p>
          <div className="ap-dir-actions">
            <span className={`ap-result ap-result--${result.key}`}>{result.label}</span>
            {audit.completedDate ? (
              <span className="ap-pool-sub">Signed: {formatAuditDateLabel(audit.completedDate)}</span>
            ) : null}
          </div>
        </section>
      </div>

      <section>
        <div className="ap-capacity-kicker">Findings &amp; corrective actions</div>
        {(audit.findings || []).length === 0 ? (
          <p className="ap-dir-empty">No findings recorded on this visit.</p>
        ) : (audit.findings || []).map((f, i) => (
          <article key={f.id || i} className="ap-finding-card">
            <div className="ap-finding-head">
              <span>{f.code || `F-${String(i + 1).padStart(2, '0')}`}</span>
              <span className={`ap-pool-risk-tag ap-pool-risk-tag--${f.type === 'Major NC' ? 'critical' : 'high'}`}>
                {f.type === 'Major NC' ? 'MAJOR' : f.type}
              </span>
              <span className="stx-text-wrap">{f.reference || f.section}</span>
              <span className={String(f.status) === 'Open' ? 'ap-capa-open' : 'ap-capa-closed'}>
                {f.status || 'Open'}{f.dueDate ? ` · due ${formatAuditDateLabel(f.dueDate)}` : ''}
              </span>
            </div>
            <p className="stx-text-wrap">{f.description}</p>
            {f.action || f.responsibleParty ? (
              <p className="stx-text-wrap"><strong>Action:</strong> {f.action || f.responsibleParty}</p>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  )
}
