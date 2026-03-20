/**
 * Build mailto: link for RFQ / quote outreach from a directory row.
 * @param {{ email?: string | null, company_name?: string | null, contact_name?: string | null }} row
 * @returns {string | null}
 */
export function buildRfqOrQuoteMailto(row) {
  const email = String(row?.email ?? '')
    .trim()
    .toLowerCase()
  if (!email || !email.includes('@')) return null

  const company = String(row?.company_name ?? '').trim() || 'your company'
  const contact = String(row?.contact_name ?? '').trim()

  const subject = encodeURIComponent(`RFQ / Quote request — ${company}`)
  const bodyLines = [
    `Dear ${contact || 'Team'},`,
    '',
    `We would like to request a quote / RFQ regarding cooperation with ${company}.`,
    '',
    'Please find our requirements below:',
    '',
    '[Describe part, quantity, timeline, standards, delivery location]',
    '',
    'Best regards,',
  ]
  const body = encodeURIComponent(bodyLines.join('\n'))
  return `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`
}
