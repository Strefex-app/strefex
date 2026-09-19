import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import useAuditProStore from '../../store/auditProStore'
import { Btn, getQuestionnaire, getTotalQuestions } from './auditProUi'
import { uploadClosingReport } from './auditJourneyActions'
import AuditProOfficialReport from './auditProOfficialReport'
import { AuditProCertificateDocument, AuditProClosingDocument, AuditProChecklistDocument } from './AuditProPrintDocuments'
import { flattenQuestionnaireRows, questionnaireFormCode, questionnairePrintSheets } from '../../utils/auditStandardsCatalogue'
import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { sellerSiteCode } from '../../utils/auditorsAssignmentPool'
import { auditorCode } from '../../utils/auditProgrammeViews'
import { useTranslation } from '../../i18n/useTranslation'
import { getCompanyName } from '../../utils/tenantStorage'
import { certificateNumber } from '../../utils/auditSupplierRegister'
import { reportNumber } from '../../utils/auditProgrammeViews'
import '../../styles/auditPro.css'

export default function AuditProPrintReport() {
  const { auditId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { language } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  const canUse = isSuperAdmin() || isAuditor()
  const doc = searchParams.get('doc') || 'checklist'
  const [uploading, setUploading] = useState(false)

  const ensureSeed = useAuditProStore((s) => s.ensureSeed)
  const audits = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)

  useEffect(() => {
    ensureSeed()
  }, [ensureSeed])

  const reportDateStr = useMemo(
    () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    [],
  )

  if (!canUse) {
    return <Navigate to="/management" replace />
  }

  const audit = audits.find((a) => a.id === auditId)
  if (!auditId || !audit) {
    return <Navigate to="/management/auditors/suppliers" replace />
  }

  const auditor = auditors.find((a) => a.id === audit.auditorId)
  const supplier = suppliers.find((s) => s.id === audit.supplierId)
  const questionnaire = getQuestionnaire(audit.standard, audit.auditType, language)
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

  const label = doc === 'certificate'
    ? `A4 portrait · Certificate ${certificateNumber(audit)}`
    : doc === 'closing'
      ? `A4 portrait · Closing report ${reportNumber(audit)}`
      : doc === 'checklist'
        ? 'A4 portrait · On-site audit questionnaire'
        : 'Official audit report'

  const checkSheets = questionnairePrintSheets(flattenQuestionnaireRows(questionnaire))
  const checkIssued = (audit.plannedDate || audit.completedDate || new Date().toISOString()).slice(0, 10)

  return (
    <div className="ap-root ap-scrollbar ap-print-page-root">
      <div className="ap-print-toolbar ap-pdf-exclude no-print">
        <Btn onClick={() => window.print()}>Print / save PDF</Btn>
        {doc === 'closing' ? (
          <label className="app-page-btn-primary ap-btn ap-btn-primary">
            {uploading ? 'Uploading…' : 'Upload signed closing report'}
            <input
              type="file"
              accept="application/pdf,image/*"
              hidden
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                setUploading(true)
                void uploadClosingReport({ audit, supplier, auditor, file })
                  .then(() => navigate('/management/auditors/suppliers'))
                  .finally(() => setUploading(false))
              }}
            />
          </label>
        ) : null}
        <Btn onClick={() => navigate(`/management/auditors/suppliers?view=${doc === 'certificate' ? 'certs' : doc === 'closing' ? 'records' : 'register'}`)} variant="secondary">
          Close
        </Btn>
        <span className="ap-print-toolbar-note">{label}</span>
      </div>
      {doc === 'certificate' || doc === 'closing' ? (
        <div className="ap-doc-sheet">
          {doc === 'certificate' ? (
            <AuditProCertificateDocument audit={audit} supplier={supplier} auditor={auditor} language={language} />
          ) : (
            <AuditProClosingDocument audit={audit} supplier={supplier} auditor={auditor} language={language} />
          )}
        </div>
      ) : doc === 'checklist' ? (
        checkSheets.map((sheet, index) => (
          <div className="ap-doc-sheet ap-check-sheet" key={`${sheet.kind}-${index}`}>
            <AuditProChecklistDocument
              variant={sheet.kind}
              standard={audit.standard}
              family=""
              questions={sheet.questions}
              formCode={questionnaireFormCode(audit.standard)}
              issued={checkIssued}
              page={index + 1}
              pageCount={checkSheets.length}
              questionCount={totalQ}
              supplierLabel={supplier ? `${supplier.name} · ${sellerSiteCode(supplier)}` : ''}
              site={[supplier?.country, supplier?.city].filter(Boolean).join(' · ')}
              auditDate={formatAuditDateLabel(audit.plannedDate || audit.completedDate)}
              auditorLabel={auditor ? `${auditor.name} · ${auditorCode(auditor)}` : ''}
              signatories={[
                { role: 'Lead auditor', name: auditor ? `${auditor.name} · ${auditorCode(auditor)}` : '\u00a0' },
                { role: 'Supplier representative', name: supplier ? `${supplier.name} · ${sellerSiteCode(supplier)}` : '\u00a0' },
                { role: 'Head of Supplier Quality', name: 'STREFEX' },
              ]}
            />
          </div>
        ))
      ) : (
        <div className="ap-print-sheet pm-portfolio-shell app-page ap-pm-print-sheet stx-text-wrap">
          <div className="ap-pm-print-frame">
            <div className="ap-pm-print-brand-bar">
              <img src={brandLogoSrc} alt="STREFEX" className="ap-pm-print-brand-logo" decoding="async" />
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
      )}
    </div>
  )
}
