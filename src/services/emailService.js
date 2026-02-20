// Email service utility
// In production, this would connect to a real email service (SendGrid, AWS SES, etc.)

const PLATFORM_OWNER_EMAIL = 'STREFEX@strfgroup.ru'

export const emailService = {
  // Send email to platform owner for approval
  sendApprovalRequest: async (submission) => {
    // In production, this would be a secure link with authentication token
    const approvalLink = `${window.location.origin}/admin/approve/${submission.id}`
    const adminListLink = `${window.location.origin}/admin/approvals`
    
    const emailData = {
      to: PLATFORM_OWNER_EMAIL,
      subject: `New Supplier Onboarding Request - ${submission.companyName}`,
      body: `
        A new supplier onboarding request has been submitted.
        
        Company Details:
        - Company Name: ${submission.companyName}
        - Email: ${submission.email}
        - Phone: ${submission.phone}
        - Address: ${submission.address}
        - Industries: ${submission.industries.join(', ')}
        ${submission.otherIndustry ? `- Other Industry: ${submission.otherIndustry}` : ''}
        
        Please review and approve this request:
        View Details: ${approvalLink}
        All Submissions: ${adminListLink}
        
        Submitted on: ${new Date(submission.submittedAt).toLocaleString()}
      `,
    }

    // In production, this would make an API call to your backend email service
    if (import.meta.env.DEV) console.log('📧 Email sent to platform owner:', emailData)
    
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, messageId: `email-${Date.now()}` })
      }, 500)
    })
  },

  // Send status update notification to supplier
  sendStatusUpdate: async (submission, newStatus) => {
    const statusMessages = {
      approved: 'Your supplier onboarding request has been approved! Welcome to the STREFEX platform.',
      'under-review': 'Your supplier onboarding request is currently under review. We will notify you once a decision has been made.',
      blocked: 'Your supplier onboarding request has been blocked. Please contact support for more information.',
    }

    const emailData = {
      to: submission.email,
      subject: `Supplier Onboarding Status Update - ${submission.companyName}`,
      body: `
        Dear ${submission.companyName},
        
        ${statusMessages[newStatus]}
        
        Status: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace('-', ' ')}
        Updated on: ${new Date().toLocaleString()}
        
        If you have any questions, please contact us at ${PLATFORM_OWNER_EMAIL}
        
        Best regards,
        STREFEX Platform Team
      `,
    }

    // In production, this would make an API call to your backend email service
    if (import.meta.env.DEV) console.log('📧 Status update email sent to supplier:', emailData)
    
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, messageId: `email-${Date.now()}` })
      }, 500)
    })
  },
}
