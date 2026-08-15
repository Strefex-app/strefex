import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  CAPACITY,
  estimateConcurrentSessions,
  fastapiDbSlots,
  pollRpsPerSession,
} from '../utils/capacityModel'
import {
  SERVICE_REQUEST_POLL_LIMIT_FAST,
  SERVICE_REQUEST_POLL_LIMIT_IDLE,
  SERVICE_REQUEST_POLL_MS_IDLE,
  SERVICE_REQUEST_POLL_MS_VISIBLE,
} from '../store/serviceRequestStore'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function readRepo(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

describe('capacity model stays aligned with the current setup', () => {
  it('uses the Dockerfile gunicorn worker count', () => {
    const docker = readRepo('backend/Dockerfile')
    expect(docker).toMatch(/"--workers", "4"/)
    expect(CAPACITY.gunicornWorkers).toBe(4)
  })

  it('uses SQLAlchemy default pool sizes when database.py does not override them', () => {
    const db = readRepo('backend/app/database.py')
    expect(db).toMatch(/pool_pre_ping\s*=\s*True/)
    expect(db).not.toMatch(/pool_size\s*=/)
    expect(db).not.toMatch(/max_overflow\s*=/)
    expect(CAPACITY.sqlalchemyPoolSize).toBe(5)
    expect(CAPACITY.sqlalchemyMaxOverflow).toBe(10)
    expect(fastapiDbSlots()).toBe(60)
  })

  it('uses the live service-request poll intervals and limits', () => {
    expect(SERVICE_REQUEST_POLL_MS_VISIBLE).toBe(CAPACITY.pollMsVisible)
    expect(SERVICE_REQUEST_POLL_MS_IDLE).toBe(CAPACITY.pollMsIdle)
    expect(SERVICE_REQUEST_POLL_LIMIT_FAST).toBe(CAPACITY.pollLimitFast)
    expect(SERVICE_REQUEST_POLL_LIMIT_IDLE).toBe(CAPACITY.pollLimitIdle)
  })

  it('uses the live API GET cache TTL and request timeout', () => {
    const api = readRepo('src/services/api.js')
    expect(api).toMatch(/REQUEST_TIMEOUT_MS = 30_000/)
    expect(api).toMatch(/GET_CACHE_TTL_MS = 15_000/)
    expect(CAPACITY.apiTimeoutMs).toBe(30_000)
    expect(CAPACITY.getCacheTtlMs).toBe(15_000)
  })
})

describe('concurrent session estimate', () => {
  it('charges 0.25 RPS per fast tab and 0.05 RPS per idle tab', () => {
    expect(pollRpsPerSession(1)).toBeCloseTo(0.25, 5)
    expect(pollRpsPerSession(0)).toBeCloseTo(0.05, 5)
    expect(pollRpsPerSession(0.25)).toBeCloseTo(0.1, 5)
  })

  it('reports a comfortable concurrent-session ceiling for the current poll mix', () => {
    const estimate = estimateConcurrentSessions({ fastShare: 0.25 })
    expect(estimate.fastapiInFlight).toBe(60)
    expect(estimate.rpsPerSession).toBeCloseTo(0.1, 4)
    expect(estimate.supabaseComfortPollingOnly).toBe(250)
    expect(estimate.comfortableSessions).toBe(125)
    expect(estimate.stretchSessions).toBe(400)
    expect(estimate.limitingPlane).toMatch(/Supabase/)
  })

  it('drops the ceiling when more tabs stay on fast poll routes', () => {
    const busy = estimateConcurrentSessions({ fastShare: 0.8 })
    const quiet = estimateConcurrentSessions({ fastShare: 0.1 })
    expect(busy.comfortableSessions).toBeLessThan(quiet.comfortableSessions)
  })
})
