// Email service utility
// Seller growth invites: Resend via Supabase Edge Function `send-seller-invite`.
// Other helpers still stub until wired to the same provider.

import { isSupabaseConfigured, supabase } from '../config/supabase'
import { isEmailNotificationsEnabled } from '../store/settingsStore'

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

  // RFQ invite email to supplier
  sendRfqInvite: async ({ email, supplierName, rfqTitle, deadline, buyerName, registerUrl }) => {
    if (!isEmailNotificationsEnabled()) return { success: false, skipped: true, reason: 'email_pref_off' }
    const joinLine = registerUrl
      ? `\n        Not on STREFEX yet? Create your seller account here:\n        ${registerUrl}\n`
      : '\n        If you are new to STREFEX, register as a seller first, then sign in to respond.\n'
    const emailData = {
      to: email,
      subject: `RFQ Invitation - ${rfqTitle}`,
      body: `
        Dear ${supplierName || 'Supplier'},

        You have been invited to respond to an RFQ.

        RFQ: ${rfqTitle}
        Buyer: ${buyerName || 'Buyer'}
        Deadline: ${deadline ? new Date(deadline).toLocaleString() : 'Not specified'}
${joinLine}
        Please sign in to submit your response.
      `,
    }
    if (import.meta.env.DEV) console.log('📧 RFQ invite email:', emailData)
    return new Promise((resolve) => setTimeout(() => resolve({ success: true, messageId: `email-${Date.now()}` }), 300))
  },

  /** Organic growth: invite a potential seller — Resend via Edge Function when configured. */
  sendSellerGrowthInvite: async ({
    email,
    inviteeName,
    inviterName,
    inviterCompany,
    inviterEmail,
    registerUrl,
    rfqTitle,
    message,
    token,
    source,
    rfqId,
  }) => {
    const from = inviterCompany || inviterName || 'A STREFEX partner'
    const emailData = {
      to: email,
      subject: `${from} invited you to join STREFEX`,
      body: `
        Dear ${inviteeName || 'Supplier'},

        ${from} invited you to join STREFEX as a manufacturer / seller.
        You will create and own your own company account (this is not a team seat).

        ${message ? `${message}\n` : ''}${rfqTitle ? `Related RFQ: ${rfqTitle}\n` : ''}
        Create your account:
        ${registerUrl}

        Best regards,
        STREFEX Platform
      `,
    }

    if (isSupabaseConfigured && supabase && token) {
      try {
        const { data, error } = await supabase.functions.invoke('send-seller-invite', {
          body: {
            email,
            inviteeName,
            inviterName,
            inviterCompany,
            inviterEmail,
            registerUrl,
            rfqTitle,
            message,
            token,
            source,
            rfqId,
          },
        })
        if (error) {
          if (import.meta.env.DEV) console.warn('📧 send-seller-invite invoke error:', error.message || error)
          return {
            success: false,
            delivered: false,
            channel: 'resend_failed',
            fallbackMailto: true,
            error: error.message || 'Invite email function failed',
            emailData,
          }
        }
        if (data?.ok && data?.delivered) {
          if (import.meta.env.DEV) console.log('📧 Seller growth invite sent via Resend:', data.messageId)
          return {
            success: true,
            delivered: true,
            channel: 'resend',
            messageId: data.messageId,
            inviteId: data.inviteId,
            from: data.from,
            emailData,
          }
        }
        return {
          success: false,
          delivered: false,
          channel: 'resend_failed',
          fallbackMailto: Boolean(data?.fallbackMailto ?? true),
          error: data?.error || 'Invite email was not delivered',
          emailData,
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('📧 send-seller-invite exception:', err?.message || err)
        return {
          success: false,
          delivered: false,
          channel: 'resend_failed',
          fallbackMailto: true,
          error: err?.message || 'Invite email failed',
          emailData,
        }
      }
    }

    if (import.meta.env.DEV) console.log('📧 Seller growth invite (local stub — deploy Resend function):', emailData)
    return {
      success: true,
      delivered: false,
      channel: 'local_stub',
      fallbackMailto: true,
      messageId: `local-${Date.now()}`,
      emailData,
    }
  },

  // RFQ response notice to buyer
  sendRfqResponseNotice: async ({ buyerEmail, rfqTitle, supplierName }) => {
    if (!buyerEmail) return { success: false, skipped: true }
    if (!isEmailNotificationsEnabled()) return { success: false, skipped: true, reason: 'email_pref_off' }
    const emailData = {
      to: buyerEmail,
      subject: `RFQ Response Received - ${rfqTitle}`,
      body: `
        A supplier has submitted a response for RFQ "${rfqTitle}".
        Supplier: ${supplierName || 'Supplier'}
      `,
    }
    if (import.meta.env.DEV) console.log('📧 RFQ response email:', emailData)
    return new Promise((resolve) => setTimeout(() => resolve({ success: true, messageId: `email-${Date.now()}` }), 300))
  },

  // RFQ deadline reminder email to supplier
  sendRfqReminder: async ({ email, rfqTitle, deadline, hoursLeft }) => {
    if (!email) return { success: false, skipped: true }
    if (!isEmailNotificationsEnabled()) return { success: false, skipped: true, reason: 'email_pref_off' }
    const emailData = {
      to: email,
      subject: `Reminder: RFQ deadline approaching - ${rfqTitle}`,
      body: `
        Reminder: RFQ "${rfqTitle}" expires in about ${hoursLeft} hour(s).
        Deadline: ${deadline ? new Date(deadline).toLocaleString() : 'Not specified'}
      `,
    }
    if (import.meta.env.DEV) console.log('📧 RFQ reminder email:', emailData)
    return new Promise((resolve) => setTimeout(() => resolve({ success: true, messageId: `email-${Date.now()}` }), 300))
  },
}
