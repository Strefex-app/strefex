#!/usr/bin/env node
/**
 * Print how many concurrent logged-in sessions the current STREFEX setup can hold,
 * and optionally probe FastAPI /health + /health/ready.
 *
 *   npm run capacity
 *   npm run capacity -- --probe
 *   npm run capacity -- --probe --url http://127.0.0.1:8000 --concurrency 20
 *
 * Probe only hits liveness/readiness. It does not create users or send auth traffic.
 */
import { estimateConcurrentSessions, fastapiDbSlots, CAPACITY } from '../src/utils/capacityModel.js'

const args = process.argv.slice(2)
function flag(name, fallback = null) {
  const i = args.indexOf(name)
  if (i === -1) return fallback
  const next = args[i + 1]
  if (!next || next.startsWith('--')) return true
  return next
}

const probe = Boolean(flag('--probe', false))
const baseUrl = String(flag('--url', 'http://127.0.0.1:8000')).replace(/\/$/, '')
const concurrency = Math.max(1, Math.min(50, Number(flag('--concurrency', 20)) || 20))
const fastShare = Math.min(1, Math.max(0, Number(flag('--fast-share', CAPACITY.defaultFastShare)) || CAPACITY.defaultFastShare))

const estimate = estimateConcurrentSessions({ fastShare })

console.log('STREFEX capacity check (current setup)')
console.log('======================================')
console.log(`FastAPI workers × DB pool:     ${CAPACITY.gunicornWorkers} × (${CAPACITY.sqlalchemyPoolSize}+${CAPACITY.sqlalchemyMaxOverflow}) = ${fastapiDbSlots()} in-flight DB requests`)
console.log(`Request poll (fast / idle):    ${CAPACITY.pollMsVisible / 1000}s / ${CAPACITY.pollMsIdle / 1000}s`)
console.log(`Poll row caps (fast / idle):   ${CAPACITY.pollLimitFast} / ${CAPACITY.pollLimitIdle}`)
console.log(`Assumed share on fast routes:  ${(fastShare * 100).toFixed(0)}%`)
console.log(`Poll RPS per logged-in tab:    ${estimate.rpsPerSession}`)
console.log('')
console.log(`Comfortable concurrent sessions: ${estimate.comfortableSessions}`)
console.log(`  (Supabase ~${CAPACITY.supabaseComfortRps} RPS budget, 50% reserved for page loads / sync)`)
console.log(`Stretch concurrent sessions:     ${estimate.stretchSessions}`)
console.log(`  (Supabase ~${CAPACITY.supabaseStretchRps} RPS budget, same headroom)`)
console.log(`Polling-only ceilings:           ${estimate.supabaseComfortPollingOnly} / ${estimate.supabaseStretchPollingOnly}`)
console.log(`Limiting plane: ${estimate.limitingPlane}`)
console.log('')
console.log('These are model ceilings, not a load-test of production. FastAPI is optional;')
console.log('most browser users talk to Supabase on Vercel.')

if (!probe) {
  console.log('')
  console.log('Add --probe to measure local FastAPI /health/ready (default http://127.0.0.1:8000).')
  process.exit(0)
}

async function timedGet(path) {
  const started = Date.now()
  try {
    const res = await fetch(`${baseUrl}${path}`, { method: 'GET' })
    const body = await res.text()
    return { path, ok: res.ok, status: res.status, ms: Date.now() - started, body: body.slice(0, 120) }
  } catch (err) {
    return { path, ok: false, status: 0, ms: Date.now() - started, body: err.message }
  }
}

console.log('')
console.log(`Probing ${baseUrl} with ${concurrency} concurrent /health/ready requests…`)

const live = await timedGet('/health')
const ready = await timedGet('/health/ready')
console.log(`  GET /health       → ${live.status} in ${live.ms}ms  ${live.body}`)
console.log(`  GET /health/ready → ${ready.status} in ${ready.ms}ms  ${ready.body}`)

if (!live.ok && live.status === 0) {
  console.log('')
  console.log('FastAPI is not reachable at that URL. Start it (uvicorn or docker compose) and retry.')
  process.exit(2)
}

const burst = await Promise.all(Array.from({ length: concurrency }, () => timedGet('/health/ready')))
const ok = burst.filter((r) => r.ok)
const fail = burst.filter((r) => !r.ok)
const times = ok.map((r) => r.ms).sort((a, b) => a - b)
const pct = (p) => times[Math.min(times.length - 1, Math.floor((p / 100) * times.length))] ?? null

console.log(`  burst ok/fail: ${ok.length}/${fail.length}`)
if (times.length) {
  console.log(`  ready latency ms: p50=${pct(50)} p95=${pct(95)} max=${times[times.length - 1]}`)
}
if (fail.length) {
  const sample = fail[0]
  console.log(`  first failure: HTTP ${sample.status} ${sample.body}`)
  process.exit(1)
}
