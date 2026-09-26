/**
 * Post-auth landing — Home for Network work accounts; Management otherwise.
 * No Network/Company mode switch.
 */
import {
  hasBuyerSide,
  hasManufacturerSide,
  normalizeAccountTypes,
} from './networkRoles'
import { auditorLandingPath, isAuditorWorkspaceRole } from './auditorWorkspaceAccess'

export function resolveWorkspaceLandingPath({
  accountType,
  accountTypes,
  isSuperAdmin = false,
  role,
} = {}) {
  if (isAuditorWorkspaceRole(role) && !isSuperAdmin) {
    return auditorLandingPath()
  }
  const types = normalizeAccountTypes({ accountType, accountTypes, isSuperAdmin })

  if (isSuperAdmin || hasBuyerSide(types) || hasManufacturerSide(types)) {
    return '/main-menu'
  }

  return '/management'
}
