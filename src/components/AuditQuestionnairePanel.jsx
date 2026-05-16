import { useMemo, useState, useEffect } from 'react'
import { ToggleCheckButton } from './ToggleCheckButton'
import {
  calculateQuestionnaireScores,
  countFindings,
  getScoreClass,
} from '../utils/auditQuestionnaireScoring'

/**
 * Shared questionnaire body (scores, findings, notes) — styles from AuditQuestionnaire.css.
 * @param {{
 *   questionnaire: { name: string, categories: Array<{ id: string, name: string, description?: string, color?: string, questions: Array<{ id: string, question: string, maxScore: number }> }>},
 *   auditInfo: { area: string, auditor: string, date: string },
 *   onAuditInfoChange: (next: { area: string, auditor: string, date: string }) => void,
 *   responses: Record<string, { score?: number, notes?: string, finding?: boolean, findingText?: string }>,
 *   setResponses: React.Dispatch<React.SetStateAction<Record<string, any>>>,
 * }} props
 */
export default function AuditQuestionnairePanel({
  questionnaire,
  auditInfo,
  onAuditInfoChange,
  responses,
  setResponses,
}) {
  const [activeCategory, setActiveCategory] = useState(questionnaire?.categories[0]?.id || '')

  useEffect(() => {
    if (questionnaire?.categories?.length) {
      const first = questionnaire.categories[0].id
      setActiveCategory((cur) => {
        if (cur && questionnaire.categories.some((c) => c.id === cur)) return cur
        return first
      })
    }
  }, [questionnaire])

  const calculateScores = useMemo(
    () => calculateQuestionnaireScores(questionnaire, responses),
    [questionnaire, responses],
  )

  const findingsCount = useMemo(() => countFindings(responses), [responses])

  const handleScoreChange = (questionId, score) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], score },
    }))
  }

  const handleFindingToggle = (questionId) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], finding: !prev[questionId]?.finding },
    }))
  }

  const handleFindingText = (questionId, text) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], findingText: text },
    }))
  }

  const handleNotesChange = (questionId, notes) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], notes },
    }))
  }

  if (!questionnaire) return null

  return (
    <>
      <div className="audit-info-bar">
        <div className="audit-info-field">
          <label>Area / location / supplier</label>
          <input
            type="text"
            value={auditInfo.area}
            onChange={(e) => onAuditInfoChange({ ...auditInfo, area: e.target.value })}
            placeholder="Site, supplier, or product focus"
          />
        </div>
        <div className="audit-info-field">
          <label>Lead auditor</label>
          <input
            type="text"
            value={auditInfo.auditor}
            onChange={(e) => onAuditInfoChange({ ...auditInfo, auditor: e.target.value })}
            placeholder="Auditor name"
          />
        </div>
        <div className="audit-info-field">
          <label>Audit date</label>
          <input
            type="date"
            value={auditInfo.date}
            onChange={(e) => onAuditInfoChange({ ...auditInfo, date: e.target.value })}
          />
        </div>
      </div>

      <div className="audit-score-summary">
        <div className="score-main">
          <div className={`score-circle ${getScoreClass(calculateScores.percentage)}`}>
            <span className="score-value">{calculateScores.percentage}%</span>
            <span className="score-label">Overall score</span>
          </div>
          <div className="score-details">
            <div className="score-detail">
              <span className="detail-value">{calculateScores.total}</span>
              <span className="detail-label">Points earned</span>
            </div>
            <div className="score-detail">
              <span className="detail-value">{calculateScores.max}</span>
              <span className="detail-label">Max points</span>
            </div>
            <div className="score-detail">
              <span className="detail-value findings">{findingsCount}</span>
              <span className="detail-label">Findings</span>
            </div>
          </div>
        </div>
        <div className="category-scores">
          {questionnaire.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
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
            </button>
          ))}
        </div>
      </div>

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
                          <button type="button" className="quick-btn na" onClick={() => handleScoreChange(q.id, 0)}>
                            N/A
                          </button>
                          <button
                            type="button"
                            className="quick-btn partial"
                            onClick={() => handleScoreChange(q.id, Math.floor(q.maxScore / 2))}
                          >
                            Partial
                          </button>
                          <button type="button" className="quick-btn full" onClick={() => handleScoreChange(q.id, q.maxScore)}>
                            Full
                          </button>
                        </div>
                      </div>

                      <div className="question-finding">
                        <ToggleCheckButton
                          className="finding-toggle-btn"
                          checked={responses[q.id]?.finding || false}
                          onChange={() => handleFindingToggle(q.id)}
                        >
                          <span className="toggle-label">Finding / non-conformance</span>
                        </ToggleCheckButton>

                        {responses[q.id]?.finding && (
                          <textarea
                            className="finding-input"
                            placeholder="Describe the finding and required corrective action…"
                            value={responses[q.id]?.findingText || ''}
                            onChange={(e) => handleFindingText(q.id, e.target.value)}
                            rows={2}
                          />
                        )}
                      </div>

                      <div className="question-notes">
                        <input
                          type="text"
                          placeholder="Optional notes or observations…"
                          value={responses[q.id]?.notes || ''}
                          onChange={(e) => handleNotesChange(q.id, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="question-score">
                      <span
                        className={`score-badge ${
                          responses[q.id]?.score === q.maxScore
                            ? 'full'
                            : responses[q.id]?.score > 0
                              ? 'partial'
                              : 'zero'
                        }`}
                      >
                        {responses[q.id]?.score || 0}/{q.maxScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

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
                    ← Previous section
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
                    Next section →
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </>
  )
}
