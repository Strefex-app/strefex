#!/usr/bin/env node
/**
 * Unpack STREFEX Website v6.1.html into public/marketing-site/
 * and wire Sign in / Sign up / Enter as buyer / List my plant CTAs.
 */
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const SOURCE = process.argv[2] || path.join(process.env.HOME || '', 'Downloads/STREFEX Website v6.1.html')
const outDir = path.join(ROOT, 'public/marketing-site')

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE)
  process.exit(1)
}

const text = fs.readFileSync(SOURCE, 'utf8')
const manifest = JSON.parse(text.match(/<script type="__bundler\/manifest">([\s\S]*?)<\/script>/)[1])
let html = JSON.parse(text.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/)[1])

const extOf = (mime) => ({
  'application/javascript': 'js',
  'text/javascript': 'js',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'font/woff2': 'woff2',
  'text/css': 'css',
  'text/html': 'html',
}[mime] || 'bin')

const assetDir = path.join(outDir, 'assets-v61')
fs.mkdirSync(assetDir, { recursive: true })
for (const [uuid, entry] of Object.entries(manifest)) {
  let bytes = Buffer.from(entry.data, 'base64')
  if (entry.compressed) bytes = zlib.gunzipSync(bytes)
  const file = `${uuid}.${extOf(entry.mime)}`
  fs.writeFileSync(path.join(assetDir, file), bytes)
  html = html.split(uuid).join(`assets-v61/${file}`)
}
html = html.replace(/\s+integrity="[^"]*"/gi, '').replace(/\s+crossorigin="[^"]*"/gi, '')

// Prefer local React UMDs (already unpacked from the Design Canvas bundle).
const reactFile = fs.readdirSync(assetDir).find((f) => {
  if (!f.endsWith('.js')) return false
  const head = fs.readFileSync(path.join(assetDir, f), 'utf8').slice(0, 120)
  return head.includes('react.production.min.js') && !head.includes('react-dom')
})
const reactDomFile = fs.readdirSync(assetDir).find((f) => {
  if (!f.endsWith('.js')) return false
  const head = fs.readFileSync(path.join(assetDir, f), 'utf8').slice(0, 120)
  return head.includes('react-dom.production.min.js')
})
if (reactFile && reactDomFile) {
  const resourceBoot = `<script>
window.__resources = Object.assign({}, window.__resources, {
  "https://unpkg.com/react@18.3.1/umd/react.production.min.js": "assets-v61/${reactFile}",
  "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js": "assets-v61/${reactDomFile}"
});
</script>`
  html = html.replace(
    /(<script src="assets-v61\/[^"]+\.js"><\/script>)/i,
    `${resourceBoot}\n$1`,
  )
}

const linkBtn = (href, label, variant = 'primary', size = 'md') => {
  const base = "display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-family:'IBM Plex Sans',system-ui,sans-serif;cursor:pointer;border-radius:4px;box-sizing:border-box;line-height:1.2;letter-spacing:0;white-space:nowrap"
  const sizes = {
    sm: 'font-size:13px;font-weight:600;padding:8px 16px',
    md: 'font-size:14px;font-weight:600;padding:12px 20px;width:100%',
  }
  const variants = {
    primary: 'color:#04101C;background:#3AA6C9;border:1px solid #3AA6C9',
    secondary: 'color:#E7EEF6;background:transparent;border:1px solid rgba(154,174,199,.34)',
    seller: 'color:#fff;background:#C4491F;border:1px solid #C4491F',
  }
  return `<a href="${href}" target="_top" style="${base};${sizes[size]};${variants[variant]}">${label}</a>`
}

html = html.replace(
  /<div style="display:inline-flex;--white:transparent;--navy-800:#FFFFFF;--border-strong:rgba\(154,174,199,\.34\);--steel-200:rgba\(154,174,199,\.12\)">\s*<x-import component-from-global-scope="STREFEXDesignSystem_b5f82d\.Button" variant="secondary" size="sm" hint-size="auto,32px">\{\{\s*tSignIn\s*\}\}<\/x-import>\s*<\/div>/,
  `<div style="display:inline-flex">${linkBtn('/login', '{{ tSignIn }}', 'secondary', 'sm')}</div>`,
)
html = html.replace(
  /<div style="display:inline-flex;--action-primary:#3AA6C9;--action-primary-hover:#6FC8E4;--action-primary-active:#2C8CAC;--white:#04101C">\s*<x-import component-from-global-scope="STREFEXDesignSystem_b5f82d\.Button" size="sm" hint-size="auto,32px">\{\{\s*tSignUp\s*\}\}<\/x-import>\s*<\/div>/,
  `<div style="display:inline-flex">${linkBtn('/register', '{{ tSignUp }}', 'primary', 'sm')}</div>`,
)
html = html.replace(
  /<x-import component-from-global-scope="STREFEXDesignSystem_b5f82d\.Button" size="md" full-width="\{\{\s*true\s*\}\}" dc-props="\{\{\s*arrowProps\s*\}\}" hint-size="auto,40px">\{\{\s*tForkACta\s*\}\}<\/x-import>/,
  linkBtn('/register?type=buyer', '{{ tForkACta }}', 'primary', 'md'),
)
html = html.replace(
  /<x-import component-from-global-scope="STREFEXDesignSystem_b5f82d\.Button" size="md" full-width="\{\{\s*true\s*\}\}" dc-props="\{\{\s*arrowProps\s*\}\}" hint-size="auto,40px">\{\{\s*tForkBCta\s*\}\}<\/x-import>/,
  linkBtn('/register?type=seller', '{{ tForkBCta }}', 'seller', 'md'),
)
html = html.replace(
  /<a href="#fork" style="font-size:14px;color:#7E96B4">\{\{\s*tFootLink4\s*\}\}<\/a>/,
  '<a href="/register?type=seller" target="_top" style="font-size:14px;color:#7E96B4">{{ tFootLink4 }}</a>',
)

const injectCss = `<style id="stx-auth-cta">
  a[href="/login"], a[href="/register"], a[href^="/register?"] {
    transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
  }
  a[href="/login"]:hover { border-color:#58C8F5 !important; color:#fff !important; }
  a[href="/register"]:hover, a[href="/register?type=buyer"]:hover { background:#6FC8E4 !important; border-color:#6FC8E4 !important; }
  a[href="/register?type=seller"]:hover { background:#D8582C !important; border-color:#D8582C !important; }
</style>`
html = html.replace(/<head([^>]*)>/i, `<head$1>${injectCss}`)
if (!/<title>/i.test(html)) {
  html = html.replace(/<head([^>]*)>/i, '<head$1><title>STREFEX — Custom manufacturing supply base</title>')
} else {
  html = html.replace(/<title>[^<]*<\/title>/i, '<title>STREFEX — Custom manufacturing supply base</title>')
}

const prev = path.join(outDir, 'index.html')
const backup = path.join(outDir, 'index.legacy.html')
if (fs.existsSync(prev) && !fs.existsSync(backup)) {
  fs.copyFileSync(prev, backup)
}

fs.writeFileSync(path.join(outDir, 'index.html'), html)
console.log('Wrote', path.join(outDir, 'index.html'), html.length, 'bytes')
console.log({
  login: (html.match(/href="\/login"/g) || []).length,
  register: (html.match(/href="\/register"/g) || []).length,
  buyer: (html.match(/href="\/register\?type=buyer"/g) || []).length,
  seller: (html.match(/href="\/register\?type=seller"/g) || []).length,
  forkPlaceholders: (html.match(/tForkACta|tForkBCta/g) || []).length,
})
