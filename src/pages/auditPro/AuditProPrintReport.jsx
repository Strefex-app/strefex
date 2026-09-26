import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import useAuditProStore from '../../store/auditProStore'
import { Btn, getTotalQuestions } from './auditProUi'
import { uploadClosingReport } from './auditJourneyActions'
import { AuditProCertificateDocument, AuditProChecklistDocument } from './AuditProPrintDocuments'
import {
  flattenQuestionnaireRows,
  questionnaireFormCode,
  questionnairePrintSheets,
  completedAuditPrintSheets,
  questionnaireForStandard,
} from '../../utils/auditStandardsCatalogue'
import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { sellerSiteCode } from '../../utils/auditorsAssignmentPool'
import { AUDITORS_DIRECTORY_ALIAS } from '../../utils/auditorsDirectory'
import { auditorCode } from '../../utils/auditProgrammeViews'
import { useAuditorsHubScopedData } from '../../hooks/useAuditorsHubScopedData'
import { useTranslation } from '../../i18n/useTranslation'
import { certificateNumber, closingReportModel } from '../../utils/auditSupplierRegister'
import '../../styles/auditPro.css'

export default function AuditProPrintReport() {
  const { auditId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { language } = useTranslation()
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const isAuditor = useAuthStore((s) => s.isAuditor)
  const canUse = isSuperAdmin() || isAuditor()
  const doc = searchParams.get('doc') || 'closing'
  const [uploading, setUploading] = useState(false)

  const ensureSeed = useAuditProStore((s) => s.ensureSeed)
  const { audits, auditors, suppliers } = useAuditorsHubScopedData()

  useEffect(() => {
    ensureSeed()
  }, [ensureSeed])

  const isCertificate = doc === 'certificate'
  const isBlankForm = doc === 'checklist'
  const isCompletedPack = !isCertificate && !isBlankForm
  const fromConduct = searchParams.get('from') === 'conduct'

  if (!canUse) {
    return <Navigate to="/management" replace />
  }

  const audit = audits.find((a) => a.id === auditId)
  if (!auditId || !audit) {
    return <Navigate to="/management/auditors/suppliers?view=records" replace />
  }

  const auditor = auditors.find((a) => a.id === audit.auditorId)
  const supplier = suppliers.find((s) => s.id === audit.supplierId)
  const questionnaire = questionnaireForStandard({ name: audit.standard, standard: audit.standard }, language)
  const totalQ = questionnaire ? getTotalQuestions(questionnaire) : 0
  const model = closingReportModel({ audit, supplier, auditor, language })
  const checkIssued = formatAuditDateLabel(audit.completedDate || audit.plannedDate || new Date().toISOString())
  const supplierLabel = supplier ? `${supplier.name} · ${sellerSiteCode(supplier)}` : ''
  const site = [supplier?.country, supplier?.city].filter(Boolean).join(' · ')
  const auditorLabel = auditor ? `${auditor.name} · ${auditorCode(auditor)}` : ''
  const signatories = model.signatories
  const formCode = questionnaireFormCode(audit.standard)
  const extraFacts = isCompletedPack
    ? [
      ['Report No.', model.reportNo],
      ['Result', `${model.result.label}${model.result.score != null ? ` · ${model.result.score}% conformity` : ''}`],
      ['Findings', `${model.counts.major} major · ${model.counts.minor} minor · ${model.counts.obs} observations`],
      ['CAPA plan due', formatAuditDateLabel(model.capaDue) || '—'],
      ...model.scores.slice(0, 8).map((sec) => [sec.name, sec.pct != null ? `${sec.pct}%` : '—']),
    ]
    : []

  const flatRows = flattenQuestionnaireRows(questionnaire)
  const sheets = isCompletedPack
    ? completedAuditPrintSheets(flatRows, model.findings)
    : questionnairePrintSheets(flatRows)

  const label = isCertificate
    ? `A4 portrait · Certificate ${certificateNumber(audit)}`
    : isBlankForm
      ? 'A4 portrait · On-site audit questionnaire'
      : `A4 portrait · ${questionnaireFormCode(audit.standard)}`

  const backToOnsite = fromConduct || (!audit.completedDate && audit.status !== 'Completed' && audit.status !== 'Cancelled')
  const closeTo = backToOnsite
    ? `${AUDITORS_DIRECTORY_ALIAS}/conduct/${encodeURIComponent(audit.id)}`
    : `${AUDITORS_DIRECTORY_ALIAS}/suppliers?view=records`

  return (
    <div className="ap-root ap-scrollbar ap-print-page-root">
      <div className="ap-print-toolbar ap-pdf-exclude no-print">
        <Btn onClick={() => window.print()}>Print / save PDF</Btn>
        {isCompletedPack ? (
          <label className="app-page-btn-primary ap-btn ap-btn-primary">
            {uploading ? 'Uploading…' : 'Upload signed report'}
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
                  .then(() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/suppliers?view=records`))
                  .finally(() => setUploading(false))
              }}
            />
          </label>
        ) : null}
        {supplier?.id ? (
          <Btn variant="secondary" onClick={() => navigate(`${AUDITORS_DIRECTORY_ALIAS}/record/${encodeURIComponent(supplier.id)}`)}>
            Supplier record
          </Btn>
        ) : null}
        <Btn onClick={() => navigate(closeTo)} variant="secondary">
          {backToOnsite ? 'Back to questionnaire' : 'Close'}
        </Btn>
        <span className="ap-print-toolbar-note">{label}</span>
      </div>
      {isCertificate ? (
        <div className="ap-doc-sheet">
          <AuditProCertificateDocument audit={audit} supplier={supplier} auditor={auditor} language={language} />
        </div>
      ) : (
        <div className="ap-std-print-root">
          {sheets.map((sheet, index) => (
            <div className="ap-doc-sheet ap-check-sheet" key={`${sheet.kind}-${index}`}>
              <AuditProChecklistDocument
                variant={sheet.kind}
                filled={isCompletedPack}
                responses={audit.responses || {}}
                extraFacts={sheet.kind === 'cover' ? extraFacts : []}
                findings={sheet.findings || []}
                closeWithSignatures={!!sheet.closeWithSignatures}
                standard={audit.standard}
                family=""
                questions={sheet.questions}
                formCode={formCode}
                issued={checkIssued}
                page={index + 1}
                pageCount={sheets.length}
                questionCount={totalQ}
                supplierLabel={supplierLabel}
                site={site}
                auditDate={formatAuditDateLabel(audit.plannedDate || audit.completedDate)}
                auditorLabel={auditorLabel}
                signatories={signatories}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
