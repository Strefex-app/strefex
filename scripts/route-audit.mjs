import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appPath = path.join(rootDir, 'src', 'App.jsx')
const srcDir = path.join(rootDir, 'src')

const appSource = fs.readFileSync(appPath, 'utf8')

const routeRegex = /<Route\s+path="([^"]+)"/g
const routes = new Set()
let match
while ((match = routeRegex.exec(appSource)) !== null) {
  routes.add(match[1])
}

// Expand known nested layouts (relative child paths under a parent Route)
const nestedLayouts = [
  {
    parent: '/management/auditors',
    children: [
      'dashboard', 'new-audit', 'plans', 'calendar', 'auditors', 'suppliers',
      'risk-matrix', 'logs', 'reports', 'overview', 'conduct/:auditId', 'print/:auditId',
    ],
  },
]
for (const { parent, children } of nestedLayouts) {
  for (const child of children) {
    routes.add(`${parent}/${child}`.replace(/\/+/g, '/'))
  }
}

const routeList = [...routes]
const staticRoutes = routeList.filter((r) => !r.includes(':') && r !== '*')
const dynamicRoutes = routeList.filter((r) => r.includes(':'))

const files = []
function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = `${dirPath}/${entry.name}`
    if (entry.isDirectory()) {
      walk(fullPath)
      continue
    }
    if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }
}

walk(srcDir)

const navRefRegex = /(?:navigate\(|href=|to=)\s*\(?["'`]([^"'`]+)["'`]/g
const refs = []
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  let m
  while ((m = navRefRegex.exec(source)) !== null) {
    const ref = m[1]
    if (!ref.startsWith('/')) continue
    refs.push({
      file: file.replace(srcDir + '/', 'src/'),
      ref,
    })
  }
}

function isCoveredByDynamicRoute(refPath) {
  return dynamicRoutes.some((route) => {
    const pattern = '^' + route
      .replace(/\//g, '\\/')
      .replace(/:[^/]+/g, '[^/]+') + '$'
    return new RegExp(pattern).test(refPath)
  })
}

const unresolved = []
for (const { file, ref } of refs) {
  const pathOnly = ref.split('?')[0].split('#')[0]
  if (pathOnly === '/') continue
  const existsStatic = staticRoutes.includes(pathOnly)
  const existsDynamic = isCoveredByDynamicRoute(pathOnly)
  if (!existsStatic && !existsDynamic) {
    unresolved.push({ file, ref })
  }
}

console.log('Route audit summary')
console.log(`- Routes declared: ${routeList.length}`)
console.log(`- Navigation refs found: ${refs.length}`)
console.log(`- Unresolved refs: ${unresolved.length}`)
if (unresolved.length > 0) {
  console.log('\nUnresolved references:')
  unresolved
    .sort((a, b) => a.file.localeCompare(b.file) || a.ref.localeCompare(b.ref))
    .forEach((item) => {
      console.log(`  ${item.file} -> ${item.ref}`)
    })
}
