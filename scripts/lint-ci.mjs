#!/usr/bin/env node
/**
 * Run ESLint on the Phase-4 CI scope (see eslint.config.js → lintCiPaths).
 */
import { spawnSync } from 'node:child_process'
import { lintCiPaths } from '../eslint.config.js'

if (lintCiPaths.length === 0) {
  console.error('lintCiPaths is empty — nothing to lint')
  process.exit(1)
}

const result = spawnSync('eslint', lintCiPaths, { stdio: 'inherit', shell: false })
process.exit(result.status ?? 1)
