#!/usr/bin/env node
/**
 * CI npm audit — fail on high/critical except known unfixable advisories.
 * Usage: node scripts/npm-audit-ci.mjs
 */
import { execSync } from 'node:child_process'

const ALLOWLIST = new Set(['xlsx'])

let report
try {
  const out = execSync('npm audit --audit-level=high --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  report = JSON.parse(out)
} catch (err) {
  const stdout = err.stdout?.toString?.() || ''
  try {
    report = JSON.parse(stdout)
  } catch {
    console.error('npm audit failed to run')
    process.exit(1)
  }
}

const vulns = report.vulnerabilities || {}
const blocking = Object.entries(vulns).filter(([name, info]) => {
  if (ALLOWLIST.has(name)) return false
  const sev = info.severity
  return sev === 'high' || sev === 'critical'
})

if (blocking.length > 0) {
  console.error('Blocking npm audit findings:')
  blocking.forEach(([name, info]) => {
    console.error(`  - ${name} (${info.severity}): ${info.via?.[0]?.url || info.via?.[0] || 'see npm audit'}`)
  })
  process.exit(1)
}

const allowed = Object.keys(vulns).filter((name) => ALLOWLIST.has(name))
if (allowed.length) {
  console.log(`npm audit: allowed known advisories: ${allowed.join(', ')}`)
}
console.log('npm audit: no blocking high/critical vulnerabilities')
process.exit(0)
