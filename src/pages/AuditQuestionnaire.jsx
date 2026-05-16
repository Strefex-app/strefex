import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import AuditQuestionnairePanel from '../components/AuditQuestionnairePanel'
import { buildInitialResponses, calculateQuestionnaireScores, countFindings } from '../utils/auditQuestionnaireScoring'
import './AuditQuestionnaire.css'

const AuditQuestionnaire = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const auditType = searchParams.get('type') || '5S'

  const { auditQuestionnaires, addFiveSAudit, addVDA63Audit, addAuditHistory } = useProductionStore()

  const questionnaire = auditQuestionnaires[auditType]

  const [auditInfo, setAuditInfo] = useState({
    area: '',
    auditor: '',
    date: new Date().toISOString().split('T')[0],
  })

  const initialResponses = useMemo(() => buildInitialResponses(questionnaire), [questionnaire])
  const [responses, setResponses] = useState(initialResponses)

  useEffect(() => {
    setResponses(initialResponses)
  }, [initialResponses])

  const [showSaveModal, setShowSaveModal] = useState(false)

  const scoreSummary = useMemo(
    () => calculateQuestionnaireScores(questionnaire, responses),
    [questionnaire, responses],
  )

  const findingsCount = useMemo(() => countFindings(responses), [responses])

  const handleSaveAudit = () => {
    if (!auditInfo.area || !auditInfo.auditor) {
      alert('Please fill in Area/Location and Auditor name')
      return
    }

    const findings = Object.entries(responses)
      .filter(([_, r]) => r.finding && r.findingText)
      .map(([qId, r]) => r.findingText)

    const actions = Object.entries(responses)
      .filter(([_, r]) => r.finding)
      .map(([qId, r]) => `Action required for: ${r.findingText || 'Finding identified'}`)

    if (auditType === '5S') {
      const scores = {
        sort: scoreSummary.categories.sort?.percentage || 0,
        setInOrder: scoreSummary.categories.setInOrder?.percentage || 0,
        shine: scoreSummary.categories.shine?.percentage || 0,
        standardize: scoreSummary.categories.standardize?.percentage || 0,
        sustain: scoreSummary.categories.sustain?.percentage || 0,
      }

      addFiveSAudit({
        area: auditInfo.area,
        date: auditInfo.date,
        auditor: auditInfo.auditor,
        scores: {
          sort: Math.round(scores.sort / 20),
          setInOrder: Math.round(scores.setInOrder / 20),
          shine: Math.round(scores.shine / 20),
          standardize: Math.round(scores.standardize / 20),
          sustain: Math.round(scores.sustain / 20),
        },
        totalScore: Math.round(scoreSummary.percentage / 4),
        maxScore: 25,
        findings,
        actions,
        status: findingsCount > 0 ? 'in_progress' : 'completed',
        responses,
      })
    } else if (auditType === 'VDA 6.3') {
      const elements = questionnaire.categories.map((cat) => ({
        element: cat.name,
        score: scoreSummary.categories[cat.id]?.percentage || 0,
      }))

      addVDA63Audit({
        processName: auditInfo.area,
        date: auditInfo.date,
        auditor: auditInfo.auditor,
        overallScore: scoreSummary.percentage,
        rating:
          scoreSummary.percentage >= 90
            ? 'A'
            : scoreSummary.percentage >= 80
              ? 'B'
              : scoreSummary.percentage >= 60
                ? 'C'
                : 'D',
        elements,
        findings: findingsCount,
        status: findingsCount > 0 ? 'action_required' : 'completed',
        responses,
      })
    } else {
      addAuditHistory({
        auditType,
        date: auditInfo.date,
        area: auditInfo.area,
        auditor: auditInfo.auditor,
        score: scoreSummary.percentage,
        status: findingsCount > 0 ? 'action_required' : 'completed',
        findingsCount,
        openActions: findingsCount,
        responses,
        findings: findings.map((f, i) => ({ id: `f-${Date.now()}-${i}`, description: f })),
      })
    }

    setShowSaveModal(true)
  }

  if (!questionnaire) {
    return (
      <AppLayout>
        <div className="audit-q-page">
          <div className="audit-q-header">
            <p>Questionnaire not found for audit type: {auditType}</p>
            <button type="button" onClick={() => navigate(-1)}>← Back</button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="audit-q-page">
        <div className="audit-q-header">
          <button type="button" className="audit-q-back" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="audit-q-header-content">
            <div>
              <h1 className="audit-q-title">{questionnaire.name}</h1>
              <p className="audit-q-subtitle">Complete the checklist to calculate audit score</p>
            </div>
            <button type="button" className="save-audit-btn" onClick={handleSaveAudit}>
              Save audit results
            </button>
          </div>
        </div>

        <AuditQuestionnairePanel
          questionnaire={questionnaire}
          auditInfo={auditInfo}
          onAuditInfoChange={setAuditInfo}
          responses={responses}
          setResponses={setResponses}
        />

        {showSaveModal && (
          <div className="audit-modal-overlay">
            <div className="audit-modal success">
              <div className="modal-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#27ae60" />
                  <path d="M8 12l2.5 2.5L16 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Audit saved successfully</h3>
              <div className="modal-summary">
                <p><strong>Audit type:</strong> {auditType}</p>
                <p><strong>Area:</strong> {auditInfo.area}</p>
                <p><strong>Score:</strong> {scoreSummary.percentage}%</p>
                <p><strong>Findings:</strong> {findingsCount}</p>
              </div>
              <p className="modal-note">The audit has been saved to the audit history.</p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => navigate('/production/audit-history')}>
                  View audit history
                </button>
                <button type="button" className="btn-primary" onClick={() => navigate(-1)}>
                  ← Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default AuditQuestionnaire
