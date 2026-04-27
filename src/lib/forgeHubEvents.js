export const FORGE_HUB_REFRESH = 'forge-hub-refresh'

export function notifyForgeHubRefresh() {
  try {
    window.dispatchEvent(new Event(FORGE_HUB_REFRESH))
  } catch {
    /* ignore */
  }
}
