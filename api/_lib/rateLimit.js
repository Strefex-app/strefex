const BUCKET = new Map()

// Phase-2 scaffold: simple in-memory limiter (optional).
export function checkRateLimit({ key, windowMs = 60_000, max = 120 }) {
  const now = Date.now()
  const timestamps = BUCKET.get(key) || []
  const fresh = timestamps.filter((ts) => now - ts <= windowMs)
  if (fresh.length >= max) {
    BUCKET.set(key, fresh)
    return { allowed: false, remaining: 0 }
  }
  fresh.push(now)
  BUCKET.set(key, fresh)
  return { allowed: true, remaining: Math.max(0, max - fresh.length) }
}
