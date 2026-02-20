import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import useProductionStore from '../store/productionStore'
import './AuditQuestionnaire.css'

const AuditQuestionnaire = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const auditType = searchParams.get('type') || '5S'
  
  const {
    auditQuestionnaires,
    addFiveSAudit,
    addVDA63Audit,
    addProcessAudit,
    addAuditHistory,
  } = useProductionStore()

  const questionnaire = auditQuestionnaires[auditType]

  const [auditInfo, setAuditInfo] = useState({
    area: '',
    auditor: '',
    date: new Date().toISOString().split('T')[0],
  })

  // Initialize responses with 0 for all questions
  const initialResponses = useMemo(() => {
    const responses = {}
    questionnaire?.categories.forEach((cat) => {
      cat.questions.forEach((q) => {
        responses[q.id] = { score: 0, notes: '', finding: false, findingText: '' }
      })
    })
    return responses
  }, [questionnaire])

  const [responses, setResponses] = useState(initialResponses)
  const [activeCategory, setActiveCategory] = useState(questionnaire?.categories[0]?.id || '')
  const [showSaveModal, setShowSaveModal] = useState(false)

  // Calculate scores
  const calculateScores = useMemo(() => {
    if (!questionnaire) return { total: 0, max: 0, percentage: 0, categories: {} }

    let totalScore = 0
    let maxScore = 0
    const categoryScores = {}

    questionnaire.categories.forEach((cat) => {
      let catTotal = 0
      let catMax = 0
      cat.questions.forEach((q) => {
        catTotal += responses[q.id]?.score || 0
        catMax += q.maxScore
      })
      categoryScores[cat.id] = {
        score: catTotal,
        max: catMax,
        percentage: catMax > 0 ? Math.round((catTotal / catMax) * 100) : 0,
      }
      totalScore += catTotal
      maxScore += catMax
    })

    return {
      total: totalScore,
      max: maxScore,
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      categories: categoryScores,
    }
  }, [questionnaire, responses])

  // Get findings count
  const findingsCount = useMemo(() => {
    return Object.values(responses).filter((r) => r.finding).length
  }, [responses])

  // Handle score change
  const handleScoreChange = (questionId, score) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], score },
    }))
  }

  // Handle finding toggle
  const handleFindingToggle = (questionId) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], finding: !prev[questionId].finding },
    }))
  }

  // Handle finding text
  const handleFindingText = (questionId, text) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], findingText: text },
    }))
  }

  // Handle notes change
  const handleNotesChange = (questionId, notes) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], notes },
    }))
  }

  // Get score class for display
  const getScoreClass = (percentage) => {
    if (percentage >= 85) return 'excellent'
    if (percentage >= 70) return 'good'
    if (percentage >= 50) return 'average'
    return 'poor'
  }

  // Save audit
  const handleSaveAudit = () => {
    if (!auditInfo.area || !auditInfo.auditor) {
      alert('Please fill in Area/Location and Auditor name')
      return
    }

    // Collect findings
    const findings = Object.entries(responses)
      .filter(([_, r]) => r.finding && r.findingText)
      .map(([qId, r]) => r.findingText)

    // Collect actions from findings
    const actions = Object.entries(responses)
      .filter(([_, r]) => r.finding)
      .map(([qId, r]) => `Action required for: ${r.findingText || 'Finding identified'}`)

    // Create audit record based on type
    if (auditType === '5S') {
      // Calculate 5S specific scores
      const scores = {
        sort: calculateScores.categories['sort']?.percentage || 0,
        setInOrder: calculateScores.categories['setInOrder']?.percentage || 0,
        shine: calculateScores.categories['shine']?.percentage || 0,
        standardize: calculateScores.categories['standardize']?.percentage || 0,
        sustain: calculateScores.categories['sustain']?.percentage || 0,
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
        totalScore: Math.round(calculateScores.percentage / 4),
        maxScore: 25,
        findings,
        actions,
        status: findingsCount > 0 ? 'in_progress' : 'completed',
        responses, // Store full responses for review
      })
    } else if (auditType === 'VDA 6.3') {
      const elements = questionnaire.categories.map((cat) => ({
        element: cat.name,
        score: calculateScores.categories[cat.id]?.percentage || 0,
      }))
      
      addVDA63Audit({
        processName: auditInfo.area,
        date: auditInfo.date,
        auditor: auditInfo.auditor,
        overallScore: calculateScores.percentage,
        rating: calculateScores.percentage >= 90 ? 'A' : calculateScores.percentage >= 80 ? 'B' : calculateScores.percentage >= 60 ? 'C' : 'D',
        elements,
        findings: findingsCount,
        status: findingsCount > 0 ? 'action_required' : 'completed',
        responses,
      })
    } else {
      // Generic audit - add to history
      addAuditHistory({
        auditType,
        date: auditInfo.date,
        area: auditInfo.area,
        auditor: auditInfo.auditor,
        score: calculateScores.percentage,
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
        {/* Header */}
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
              Save Audit Results
            </button>
          </div>
        </div>

        {/* Audit Info */}
        <div className="audit-info-bar">
          <div className="audit-info-field">
            <label>Area / Location / Product</label>
            <input
              type="text"
              value={auditInfo.area}
              onChange={(e) => setAuditInfo({ ...auditInfo, area: e.target.value })}
              placeholder="Enter area or product name"
            />
          </div>
          <div className="audit-info-field">
            <label>Auditor Name</label>
            <input
              type="text"
              value={auditInfo.auditor}
              onChange={(e) => setAuditInfo({ ...auditInfo, auditor: e.target.value })}
              placeholder="Enter auditor name"
            />
          </div>
          <div className="audit-info-field">
            <label>Audit Date</label>
            <input
              type="date"
              value={auditInfo.date}
              onChange={(e) => setAuditInfo({ ...auditInfo, date: e.target.value })}
            />
          </div>
        </div>

        {/* Score Summary */}
        <div className="audit-score-summary">
          <div className="score-main">
            <div className={`score-circle ${getScoreClass(calculateScores.percentage)}`}>
              <span className="score-value">{calculateScores.percentage}%</span>
              <span className="score-label">Overall Score</span>
            </div>
            <div className="score-details">
              <div className="score-detail">
                <span className="detail-value">{calculateScores.total}</span>
                <span className="detail-label">Points Earned</span>
              </div>
              <div className="score-detail">
                <span className="detail-value">{calculateScores.max}</span>
                <span className="detail-label">Max Points</span>
              </div>
              <div className="score-detail">
                <span className="detail-value findings">{findingsCount}</span>
                <span className="detail-label">Findings</span>
              </div>
            </div>
          </div>
          <div className="category-scores">
            {questionnaire.categories.map((cat) => (
              <div
                key={cat.id}
                className={`cat-score-item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={{ '--cat-color': cat.color }}
              >
                <div className="cat-score-bar">
                  <div
                    className="cat-score-fill"
                    style={{
                      width: `${calculateScores.categories[cat.id]?.percentage || 0}%`,
                      background: cat.color,
                    }}
                  />
                </div>
                <span className="cat-score-name">{cat.name.split(':')[0]}</span>
                <span className="cat-score-value">{calculateScores.categories[cat.id]?.percentage || 0}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Navigation */}
        <div className="audit-q-nav">
          {questionnaire.categories.map((cat, idx) => (
            <button
              key={cat.id}
              type="button"
              className={`nav-item ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              style={{ '--nav-color': cat.color }}
            >
              <span className="nav-number">{idx + 1}</span>
              <span className="nav-name">{cat.name}</span>
              <span className="nav-score">{calculateScores.categories[cat.id]?.percentage || 0}%</span>
            </button>
          ))}
        </div>

        {/* Questions */}
        <div className="audit-q-content">
          {questionnaire.categories
            .filter((cat) => cat.id === activeCategory)
            .map((cat) => (
              <div key={cat.id} className="category-section">
                <div className="category-header" style={{ borderLeftColor: cat.color }}>
                  <h2>{cat.name}</h2>
                  <p>{cat.description}</p>
                </div>

                <div className="questions-list">
                  {cat.questions.map((q, qIdx) => (
                    <div key={q.id} className={`question-item ${responses[q.id]?.finding ? 'has-finding' : ''}`}>
                      <div className="question-number">{qIdx + 1}</div>
                      <div className="question-content">
                        <div className="question-text">{q.question}</div>
                        
                        {/* Score Rating */}
                        <div className="question-rating">
                          <span className="rating-label">Score (0-{q.maxScore}):</span>
                          <div className="rating-buttons">
                            {Array.from({ length: q.maxScore + 1 }).map((_, score) => (
                              <button
                                key={score}
                                type="button"
                                className={`rating-btn ${responses[q.id]?.score === score ? 'selected' : ''}`}
                                onClick={() => handleScoreChange(q.id, score)}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                          <div className="quick-ratings">
                            <button
                              type="button"
                              className="quick-btn na"
                              onClick={() => handleScoreChange(q.id, 0)}
                            >
                              N/A
                            </button>
                            <button
                              type="button"
                              className="quick-btn partial"
                              onClick={() => handleScoreChange(q.id, Math.floor(q.maxScore / 2))}
                            >
                              Partial
                            </button>
                            <button
                              type="button"
                              className="quick-btn full"
                              onClick={() => handleScoreChange(q.id, q.maxScore)}
                            >
                              Full
                            </button>
                          </div>
                        </div>

                        {/* Finding Toggle */}
                        <div className="question-finding">
                          <label className="finding-toggle">
                            <input
                              type="checkbox"
                              checked={responses[q.id]?.finding || false}
                              onChange={() => handleFindingToggle(q.id)}
                            />
                            <span className="toggle-label">Finding / Non-conformance</span>
                          </label>
                          
                          {responses[q.id]?.finding && (
                            <textarea
                              className="finding-input"
                              placeholder="Describe the finding and required corrective action..."
                              value={responses[q.id]?.findingText || ''}
                              onChange={(e) => handleFindingText(q.id, e.target.value)}
                              rows={2}
                            />
                          )}
                        </div>

                        {/* Notes */}
                        <div className="question-notes">
                          <input
                            type="text"
                            placeholder="Optional notes or observations..."
                            value={responses[q.id]?.notes || ''}
                            onChange={(e) => handleNotesChange(q.id, e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="question-score">
                        <span className={`score-badge ${responses[q.id]?.score === q.maxScore ? 'full' : responses[q.id]?.score > 0 ? 'partial' : 'zero'}`}>
                          {responses[q.id]?.score || 0}/{q.maxScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div className="category-nav-buttons">
                  {questionnaire.categories.findIndex((c) => c.id === activeCategory) > 0 && (
                    <button
                      type="button"
                      className="nav-btn prev"
                      onClick={() => {
                        const idx = questionnaire.categories.findIndex((c) => c.id === activeCategory)
                        setActiveCategory(questionnaire.categories[idx - 1].id)
                      }}
                    >
                      ← Previous Section
                    </button>
                  )}
                  {questionnaire.categories.findIndex((c) => c.id === activeCategory) < questionnaire.categories.length - 1 && (
                    <button
                      type="button"
                      className="nav-btn next"
                      onClick={() => {
                        const idx = questionnaire.categories.findIndex((c) => c.id === activeCategory)
                        setActiveCategory(questionnaire.categories[idx + 1].id)
                      }}
                    >
                      Next Section →
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Save Confirmation Modal */}
        {showSaveModal && (
          <div className="audit-modal-overlay">
            <div className="audit-modal success">
              <div className="modal-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="#27ae60" />
                  <path d="M8 12l2.5 2.5L16 9" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3>Audit Saved Successfully!</h3>
              <div className="modal-summary">
                <p><strong>Audit Type:</strong> {auditType}</p>
                <p><strong>Area:</strong> {auditInfo.area}</p>
                <p><strong>Score:</strong> {calculateScores.percentage}%</p>
                <p><strong>Findings:</strong> {findingsCount}</p>
              </div>
              <p className="modal-note">The audit has been saved to the audit history.</p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => navigate('/production/audit-history')}>
                  View Audit History
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
