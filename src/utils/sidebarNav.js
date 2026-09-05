/**
 * Flat sidebar visibility — no Network/Company workspace mode gating.
 */
export function sidebarNavItemVisible(item, {
  showSupplierSideNav,
  showBuyerSideNav,
  showHomeNav = true,
  showSourcingNav = true,
  showInboxNav = true,
  showManagementNav = true,
  hasRole,
  hasFeature,
  previewTimeLeft,
}) {
  if (item.supplierSide && !showSupplierSideNav) return false
  if (item.buyerSide && !showBuyerSideNav) return false
  if (item.homeNav && !showHomeNav) return false
  if (item.sourcingNav && !showSourcingNav) return false
  if (item.inboxNav && !showInboxNav) return false
  if (item.managementNav && !showManagementNav) return false
  if (item.minRole && !hasRole(item.minRole)) return false
  if (item.requiredPlan && !hasFeature(item.requiredPlan)) return false
  if (item.hideInPreview && previewTimeLeft !== null) return false
  return true
}
