import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupplierStore } from '../store/supplierStore'
import { emailService } from '../services/emailService'
import AppLayout from '../components/AppLayout'
import '../styles/app-page.css'
import './SuperAdminDashboard.css'
import './AdminHubPages.css'
import './AdminApproval.css'

const AdminApproval = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const submissions = useSupplierStore((state) => state.submissions)
  const updateSubmissionStatus = useSupplierStore((state) => state.updateSubmissionStatus)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  const submission = id ? submissions.find((sub) => sub.id === id) : null

  const stats = useMemo(() => {
    const total = submissions.length
    const approved = submissions.filter((s) => s.status === 'approved').length
    const underReview = submissions.filter((s) => s.status === 'under-review').length
    const blocked = submissions.filter((s) => s.status === 'blocked').length
    return { total, approved, underReview, blocked }
  }, [submissions])

  const handleStatusChange = async (submissionId, newStatus) => {
    setIsUpdating(true)
    try {
      const sub = submissions.find((s) => s.id === submissionId)
      if (!sub) return

      updateSubmissionStatus(submissionId, newStatus)
      await emailService.sendStatusUpdate(sub, newStatus)
      alert(`Status updated to ${newStatus}. Email notification sent to ${sub.email}`)

      if (id === submissionId) {
        setSelectedStatus('')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return '#2ecc71'
      case 'under-review':
        return '#f39c12'
      case 'blocked':
        return '#e74c3c'
      default:
        return '#95a5a6'
    }
  }

  const formatStatus = (status) =>
    status
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')

  const shell = (children) => (
    <AppLayout>
      <div className="sad-page">
        <button type="button" className="app-page-back-link" onClick={() => navigate('/hub/governance')}>
          ← Admin
        </button>
        {children}
      </div>
    </AppLayout>
  )

  if (submission) {
    return shell(
      <>
        <div className="sad-header">
          <div>
            <h1 className="sad-title">Supplier approval</h1>
            <p className="sad-subtitle">Review onboarding submission and update status — notifications are emailed to the supplier.</p>
          </div>
          <span className="ahp-badge-admin">Admin</span>
        </div>

        <button type="button" className="app-page-back-link" onClick={() => navigate('/admin/approvals')} style={{ marginTop: -8 }}>
          ← Back to approvals list
        </button>

        <div className="sad-widget submission-detail">
          <div className="detail-header">
            <div>
              <h2 className="company-name">{submission.companyName}</h2>
              <div
                className="status-badge"
                style={{
                  backgroundColor: `${getStatusColor(submission.status)}22`,
                  color: getStatusColor(submission.status),
                }}
              >
                {formatStatus(submission.status)}
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">Contact information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Email</label>
                <p>{submission.email}</p>
              </div>
              <div className="detail-item">
                <label>Phone</label>
                <p>{submission.phone}</p>
              </div>
              <div className="detail-item full-width">
                <label>Address</label>
                <p>{submission.address}</p>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">Industries</h3>
            <div className="industries-list">
              {(submission.industries || []).map((industry, index) => (
                <span key={index} className="industry-tag">
                  {industry}
                </span>
              ))}
              {submission.otherIndustry && (
                <span className="industry-tag">{submission.otherIndustry} (Other)</span>
              )}
            </div>
          </div>

          <div className="detail-section">
            <h3 className="section-title">Timeline</h3>
            <div className="timeline">
              <div className="timeline-item">
                <label>Submitted</label>
                <p>{new Date(submission.submittedAt).toLocaleString()}</p>
              </div>
              <div className="timeline-item">
                <label>Last updated</label>
                <p>{new Date(submission.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="status-change-section">
            <h3 className="section-title">Change status</h3>
            <div className="status-options">
              <button
                type="button"
                className={`status-button ${selectedStatus === 'approved' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('approved')}
                style={{
                  backgroundColor: selectedStatus === 'approved' ? '#2ecc71' : 'transparent',
                  color: selectedStatus === 'approved' ? '#0d0e10' : '#2ecc71',
                  borderColor: '#2ecc71',
                }}
              >
                Approved
              </button>
              <button
                type="button"
                className={`status-button ${selectedStatus === 'under-review' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('under-review')}
                style={{
                  backgroundColor: selectedStatus === 'under-review' ? '#f39c12' : 'transparent',
                  color: selectedStatus === 'under-review' ? '#0d0e10' : '#f39c12',
                  borderColor: '#f39c12',
                }}
              >
                Under review
              </button>
              <button
                type="button"
                className={`status-button ${selectedStatus === 'blocked' ? 'active' : ''}`}
                onClick={() => setSelectedStatus('blocked')}
                style={{
                  backgroundColor: selectedStatus === 'blocked' ? '#e74c3c' : 'transparent',
                  color: selectedStatus === 'blocked' ? '#0d0e10' : '#e74c3c',
                  borderColor: '#e74c3c',
                }}
              >
                Blocked
              </button>
            </div>

            {selectedStatus && selectedStatus !== submission.status && (
              <button
                type="button"
                className="update-status-button"
                onClick={() => handleStatusChange(submission.id, selectedStatus)}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating…' : `Update to ${formatStatus(selectedStatus)}`}
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  return shell(
    <>
      <div className="sad-header">
        <div>
          <h1 className="sad-title">Supplier approvals</h1>
          <p className="sad-subtitle">Review supplier onboarding requests, change status, and notify suppliers by email.</p>
        </div>
        <span className="ahp-badge-admin">Admin</span>
      </div>

      <div className="sad-kpis">
        <div className="sad-kpi">
          <div className="sad-kpi-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" />
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <span className="sad-kpi-value">{stats.total}</span>
          <span className="sad-kpi-label">Total</span>
        </div>
        <div className="sad-kpi">
          <div className="sad-kpi-icon orange">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="sad-kpi-value">{stats.underReview}</span>
          <span className="sad-kpi-label">Under review</span>
        </div>
        <div className="sad-kpi">
          <div className="sad-kpi-icon green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="sad-kpi-value">{stats.approved}</span>
          <span className="sad-kpi-label">Approved</span>
        </div>
        <div className="sad-kpi">
          <div className="sad-kpi-icon rose">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="sad-kpi-value">{stats.blocked}</span>
          <span className="sad-kpi-label">Blocked</span>
        </div>
      </div>

      <div className="sad-widget">
        <h2 className="sad-widget-title">Onboarding queue</h2>
        {submissions.length === 0 ? (
          <div className="empty-state">
            <p>No supplier submissions yet.</p>
          </div>
        ) : (
          <div className="submissions-list">
            {submissions.map((sub) => (
              <div key={sub.id} className="submission-card">
                <div className="card-header">
                  <div>
                    <h3 className="card-company-name">{sub.companyName}</h3>
                    <p className="card-email">{sub.email}</p>
                  </div>
                  <div
                    className="status-badge"
                    style={{
                      backgroundColor: `${getStatusColor(sub.status)}22`,
                      color: getStatusColor(sub.status),
                    }}
                  >
                    {formatStatus(sub.status)}
                  </div>
                </div>

                <div className="card-body">
                  <div className="card-info">
                    <span className="info-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      {(sub.industries || []).length}{' '}
                      {(sub.industries || []).length === 1 ? 'Industry' : 'Industries'}
                    </span>
                    <span className="info-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M8 7V3M16 7V3M7 11H17M5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  <button type="button" className="action-btn view-btn" onClick={() => navigate(`/admin/approve/${sub.id}`)}>
                    View details
                  </button>
                  <div className="quick-status-buttons">
                    <button
                      type="button"
                      className={`quick-status-btn ${sub.status === 'approved' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(sub.id, 'approved')}
                      disabled={isUpdating || sub.status === 'approved'}
                      title="Approve"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      className={`quick-status-btn ${sub.status === 'under-review' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(sub.id, 'under-review')}
                      disabled={isUpdating || sub.status === 'under-review'}
                      title="Under review"
                    >
                      ⏳
                    </button>
                    <button
                      type="button"
                      className={`quick-status-btn ${sub.status === 'blocked' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(sub.id, 'blocked')}
                      disabled={isUpdating || sub.status === 'blocked'}
                      title="Block"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default AdminApproval
