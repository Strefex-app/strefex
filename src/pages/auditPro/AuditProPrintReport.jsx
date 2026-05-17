import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import useAuditProStore from '../../store/auditProStore'
import { Btn, getQuestionnaire, getTotalQuestions } from './auditProUi'
import AuditProOfficialReport from './auditProOfficialReport'
import { useTranslation } from '../../i18n/useTranslation'
import { getCompanyName } from '../../utils/tenantStorage'
import '../../styles/auditPro.css'

export default function AuditProPrintReport() {
  const { auditId } = useParams()
  const navigate = useNavigate()
  const { language } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  const canUse = isSuperAdmin() || isAuditor()

  const ensureSeed = useAuditProStore((s) => s.ensureSeed)
  const audits = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)

  useEffect(() => {
    ensureSeed()
  }, [ensureSeed])

  if (!canUse) {
    return <Navigate to="/management" replace />
  }

  const audit = audits.find((a) => a.id === auditId)
  if (!auditId || !audit) {
    return <Navigate to="/management/auditors/plans" replace />
  }

  const auditor = auditors.find((a) => a.id === audit.auditorId)
  const supplier = suppliers.find((s) => s.id === audit.supplierId)
  const questionnaire = getQuestionnaire(audit.standard, audit.auditType, language)

  const reportDateStr = useMemo(
    () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  )
  const printedBy =
    user?.fullName?.trim() || user?.companyName?.trim() || user?.email?.trim() || 'Unknown'
  const brandLogoSrc = `${import.meta.env.BASE_URL}assets/strefex-logo-executive-summary.png`
  const orgDisplayName = getCompanyName()
  const totalQ = questionnaire ? getTotalQuestions(questionnaire) : 0
  const answeredQ = questionnaire
    ? (questionnaire || []).reduce(
        (acc, sec, si) =>
          acc +
          (sec.questions || []).reduce(
            (a, _, qi) => a + (audit.responses?.[`${si}-${qi}`]?.verdict ? 1 : 0),
            0,
          ),
        0,
      )
    : 0
  const subtitleBar =
    `${audit.standard} · ${audit.industry} · Status: ${audit.status}` +
    ` · Auditor: ${auditor?.name || '—'} · Supplier: ${supplier?.name || '—'}` +
    (totalQ ? ` · Checklist progress: ${answeredQ}/${totalQ}` : '')

  return (
    <div className="ap-root ap-scrollbar ap-print-page-root">
      <div className="ap-print-toolbar ap-pdf-exclude no-print">
        <Btn onClick={() => navigate(`/management/auditors/conduct/${audit.id}`)} variant="secondary">
          ← Back
        </Btn>
        <Btn onClick={() => window.print()}>
          Print / Save PDF
        </Btn>
      </div>
      <div className="ap-print-sheet pm-portfolio-shell app-page ap-pm-print-sheet stx-text-wrap">
        <div className="ap-pm-print-frame">
          <div className="ap-pm-print-brand-bar">
            <img
              src={brandLogoSrc}
              alt="STREFEX"
              className="ap-pm-print-brand-logo"
              decoding="async"
            />
            <p className="ap-pm-print-org-name stx-text-wrap">{orgDisplayName}</p>
          </div>
          <header className="ap-pm-print-header" aria-label="Export header">
            <div className="ap-pm-print-header-gutter-left" aria-hidden="true" />
            <h1 className="ap-pm-print-header-title stx-text-wrap">{audit.title || 'Official audit report'}</h1>
            <time className="ap-pm-print-header-date" dateTime={reportDateStr}>
              {reportDateStr}
            </time>
          </header>
          <div className="ap-pm-print-subtitle">{subtitleBar}</div>
          <div className="app-page-card ap-pm-print-body-card">
            <AuditProOfficialReport
              audit={audit}
              auditor={auditor}
              supplier={supplier}
              questionnaire={questionnaire}
              suppressReportChrome
            />
          </div>
          <footer className="ap-pm-print-footer">
            <span className="ap-pm-print-footer-left">Printed by: {printedBy}</span>
            <span className="ap-pm-print-footer-centre">STREFEX Platform — Confidential</span>
            <span className="ap-pm-print-footer-right">Page 1 of 1</span>
          </footer>
        </div>
      </div>
    </div>
  )
}
