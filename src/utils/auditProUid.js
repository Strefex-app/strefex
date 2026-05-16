/** Matches audit-management-system.jsx `uid()` */
export function auditProUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}
