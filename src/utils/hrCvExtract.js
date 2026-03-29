/**
 * HR hiring — extract text from CV files and parse contact fields.
 * PDF: pdfjs-dist (worker from CDN for Vite compatibility).
 * Images: tesseract.js (dynamic import).
 */

const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
const MAX_STORE_TEXT = 12000

/** @param {string} text */
export function extractContactsFromCvText(text) {
  const raw = String(text || '').replace(/\r/g, '\n')
  const emailRx = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const emails = [...new Set((raw.match(emailRx) || []).map((e) => e.toLowerCase()))]
  const email = emails[0] || ''

  const phoneRx = /(?:\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{2,10}(?:[\s\-.]?\d{2,6})?/g
  const phones = (raw.match(phoneRx) || []).filter((p) => /\d{3,}/.test(p.replace(/\D/g, '')))
  const phone = phones[0] ? phones[0].trim() : ''

  let name = ''
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
  const skip = new Set(['curriculum vitae', 'resume', 'cv', 'phone', 'email', 'mobile', 'tel', 'name', 'address'])
  for (let i = 0; i < Math.min(lines.length, 12); i += 1) {
    const line = lines[i]
    if (line.length > 60 || emailRx.test(line)) continue
    if (skip.has(line.toLowerCase())) continue
    if (/^[\d\s\-+().]+$/.test(line)) continue
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}$/.test(line) || /^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(line)) {
      name = line
      break
    }
  }
  if (!name && lines[0] && lines[0].length < 50 && !emailRx.test(lines[0])) {
    name = lines[0]
  }

  return { name: name.trim(), email, phone }
}

function truncateForStore(text) {
  const t = String(text || '')
  return t.length <= MAX_STORE_TEXT ? t : `${t.slice(0, MAX_STORE_TEXT)}…`
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function extractTextFromCvFile(file) {
  if (!file) return ''
  const name = (file.name || '').toLowerCase()
  const type = file.type || ''

  if (type === 'text/plain' || name.endsWith('.txt')) {
    return truncateForStore(await file.text())
  }

  if (type.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(name)) {
    const Tesseract = (await import('tesseract.js')).default
    const { data } = await Tesseract.recognize(file, 'eng+deu', { logger: () => {} })
    return truncateForStore(data?.text || '')
  }

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    try {
      const pdfjs = await import('pdfjs-dist')
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC
      }
      const buf = await file.arrayBuffer()
      const doc = await pdfjs.getDocument({ data: buf }).promise
      let full = ''
      const maxPages = Math.min(doc.numPages, 12)
      for (let p = 1; p <= maxPages; p += 1) {
        const page = await doc.getPage(p)
        const content = await page.getTextContent()
        const strings = content.items.map((it) => ('str' in it ? it.str : ''))
        full += `${strings.join(' ')}\n`
      }
      return truncateForStore(full)
    } catch {
      return ''
    }
  }

  return ''
}

/**
 * @param {File[]} files
 * @param {(done: number, total: number, label: string) => void} [onProgress]
 */
export async function extractManyCvFiles(files, onProgress) {
  const list = Array.from(files || [])
  const out = []
  for (let i = 0; i < list.length; i += 1) {
    const file = list[i]
    onProgress?.(i, list.length, file.name)
    const text = await extractTextFromCvFile(file)
    out.push({ file, fileName: file.name, text })
  }
  onProgress?.(list.length, list.length, '')
  return out
}
