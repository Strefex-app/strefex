/**
 * Capacity model for the current STREFEX 8.2 deploy shape.
 *
 * Two independent planes:
 *   1) Vercel SPA + Supabase (what logged-in users actually hit)
 *   2) FastAPI + Postgres (optional B2B API / billing webhooks)
 *
 * Numbers must stay in sync with Dockerfile, database.py, and
 * serviceRequestStore poll constants. `src/test/capacityModel.test.js` checks that.
 */

export const CAPACITY = {
  gunicornWorkers: 4,
  sqlalchemyPoolSize: 5,
  sqlalchemyMaxOverflow: 10,
  pollMsVisible: 12_000,
  pollMsIdle: 60_000,
  pollLimitFast: 100,
  pollLimitIdle: 50,
  /** refreshFromDatabase: requests + company notifications + target notifications */
  queriesPerPollCycle: 3,
  /** Share of logged-in tabs on home / requests / notifications (fast poll). */
  defaultFastShare: 0.25,
  /**
   * Conservative sustained PostgREST budget for a small/medium Supabase project.
   * Free-tier bursts are lower; Pro can go higher. This is not a vendor SLA.
   */
  supabaseComfortRps: 25,
  supabaseStretchRps: 80,
  /** Leave half the RPS budget for page loads, workspace sync, dashboards. */
  otherTrafficHeadroom: 0.5,
  getCacheTtlMs: 15_000,
  apiTimeoutMs: 30_000,
}

export function fastapiDbSlots(config = CAPACITY) {
  return config.gunicornWorkers * (config.sqlalchemyPoolSize + config.sqlalchemyMaxOverflow)
}

export function pollRpsPerSession(fastShare = CAPACITY.defaultFastShare, config = CAPACITY) {
  const share = Math.min(1, Math.max(0, Number(fastShare) || 0))
  const fast = config.queriesPerPollCycle / (config.pollMsVisible / 1000)
  const idle = config.queriesPerPollCycle / (config.pollMsIdle / 1000)
  return share * fast + (1 - share) * idle
}

/**
 * How many concurrent logged-in browser sessions the current poll + API setup can hold.
 * @returns {{
 *   rpsPerSession: number,
 *   fastapiInFlight: number,
 *   supabaseComfortPollingOnly: number,
 *   supabaseStretchPollingOnly: number,
 *   comfortableSessions: number,
 *   stretchSessions: number,
 *   limitingPlane: string,
 * }}
 */
export function estimateConcurrentSessions({
  fastShare = CAPACITY.defaultFastShare,
  config = CAPACITY,
} = {}) {
  const rpsPerSession = pollRpsPerSession(fastShare, config)
  const fastapiInFlight = fastapiDbSlots(config)
  const supabaseComfortPollingOnly = Math.floor(config.supabaseComfortRps / rpsPerSession)
  const supabaseStretchPollingOnly = Math.floor(config.supabaseStretchRps / rpsPerSession)
  const comfortableSessions = Math.floor(supabaseComfortPollingOnly * config.otherTrafficHeadroom)
  const stretchSessions = Math.floor(supabaseStretchPollingOnly * config.otherTrafficHeadroom)

  return {
    rpsPerSession: Number(rpsPerSession.toFixed(4)),
    fastapiInFlight,
    supabaseComfortPollingOnly,
    supabaseStretchPollingOnly,
    comfortableSessions,
    stretchSessions,
    limitingPlane: 'Supabase polling + other SPA traffic (FastAPI is optional)',
  }
}
