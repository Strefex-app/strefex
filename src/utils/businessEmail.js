export const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'protonmail.com', 'proton.me', 'mail.com', 'gmx.com', 'gmx.de',
  'yandex.com', 'yandex.ru', 'mail.ru', 'bk.ru', 'inbox.ru', 'list.ru', 'rambler.ru',
])

export function emailDomain(email) {
  const parts = String(email || '').trim().toLowerCase().split('@')
  return parts.length === 2 ? parts[1] : ''
}

export function isBusinessEmail(email) {
  const domain = emailDomain(email)
  if (!domain || !domain.includes('.')) return false
  return !PUBLIC_EMAIL_DOMAINS.has(domain)
}

export function businessEmailError(email) {
  if (isBusinessEmail(email)) return ''
  return 'Use a company email domain. Public mailboxes (Gmail, Yahoo, Outlook, Mail.ru, and similar) are not allowed.'
}
