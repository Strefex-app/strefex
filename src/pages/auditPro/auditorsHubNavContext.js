import { createContext, useContext } from 'react'

export const AuditorsHubNavContext = createContext(null)

export function useAuditorsHubNav() {
  return useContext(AuditorsHubNavContext)
}
