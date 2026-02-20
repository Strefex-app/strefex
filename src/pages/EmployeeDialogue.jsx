import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { useTranslation } from '../i18n/useTranslation'
import './EmployeeDialogue.css'

const EMPLOYEES = [
  { id: 'e1', name: 'Anna Petrova' },
  { id: 'e2', name: 'Ivan Kozlov' },
  { id: 'e3', name: 'Maria Sokolova' },
  { id: 'e4', name: 'Dmitry Volkov' },
  { id: 'e5', name: 'Elena Novikova' },
  { id: 'e6', name: 'Sergey Fedorov' },
]

const REVIEW_TYPES = ['Annual', 'Mid-Year', 'Probation', 'Special']
const REVIEW_STATUSES = ['Scheduled', 'In Progress', 'Completed']

const initialReviews = [
  {
    id: 'r1',
    employeeId: 'e1',
    employeeName: 'Anna Petrova',
    reviewDate: '2025-01-15',
    reviewer: 'John Manager',
    status: 'Completed',
    overallRating: 4,
    type: 'Annual',
    performanceAssessment: {
      technical: 4,
      communication: 5,
      teamwork: 4,
      leadership: 3,
      problemSolving: 4,
    },
    strengths: 'Excellent technical skills, strong communication abilities, reliable team player.',
    areasForImprovement: 'Could take on more leadership responsibilities, improve time management.',
    goalsReview: ['Increase OEE by 5%', 'Complete VDA 6.3 training'],
    developmentPlan: [
      { action: 'Attend leadership workshop', timeline: 'Q2 2025' },
      { action: 'Mentor junior team members', timeline: 'Ongoing' },
    ],
    employeeFeedback: 'I appreciate the feedback and look forward to working on my leadership skills.',
    managerComments: 'Anna has shown consistent growth and is ready for additional responsibilities.',
    employeeAcknowledged: true,
    managerSigned: true,
  },
  {
    id: 'r2',
    employeeId: 'e2',
    employeeName: 'Ivan Kozlov',
    reviewDate: '2025-02-01',
    reviewer: 'Sarah Director',
    status: 'In Progress',
    overallRating: 5,
    type: 'Mid-Year',
    performanceAssessment: {
      technical: 5,
      communication: 4,
      teamwork: 5,
      leadership: 4,
      problemSolving: 5,
    },
    strengths: 'Outstanding technical expertise, exceptional problem-solving skills.',
    areasForImprovement: 'Continue developing presentation skills.',
    goalsReview: ['Zero recordable injuries', 'Reduce defect rate below 0.5%'],
    developmentPlan: [
      { action: 'Public speaking course', timeline: 'Q3 2025' },
    ],
    employeeFeedback: '',
    managerComments: 'Ivan is a top performer and key contributor to the team.',
    employeeAcknowledged: false,
    managerSigned: true,
  },
  {
    id: 'r3',
    employeeId: 'e3',
    employeeName: 'Maria Sokolova',
    reviewDate: '2025-02-10',
    reviewer: 'John Manager',
    status: 'Scheduled',
    overallRating: 0,
    type: 'Annual',
    performanceAssessment: {},
    strengths: '',
    areasForImprovement: '',
    goalsReview: [],
    developmentPlan: [],
    employeeFeedback: '',
    managerComments: '',
    employeeAcknowledged: false,
    managerSigned: false,
  },
  {
    id: 'r4',
    employeeId: 'e4',
    employeeName: 'Dmitry Volkov',
    reviewDate: '2024-12-20',
    reviewer: 'Sarah Director',
    status: 'Completed',
    overallRating: 3,
    type: 'Probation',
    performanceAssessment: {
      technical: 3,
      communication: 3,
      teamwork: 4,
      leadership: 2,
      problemSolving: 3,
    },
    strengths: 'Good team collaboration, willing to learn.',
    areasForImprovement: 'Needs improvement in technical skills and problem-solving approach.',
    goalsReview: ['Implement Poka-Yoke on line 3'],
    developmentPlan: [
      { action: 'Additional technical training', timeline: 'Q1 2025' },
      { action: 'Shadow senior engineer', timeline: 'Q1 2025' },
    ],
    employeeFeedback: 'I understand the areas I need to work on and am committed to improvement.',
    managerComments: 'Dmitry shows promise but needs focused development in core technical areas.',
    employeeAcknowledged: true,
    managerSigned: true,
  },
  {
    id: 'r5',
    employeeId: 'e5',
    employeeName: 'Elena Novikova',
    reviewDate: '2024-11-30',
    reviewer: 'John Manager',
    status: 'Completed',
    overallRating: 4,
    type: 'Special',
    performanceAssessment: {
      technical: 4,
      communication: 4,
      teamwork: 5,
      leadership: 3,
      problemSolving: 4,
    },
    strengths: 'Excellent team player, strong organizational skills.',
    areasForImprovement: 'Could be more proactive in taking initiative.',
    goalsReview: ['Complete IATF awareness training'],
    developmentPlan: [
      { action: 'Project management training', timeline: 'Q2 2025' },
    ],
    employeeFeedback: 'Thank you for the constructive feedback.',
    managerComments: 'Elena is a valuable team member with good potential for growth.',
    employeeAcknowledged: true,
    managerSigned: true,
  },
]

const EmployeeDialogue = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [reviews, setReviews] = useState(initialReviews)
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
    const employee = EMPLOYEES.find((e) => e.id === newReview.employeeId)
    setReviews((prev) => [
      ...prev,
      {
        id: 'r' + Date.now(),
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
      },
    ])
    setNewReview({ employeeId: '', reviewDate: '', reviewer: '', type: 'Annual' })
    setShowNewForm(false)
  }

  const updateReview = (id, field, value) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const updatePerformanceRating = (id, category, rating) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = { ...r.performanceAssessment, [category]: rating }
          const avgRating = Object.values(updated).filter((v) => v > 0).length > 0
            ? Math.round(Object.values(updated).reduce((a, b) => a + b, 0) / Object.values(updated).filter((v) => v > 0).length)
            : 0
          return { ...r, performanceAssessment: updated, overallRating: avgRating }
        }
        return r
      })
    )
  }

  const addDevelopmentAction = (id) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            developmentPlan: [...r.developmentPlan, { action: '', timeline: '' }],
          }
        }
        return r
      })
    )
  }

  const updateDevelopmentPlan = (id, index, field, value) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updated = [...r.developmentPlan]
          updated[index] = { ...updated[index], [field]: value }
          return { ...r, developmentPlan: updated }
        }
        return r
      })
    )
  }

  const removeDevelopmentAction = (id, index) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            developmentPlan: r.developmentPlan.filter((_, i) => i !== index),
          }
        }
        return r
      })
    )
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
          <a
            className="ed-back-link"
            href="#"
            onClick={(e) => { e.preventDefault(); navigate(-1) }}
          >
            ← Back
          </a>
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
                  {EMPLOYEES.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
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
                                    className={`ed-rating-btn ${review.performanceAssessment[category] === rating ? 'ed-rating-btn-active' : ''}`}
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
                            <label className="ed-checkbox-label">
                              <input
                                type="checkbox"
                                checked={review.employeeAcknowledged}
                                onChange={(e) => updateReview(review.id, 'employeeAcknowledged', e.target.checked)}
                              />
                              <span>Employee Acknowledged</span>
                            </label>
                          </div>
                          <div className="ed-signature-item">
                            <label className="ed-checkbox-label">
                              <input
                                type="checkbox"
                                checked={review.managerSigned}
                                onChange={(e) => updateReview(review.id, 'managerSigned', e.target.checked)}
                              />
                              <span>Manager Signed</span>
                            </label>
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
