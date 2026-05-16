import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import useAuditProStore from '../../store/auditProStore'
import { Btn, getQuestionnaire } from './auditProUi'
import AuditProOfficialReport from './auditProOfficialReport'
import { useTranslation } from '../../i18n/useTranslation'
import '../../styles/auditPro.css'

export default function AuditProPrintReport() {
  const { auditId } = useParams()
  const navigate = useNavigate()
  const { language } = useTranslation()
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

  return (
    <div className="ap-root ap-scrollbar ap-print-page-root">
      <div className="ap-print-toolbar">
        <Btn onClick={() => navigate(`/management/auditors/conduct/${audit.id}`)} variant="secondary">
          ← Back
        </Btn>
        <Btn onClick={() => window.print()}>
          Print / Save PDF
        </Btn>
      </div>
      <div className="ap-print-sheet stx-text-wrap">
        <AuditProOfficialReport audit={audit} auditor={auditor} supplier={supplier} questionnaire={questionnaire} />
      </div>
    </div>
  )
}
