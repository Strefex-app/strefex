import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSupplierStore } from '../store/supplierStore'
import { emailService } from '../services/emailService'
import Header from '../components/Header'
import BackButton from '../components/BackButton'
import BottomNav from '../components/BottomNav'
import './AdminApproval.css'

const AdminApproval = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const submissions = useSupplierStore((state) => state.submissions)
  const updateSubmissionStatus = useSupplierStore((state) => state.updateSubmissionStatus)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // If ID is provided, show single submission detail view
  const submission = id ? submissions.find((sub) => sub.id === id) : null

  // If no ID, show list of all submissions
  const handleStatusChange = async (submissionId, newStatus) => {
    setIsUpdating(true)
    try {
      const submission = submissions.find((sub) => sub.id === submissionId)
      if (!submission) return

      // Update status in store
      updateSubmissionStatus(submissionId, newStatus)

      // Send email notification to supplier
      await emailService.sendStatusUpdate(submission, newStatus)

      alert(`Status updated to ${newStatus}. Email notification sent to ${submission.email}`)
      
      // If viewing single submission, refresh the view
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
        return '#4CAF50'
      case 'under-review':
        return '#FF9800'
      case 'blocked':
        return '#F44336'
      default:
        return '#9E9E9E'
    }
  }

  const formatStatus = (status) => {
    return status
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Single submission detail view
  if (submission) {
    return (
      <div className="admin-approval-container">
        <Header />
        <div className="admin-approval-content">
          <div className="approval-header">
            <button 
              className="back-button"
              onClick={() => navigate('/admin/approvals')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="page-title">Supplier Approval</h1>
          </div>

          <div className="submission-detail">
            <div className="detail-header">
              <div>
                <h2 className="company-name">{submission.companyName}</h2>
                <div className="status-badge" style={{ backgroundColor: getStatusColor(submission.status) + '20', color: getStatusColor(submission.status) }}>
                  {formatStatus(submission.status)}
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3 className="section-title">Contact Information</h3>
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
                {submission.industries.map((industry, index) => (
                  <span key={index} className="industry-tag">
                    {industry}
                  </span>
                ))}
                {submission.otherIndustry && (
                  <span className="industry-tag">
                    {submission.otherIndustry} (Other)
                  </span>
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
                  <label>Last Updated</label>
                  <p>{new Date(submission.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="status-change-section">
              <h3 className="section-title">Change Status</h3>
              <div className="status-options">
                <button
                  className={`status-button ${selectedStatus === 'approved' ? 'active' : ''}`}
                  onClick={() => setSelectedStatus('approved')}
                  style={{ 
                    backgroundColor: selectedStatus === 'approved' ? '#4CAF50' : 'white',
                    color: selectedStatus === 'approved' ? 'white' : '#4CAF50',
                    borderColor: '#4CAF50'
                  }}
                >
                  Approved
                </button>
                <button
                  className={`status-button ${selectedStatus === 'under-review' ? 'active' : ''}`}
                  onClick={() => setSelectedStatus('under-review')}
                  style={{ 
                    backgroundColor: selectedStatus === 'under-review' ? '#FF9800' : 'white',
                    color: selectedStatus === 'under-review' ? 'white' : '#FF9800',
                    borderColor: '#FF9800'
                  }}
                >
                  Under Review
                </button>
                <button
                  className={`status-button ${selectedStatus === 'blocked' ? 'active' : ''}`}
                  onClick={() => setSelectedStatus('blocked')}
                  style={{ 
                    backgroundColor: selectedStatus === 'blocked' ? '#F44336' : 'white',
                    color: selectedStatus === 'blocked' ? 'white' : '#F44336',
                    borderColor: '#F44336'
                  }}
                >
                  Blocked
                </button>
              </div>
              
              {selectedStatus && selectedStatus !== submission.status && (
                <button
                  className="update-status-button"
                  onClick={() => handleStatusChange(submission.id, selectedStatus)}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : `Update to ${formatStatus(selectedStatus)}`}
                </button>
              )}
            </div>
          </div>
        </div>
        <BackButton />
        <BottomNav />
      </div>
    )
  }

  // List view of all submissions
  return (
    <div className="admin-approval-container">
      <Header />
      <div className="admin-approval-content">
        <div className="approval-header">
          <h1 className="page-title">Supplier Approvals</h1>
          <p className="page-subtitle">Manage supplier onboarding requests</p>
        </div>

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
                  <div className="status-badge" style={{ backgroundColor: getStatusColor(sub.status) + '20', color: getStatusColor(sub.status) }}>
                    {formatStatus(sub.status)}
                  </div>
                </div>

                <div className="card-body">
                  <div className="card-info">
                    <span className="info-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {sub.industries.length} {sub.industries.length === 1 ? 'Industry' : 'Industries'}
                    </span>
                    <span className="info-item">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 7V3M16 7V3M7 11H17M5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {new Date(sub.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="action-btn view-btn"
                    onClick={() => navigate(`/admin/approve/${sub.id}`)}
                  >
                    View Details
                  </button>
                  <div className="quick-status-buttons">
                    <button
                      className={`quick-status-btn ${sub.status === 'approved' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(sub.id, 'approved')}
                      disabled={isUpdating || sub.status === 'approved'}
                      title="Approve"
                    >
                      ✓
                    </button>
                    <button
                      className={`quick-status-btn ${sub.status === 'under-review' ? 'active' : ''}`}
                      onClick={() => handleStatusChange(sub.id, 'under-review')}
                      disabled={isUpdating || sub.status === 'under-review'}
                      title="Under Review"
                    >
                      ⏳
                    </button>
                    <button
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
      <BackButton />
      <BottomNav />
    </div>
  )
}

export default AdminApproval
