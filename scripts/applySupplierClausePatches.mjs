/**
 * Merges src/i18n/supplierSmq/localeText/patches/*.json into de/fr/es/pt/zh.text.json
 * Each patch: { "de": { "ru-x-y": "..." }, ... }
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const localeDir = path.join(root, 'src/i18n/supplierSmq/localeText')
const patchDir = path.join(localeDir, 'patches')
const locales = ['de', 'fr', 'es', 'pt', 'zh']

const byLocale = {}
for (const loc of locales) {
  const p = path.join(localeDir, `${loc}.text.json`)
  byLocale[loc] = JSON.parse(fs.readFileSync(p, 'utf8'))
}

const files = fs.readdirSync(patchDir).filter((f) => f.endsWith('.json')).sort()

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(path.join(patchDir, f), 'utf8'))
  for (const loc of locales) {
    const slice = data[loc]
    if (slice && typeof slice === 'object') Object.assign(byLocale[loc], slice)
  }
}

for (const loc of locales) {
  fs.writeFileSync(path.join(localeDir, `${loc}.text.json`), JSON.stringify(byLocale[loc], null, 2) + '\n')
}

console.error('applied', files.length, 'patch files')
