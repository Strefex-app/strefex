/**
 * One-shot migration: replace common hardcoded hex/RGBA UI colors with design tokens
 * so dark mode inherits from [data-theme="dark"] variables.
 * Skips lines that define CSS custom properties (--foo: #...).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.join(__dirname, '..', 'src')

const REPLACEMENTS = [
  // Backgrounds (longer hex first)
  [/background-color:\s*#ffffff\b/gi, 'background-color: var(--bg-card)'],
  [/background-color:\s*#fff\b/gi, 'background-color: var(--bg-card)'],
  [/background:\s*#ffffff\b/gi, 'background: var(--bg-card)'],
  [/background:\s*#fff\b/gi, 'background: var(--bg-card)'],
  [/background:\s*white\b/gi, 'background: var(--bg-card)'],
  [/background-color:\s*white\b/gi, 'background-color: var(--bg-card)'],

  [/background-color:\s*#f8f9fa\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#f8f9fa\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#fafbfc\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#fafbfc\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#f5f6fa\b/gi, 'background-color: var(--bg-primary)'],
  [/background:\s*#f5f6fa\b/gi, 'background: var(--bg-primary)'],
  [/background-color:\s*#f5f5f5\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#f5f5f5\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#f4f7fb\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#f4f7fb\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#f0f2f5\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#f0f2f5\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#f0f4f8\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#f0f4f8\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#f1f5f9\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#f1f5f9\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#f8fafc\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#f8fafc\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#eceff1\b/gi, 'background-color: var(--bg-surface)'],
  [/background:\s*#eceff1\b/gi, 'background: var(--bg-surface)'],
  [/background-color:\s*#eee\b/gi, 'background-color: var(--border-color)'],
  [/background:\s*#eee\b/gi, 'background: var(--border-color)'],
  [/background-color:\s*#e0e0e0\b/gi, 'background-color: var(--border-color)'],

  // Text
  [/color:\s*#1a1a2e\b/gi, 'color: var(--color-primary)'],
  [/color:\s*#192a56\b/gi, 'color: var(--color-primary)'],
  [/color:\s*#222222\b/gi, 'color: var(--color-primary)'],
  [/color:\s*#222\b/gi, 'color: var(--color-primary)'],
  [/color:\s*#333333\b/gi, 'color: var(--color-primary)'],
  [/color:\s*#333\b/gi, 'color: var(--color-primary)'],
  [/color:\s*#444444\b/gi, 'color: var(--color-secondary)'],
  [/color:\s*#444\b/gi, 'color: var(--color-secondary)'],
  [/color:\s*#555555\b/gi, 'color: var(--color-secondary)'],
  [/color:\s*#555\b/gi, 'color: var(--color-secondary)'],
  [/color:\s*#666666\b/gi, 'color: var(--color-secondary)'],
  [/color:\s*#666\b/gi, 'color: var(--color-secondary)'],
  [/color:\s*#777\b/gi, 'color: var(--color-muted)'],
  [/color:\s*#888888\b/gi, 'color: var(--color-muted)'],
  [/color:\s*#888\b/gi, 'color: var(--color-muted)'],
  [/color:\s*#999\b/gi, 'color: var(--color-muted)'],

  // Common borders
  [/border:\s*1px\s+solid\s+#e0e0e0\b/gi, 'border: 1px solid var(--border-color)'],
  [/border:\s*1px\s+solid\s+#e5e5e5\b/gi, 'border: 1px solid var(--border-color)'],
  [/border:\s*1px\s+solid\s+#eeeeee\b/gi, 'border: 1px solid var(--border-color)'],
  [/border:\s*1px\s+solid\s+#eee\b/gi, 'border: 1px solid var(--border-color)'],
  [/border-bottom:\s*1px\s+solid\s+#e0e0e0\b/gi, 'border-bottom: 1px solid var(--border-color)'],
  [/border-top:\s*1px\s+solid\s+#e0e0e0\b/gi, 'border-top: 1px solid var(--border-color)'],

  // Light gray borders (rgba) — only where explicitly a border stroke
  [/border:\s*1px\s+solid\s+rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?0?6\s*\)/gi, 'border: 1px solid var(--border-light)'],
  [/border:\s*1px\s+solid\s+rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?0?5\s*\)/gi, 'border: 1px solid var(--border-light)'],

  // Common soft card shadows → design token
  [/box-shadow:\s*0\s+2px\s+8px\s+rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?0?5\s*\)/gi, 'box-shadow: var(--shadow-sm)'],
  [/box-shadow:\s*0\s+2px\s+8px\s+rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.?0?6\s*\)/gi, 'box-shadow: var(--shadow-sm)'],

  // var() fallbacks that pin light mode — chain to design tokens
  [/, \s*#fff\s*\)/g, ', var(--bg-card))'],
  [/, \s*#ffffff\s*\)/g, ', var(--bg-card))'],
  [/, \s*#e2e8f0\s*\)/g, ', var(--border-color))'],
  [/, \s*#e0e0e0\s*\)/g, ', var(--border-color))'],
  [/, \s*#cbd5e1\s*\)/g, ', var(--border-color))'],
  [/, \s*#94a3b8\s*\)/g, ', var(--color-muted))'],
  [/, \s*#1e293b\s*\)/g, ', var(--color-primary))'],
  [/, \s*#475569\s*\)/g, ', var(--color-secondary))'],
]

function shouldSkipLine(line) {
  const t = line.trim()
  if (/^--[\w-]+\s*:/.test(t)) return true
  return false
}

function transform(content) {
  const lines = content.split('\n')
  return lines
    .map((line) => {
      if (shouldSkipLine(line)) return line
      let out = line
      for (const [re, rep] of REPLACEMENTS) {
        out = out.replace(re, rep)
      }
      return out
    })
    .join('\n')
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (name.endsWith('.css')) acc.push(p)
  }
  return acc
}

let changed = 0
let files = 0
for (const file of walk(srcRoot)) {
  const before = fs.readFileSync(file, 'utf8')
  const after = transform(before)
  if (after !== before) {
    fs.writeFileSync(file, after, 'utf8')
    changed++
    files++
    console.log('updated', path.relative(srcRoot, file))
  }
}
console.log(`Done. ${changed} files modified.`)
