/**
 * Scans src/ for t('key', 'optionalEnglish') and ensures every key exists in translations.js
 * with en, zh, es, fr, de, ru, pt. Missing locales use English as placeholder (same string)
 * until professional translation is added.
 *
 * Run: node scripts/syncTranslationKeysFromSource.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const TRANSLATIONS = path.join(ROOT, 'src/i18n/translations.js')

const LANGS = ['en', 'zh', 'es', 'fr', 'de', 'ru', 'pt']

function walkDir(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (name === 'node_modules') continue
    const st = fs.statSync(p)
    if (st.isDirectory()) walkDir(p, files)
    else if (/\.(jsx|js)$/.test(name) && !name.includes('.test.')) files.push(p)
  }
  return files
}

/** Unescape JS single-quoted string content */
function unescapeSq(raw) {
  return raw.replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/\\n/g, '\n').replace(/\\r/g, '\r')
}

/**
 * Extract t('key') and t('key', 'fallback') from source (single- and double-quoted args).
 * Multi-line template literal fallbacks are skipped (rare).
 */
function extractFromSource(text) {
  const out = new Map()
  const patterns = [
    /\bt\s*\(\s*'((?:\\'|[^'])*)'(?:\s*,\s*'((?:\\'|[^'])*)')?\s*\)/g,
    /\bt\s*\(\s*"((?:\\"|[^"])*)"(?:\s*,\s*"((?:\\"|[^"])*)")?\s*\)/g,
  ]

  for (const re of patterns) {
    let m
    re.lastIndex = 0
    while ((m = re.exec(text)) !== null) {
      const keyRaw = m[1]
      const key =
        re === patterns[0] ? unescapeSq(keyRaw) : keyRaw.replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      let fb =
        m[2] != null
          ? re === patterns[0]
            ? unescapeSq(m[2])
            : m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
          : null
      if (fb === '') fb = null
      const kClean = key
      const prev = out.get(kClean)
      if (fb && (!prev || fb.length > (prev.length || 0))) {
        out.set(kClean, fb)
      } else if (!prev && !fb) {
        out.set(kClean, null)
      }
    }
  }
  return out
}

function escapeJs(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, '\\n')
}

function lineForKey(key, enText) {
  const base = enText != null && enText !== '' ? enText : key
  const cols = LANGS.map((lang) => `${lang}: '${escapeJs(base)}'`).join(', ')
  return `  '${key.replace(/'/g, "\\'")}': { ${cols} },`
}

async function main() {
  const used = new Map()
  for (const file of walkDir(SRC)) {
    const text = fs.readFileSync(file, 'utf8')
    const part = extractFromSource(text)
    for (const [k, v] of part) {
      if (!used.has(k) && v) used.set(k, v)
      else if (!used.has(k)) used.set(k, null)
      else if (v && v.length > (used.get(k) || '').length) used.set(k, v)
    }
  }

  const mod = await import(pathToFileURL(TRANSLATIONS).href)
  const existing = mod.default
  const defined = new Set(Object.keys(existing))

  const missing = [...used.keys()].filter((k) => !defined.has(k)).sort()
  if (missing.length === 0) {
    console.log('No missing keys — translations table covers all t() references.')
    return
  }

  const block = ['', '  /* ── Synced from t() fallbacks in source (English placeholder in all locales) ─ */']
  for (const key of missing) {
    const fb = used.get(key)
    block.push(lineForKey(key, fb))
  }

  let srcFile = fs.readFileSync(TRANSLATIONS, 'utf8')
  const marker = '\n}\n\nexport default translations'
  const idx = srcFile.indexOf(marker)
  if (idx === -1) throw new Error('Could not find closing brace before export default')
  const inner = '\n' + block.join('\n')
  srcFile = srcFile.slice(0, idx) + inner + srcFile.slice(idx)
  fs.writeFileSync(TRANSLATIONS, srcFile, 'utf8')
  console.log('Added', missing.length, 'keys to translations.js')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
