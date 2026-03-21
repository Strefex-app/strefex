/**
 * Best-effort removal of storage objects (e.g. after a failed DB update).
 * @param {string[]} paths
 * @param {(path: string) => Promise<void>} removeFn
 */
export async function removeStoragePathsBestEffort(paths, removeFn) {
  if (!Array.isArray(paths) || paths.length === 0 || typeof removeFn !== 'function') return
  for (const p of paths) {
    if (!p) continue
    try {
      await removeFn(p)
    } catch {
      /* best-effort */
    }
  }
}
