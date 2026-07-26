import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useTranslation } from '../i18n/useTranslation'
import useHrSpaceStore from '../store/hrSpaceStore'
import { hrSpacePath } from '../constants/hrSpaceRoutes'
import { ToggleCheckButton } from '../components/ToggleCheckButton'
import './EmployeeDialogue.css'

const REVIEW_TYPES = ['Annual', 'Mid-Year', 'Probation', 'Special']
const EmployeeDialogue = () => {
  const { t } = useTranslation()
  const employees = useHrSpaceStore((s) => s.employees)
  const reviews = useHrSpaceStore((s) => s.dialogues)
  const addDialogue = useHrSpaceStore((s) => s.addDialogue)
  const updateDialogue = useHrSpaceStore((s) => s.updateDialogue)
  const [showNewForm, setShowNewForm] = useState(false)
  const [expandedReview, setExpandedReview] = useState(null)
  const [newReview, setNewReview] = useState({
    employeeId: '',
    reviewDate: '',
    reviewer: '',
    type: 'Annual',
  })

  const saveNewReview = () => {
    if (!newReview.employeeId || !newReview.reviewDate || !newReview.reviewer) return
    const employee = employees.find((e) => e.id === newReview.employeeId)
    addDialogue({
      employeeId: newReview.employeeId,
      employeeName: employee?.name || '',
      reviewDate: newReview.reviewDate,
      reviewer: newReview.reviewer,
      status: 'Scheduled',
      overallRating: 0,
      type: newReview.type,
      performanceAssessment: {},
      strengths: '',
      areasForImprovement: '',
      goalsReview: [],
      developmentPlan: [],
      employeeFeedback: '',
      managerComments: '',
      employeeAcknowledged: false,
      managerSigned: false,
    })
    setNewReview({ employeeId: '', reviewDate: '', reviewer: '', type: 'Annual' })
    setShowNewForm(false)
  }

  const updateReview = (id, field, value) => {
    updateDialogue(id, { [field]: value })
  }

  const updatePerformanceRating = (id, category, rating) => {
    const r = useHrSpaceStore.getState().dialogues.find((x) => x.id === id)
    if (!r) return
    const updated = { ...(r.performanceAssessment || {}), [category]: rating }
    const vals = Object.values(updated).filter((v) => typeof v === 'number' && v > 0)
    const avgRating = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
    updateDialogue(id, { performanceAssessment: updated, overallRating: avgRating })
  }

  const addDevelopmentAction = (id) => {
    const r = useHrSpaceStore.getState().dialogues.find((x) => x.id === id)
    if (!r) return
    updateDialogue(id, { developmentPlan: [...(r.developmentPlan || []), { action: '', timeline: '' }] })
  }

  const updateDevelopmentPlan = (id, index, field, value) => {
    const r = useHrSpaceStore.getState().dialogues.find((x) => x.id === id)
    if (!r) return
    const updated = [...(r.developmentPlan || [])]
    updated[index] = { ...updated[index], [field]: value }
    updateDialogue(id, { developmentPlan: updated })
  }

  const removeDevelopmentAction = (id, index) => {
    const r = useHrSpaceStore.getState().dialogues.find((x) => x.id === id)
    if (!r) return
    updateDialogue(id, { developmentPlan: (r.developmentPlan || []).filter((_, i) => i !== index) })
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`ed-star ${i < rating ? 'ed-star-filled' : ''}`}>
        ★
      </span>
    ))
  }

  return (
    <AppLayout>
      <div className="ed-page">
        <div className="ed-header">
          <h1 className="ed-title">Employee Dialogue & Reviews</h1>
          <p className="ed-subtitle">Yearly performance reviews and development discussions</p>
        </div>

        <div className="ed-toolbar">
          <button type="button" className="ed-btn ed-btn-primary" onClick={() => setShowNewForm(!showNewForm)}>
            Schedule New Review
          </button>
        </div>

        {showNewForm && (
          <div className="ed-card ed-form-card">
            <h2 className="ed-card-title">Schedule New Review</h2>
            <div className="ed-form-grid">
              <div className="ed-form-group">
                <label className="ed-label">Employee</label>
                <select
                  className="ed-select"
                  value={newReview.employeeId}
                  onChange={(e) => setNewReview((p) => ({ ...p, employeeId: e.target.value }))}
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.employeeNumber} — {emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="ed-form-group">
                <label className="ed-label">Review Date</label>
                <input
                  type="date"
                  className="ed-input"
                  value={newReview.reviewDate}
                  onChange={(e) => setNewReview((p) => ({ ...p, reviewDate: e.target.value }))}
                />
              </div>
              <div className="ed-form-group">
                <label className="ed-label">Reviewer</label>
                <input
                  className="ed-input"
                  value={newReview.reviewer}
                  onChange={(e) => setNewReview((p) => ({ ...p, reviewer: e.target.value }))}
                  placeholder="Reviewer name"
                />
              </div>
              <div className="ed-form-group">
                <label className="ed-label">Review Type</label>
                <select
                  className="ed-select"
                  value={newReview.type}
                  onChange={(e) => setNewReview((p) => ({ ...p, type: e.target.value }))}
                >
                  {REVIEW_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ed-form-actions">
              <button type="button" className="ed-btn ed-btn-primary" onClick={saveNewReview}>Schedule Review</button>
              <button type="button" className="ed-btn ed-btn-secondary" onClick={() => setShowNewForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="ed-card">
          <h2 className="ed-card-title">Review Records</h2>
          <p className="ed-card-subtitle">Click a review to expand and view details</p>
          <div className="ed-reviews-list">
            {reviews.map((review) => {
              const isExpanded = expandedReview === review.id
              return (
                <div key={review.id} className="ed-review-item">
                  <div
                    className="ed-review-header"
                    onClick={() => setExpandedReview(isExpanded ? null : review.id)}
                  >
                    <div className="ed-review-header-main">
                      <div className="ed-review-employee">{review.employeeName}</div>
                      <div className="ed-review-meta">
                        <span className="ed-review-date">{review.reviewDate}</span>
                        <span className="ed-review-separator">•</span>
                        <span className="ed-review-reviewer">{review.reviewer}</span>
                        <span className="ed-review-separator">•</span>
                        <span className={`ed-review-type ed-review-type-${review.type.toLowerCase().replace(/\s+/g, '-')}`}>
                          {review.type}
                        </span>
                      </div>
                    </div>
                    <div className="ed-review-header-right">
                      <span className={`ed-status-badge ed-status-${review.status.replace(/\s+/g, '-').toLowerCase()}`}>
                        {review.status}
                      </span>
                      <div className="ed-rating-stars">
                        {renderStars(review.overallRating)}
                      </div>
                      <span className="ed-expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="ed-review-details">
                      <div className="ed-review-section">
                        <h3 className="ed-section-title">Performance Assessment</h3>
                        <div className="ed-rating-grid">
                          {['technical', 'communication', 'teamwork', 'leadership', 'problemSolving'].map((category) => (
                            <div key={category} className="ed-rating-item">
                              <label className="ed-rating-label">
                                {category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')}
                              </label>
                              <div className="ed-rating-controls">
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <button
                                    key={rating}
                                    type="button"
                                    className={`ed-rating-btn ${(review.performanceAssessment || {})[category] === rating ? 'ed-rating-btn-active' : ''}`}
                                    onClick={() => updatePerformanceRating(review.id, category, rating)}
                                  >
                                    {rating}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="ed-review-section">
                        <h3 className="ed-section-title">Strengths & Areas for Improvement</h3>
                        <div className="ed-form-group">
                          <label className="ed-label">Strengths</label>
                          <textarea
                            className="ed-textarea"
                            value={review.strengths}
                            onChange={(e) => updateReview(review.id, 'strengths', e.target.value)}
                            rows={3}
                            placeholder="Employee strengths..."
                          />
                        </div>
                        <div className="ed-form-group">
                          <label className="ed-label">Areas for Improvement</label>
                          <textarea
                            className="ed-textarea"
                            value={review.areasForImprovement}
                            onChange={(e) => updateReview(review.id, 'areasForImprovement', e.target.value)}
                            rows={3}
                            placeholder="Areas for improvement..."
                          />
                        </div>
                      </div>

                      <div className="ed-review-section">
                        <h3 className="ed-section-title">Goals Review</h3>
                        <div className="ed-goals-list">
                          {review.goalsReview.length > 0 ? (
                            review.goalsReview.map((goal, idx) => (
                              <div key={idx} className="ed-goal-item">{goal}</div>
                            ))
                          ) : (
                            <p className="ed-empty-text">No goals referenced</p>
                          )}
                        </div>
                      </div>

                      <div className="ed-review-section">
                        <h3 className="ed-section-title">Development Plan</h3>
                        <div className="ed-development-plan">
                          {review.developmentPlan.map((item, idx) => (
                            <div key={idx} className="ed-plan-item">
                              <input
                                className="ed-input ed-input-inline"
                                value={item.action}
                                onChange={(e) => updateDevelopmentPlan(review.id, idx, 'action', e.target.value)}
                                placeholder="Action item"
                              />
                              <input
                                className="ed-input ed-input-inline"
                                value={item.timeline}
                                onChange={(e) => updateDevelopmentPlan(review.id, idx, 'timeline', e.target.value)}
                                placeholder="Timeline"
                              />
                              <button
                                type="button"
                                className="ed-btn-icon"
                                onClick={() => removeDevelopmentAction(review.id, idx)}
                                title="Remove"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="ed-btn ed-btn-secondary ed-btn-small"
                            onClick={() => addDevelopmentAction(review.id)}
                          >
                            + Add Action Item
                          </button>
                        </div>
                      </div>

                      <div className="ed-review-section">
                        <h3 className="ed-section-title">Employee Feedback</h3>
                        <textarea
                          className="ed-textarea"
                          value={review.employeeFeedback}
                          onChange={(e) => updateReview(review.id, 'employeeFeedback', e.target.value)}
                          rows={4}
                          placeholder="Employee feedback..."
                        />
                      </div>

                      <div className="ed-review-section">
                        <h3 className="ed-section-title">Manager Comments</h3>
                        <textarea
                          className="ed-textarea"
                          value={review.managerComments}
                          onChange={(e) => updateReview(review.id, 'managerComments', e.target.value)}
                          rows={4}
                          placeholder="Manager comments..."
                        />
                      </div>

                      <div className="ed-review-section">
                        <h3 className="ed-section-title">Signatures</h3>
                        <div className="ed-signatures">
                          <div className="ed-signature-item">
                            <ToggleCheckButton
                              className="ed-checkbox-btn"
                              checked={review.employeeAcknowledged}
                              onChange={(v) => updateReview(review.id, 'employeeAcknowledged', v)}
                            >
                              Employee Acknowledged
                            </ToggleCheckButton>
                          </div>
                          <div className="ed-signature-item">
                            <ToggleCheckButton
                              className="ed-checkbox-btn"
                              checked={review.managerSigned}
                              onChange={(v) => updateReview(review.id, 'managerSigned', v)}
                            >
                              Manager Signed
                            </ToggleCheckButton>
                          </div>
                        </div>
                      </div>

                      <div className="ed-review-actions">
                        <button type="button" className="ed-btn ed-btn-secondary" onClick={() => window.print()}>
                          Export / Print
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default EmployeeDialogue
