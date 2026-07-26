import { Route } from 'react-router-dom'
import LegacyManagementRedirect from './LegacyManagementRedirect'
import { LEGACY_MANAGEMENT_REDIRECTS } from '../utils/managementRoutes'

/** Registers redirect routes from legacy flat paths to /management/{cluster}/{module}/… */
export function managementLegacyRedirectRoutes() {
  return LEGACY_MANAGEMENT_REDIRECTS.flatMap(({ from }) => [
    <Route key={from} path={from} element={<LegacyManagementRedirect />} />,
    <Route key={`${from}/*`} path={`${from}/*`} element={<LegacyManagementRedirect />} />,
  ])
}
