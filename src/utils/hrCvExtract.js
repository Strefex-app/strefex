/**
 * HR hiring — extract text from CV files and parse contact fields.
 * PDF: pdfjs-dist (worker from CDN for Vite compatibility).
 * Images: tesseract.js (dynamic import).
 */

const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
const MAX_STORE_TEXT = 12000
/** If PDF text layer has fewer than this many non-whitespace chars, run OCR on rendered pages (scanned PDFs). */
const PDF_MIN_TEXT_CHARS = 40
const PDF_OCR_MAX_PAGES = 4
const PDF_OCR_SCALE = 1.75

/**
 * Render PDF pages to canvas and OCR (browser only). Used when getTextContent() is empty or tiny.
 * @param {import('pdfjs-dist').PDFDocumentProxy} doc
 */
async function ocrPdfDocumentPages(doc, maxPages = PDF_OCR_MAX_PAGES) {
  if (typeof document === 'undefined') return ''
  const Tesseract = (await import('tesseract.js')).default
  let out = ''
  const n = Math.min(doc.numPages, maxPages)
  for (let p = 1; p <= n; p += 1) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: PDF_OCR_SCALE })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const renderTask = page.render({ canvasContext: ctx, viewport })
    await renderTask.promise
    const { data } = await Tesseract.recognize(canvas, 'eng+deu', { logger: () => {} })
    out += `${data?.text || ''}\n`
  }
  return out
}

/** @param {string} s */
function stripHonorifics(s) {
  return String(s || '')
    .replace(/^(?:mr|mrs|ms|dr|prof)\.?\s+/i, '')
    .trim()
}

/** @param {string} s */
function looksLikePersonName(s) {
  const t = stripHonorifics(s).replace(/\s+/g, ' ').trim()
  if (t.length < 3 || t.length > 70) return false
  if (/[@#]/.test(t)) return false
  if (/^\d+[\d\s\-+.]+$/.test(t)) return false
  if (/\.(pdf|docx?|txt)$/i.test(t)) return false
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length < 2 || words.length > 5) return false
  const letterish = (w) => /[a-zA-ZÀ-ÿ]/.test(w)
  if (!words.every(letterish)) return false
  const stop = new Set(['curriculum', 'vitae', 'resume', 'experience', 'education', 'skills', 'profile', 'summary', 'engineer', 'manager', 'specialist', 'consultant', 'director'])
  const lower = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))
  if (lower.some((w) => stop.has(w))) return false
  return true
}

/** @param {string} s */
function cleanNameLine(s) {
  let t = String(s || '').trim()
  t = t.replace(/\s*[|•·,;]\s*.*$/, '').trim()
  t = stripHonorifics(t)
  t = t.replace(/\s{2,}/g, ' ')
  return t
}

/**
 * Last-resort display name from filename: "John_Doe_CV.pdf" → "John Doe"
 * @param {string} fileName
 */
export function displayNameFromFileName(fileName) {
  const base = String(fileName || '').replace(/\.[^.]+$/i, '')
  const spaced = base.replace(/[_\-+]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!spaced) return ''
  const parts = spaced.split(/\s+/).filter((w) => !/^(cv|resume|lebenslauf|application|v\d*|final|copy)$/i.test(w))
  const out = parts.join(' ')
  const ok =
    looksLikePersonName(out) ||
    (parts.length >= 2 && parts.length <= 4 && parts.every((p) => /^[A-Za-zÀ-ÿ.-]+$/i.test(p)))
  return ok ? out : ''
}

/** @param {string} text */
export function extractContactsFromCvText(text) {
  const raw = String(text || '').replace(/\r/g, '\n')
  const normalized = raw.replace(/\u00a0/g, ' ')

  const emailRx = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g
  const emails = [...new Set((normalized.match(emailRx) || []).map((e) => e.toLowerCase()))]
  const email = emails[0] || ''

  let phone = ''
  const phoneLabelRe =
    /(?:^|\n)\s*(?:phone|tel|mobile|cell|mobi|whatsapp|handy|тел|телефон)\s*[.:]?\s*([+()\d][\d\s\-()./]{6,40})/gi
  let pm
  while ((pm = phoneLabelRe.exec(normalized)) !== null) {
    const inner = pm[1].trim().split(/\s+/).slice(0, 6).join(' ')
    const digits = inner.replace(/\D/g, '')
    if (digits.length >= 8 && digits.length <= 18) {
      phone = inner
      break
    }
  }
  if (!phone) {
    const phoneRx = /(?:\+?\d{1,3}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{2,8}(?:[\s\-.]?\d{2,6})?/g
    const phones = (normalized.match(phoneRx) || []).filter((p) => {
      const d = p.replace(/\D/g, '')
      return d.length >= 8 && d.length <= 15
    })
    phone = phones[0] ? phones[0].trim() : ''
  }

  let name = ''

  const nameAfterLabel = normalized.match(
    /(?:^|\n)\s*(?:full\s*name|name|nombre|vorname\s*(?:und|&)?\s*nachname|имя|фио)\s*[:\-–]\s*([^\n\r]{2,100})/i
  )
  if (nameAfterLabel) {
    const candidate = cleanNameLine(nameAfterLabel[1])
    if (looksLikePersonName(candidate)) name = candidate
  }

  if (!name) {
    const multilineLabel = normalized.match(
      /(?:^|\n)\s*(?:full\s*name|name)\s*[:\-–]?\s*\n+\s*([A-Za-zÀ-ÿ][^\n\r]{1,80})/i
    )
    if (multilineLabel) {
      const candidate = cleanNameLine(multilineLabel[1])
      if (looksLikePersonName(candidate)) name = candidate
    }
  }

  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean)
  const skip = new Set([
    'curriculum vitae',
    'resume',
    'cv',
    'phone',
    'email',
    'mobile',
    'tel',
    'name',
    'address',
    'lebenslauf',
    'personal details',
    'contact',
  ])

  if (!name) {
    for (let i = 0; i < Math.min(lines.length, 20); i += 1) {
      const line = lines[i]
      if (line.length > 72 || emailRx.test(line)) continue
      if (skip.has(line.toLowerCase())) continue
      if (/^[\d\s\-+()./]+$/.test(line)) continue
      const lower = line.toLowerCase()
      if (/^(page|pg\.?)\s*\d/i.test(lower)) continue
      const cleaned = cleanNameLine(line)
      if (looksLikePersonName(cleaned)) {
        name = cleaned
        break
      }
      if (
        /^[A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){0,3}$/.test(cleaned) ||
        /^[A-ZÀ-Ÿ][a-zà-ÿ]+\s+[A-ZÀ-Ÿ][a-zà-ÿ]+/.test(cleaned)
      ) {
        name = cleaned
        break
      }
    }
  }

  if (!name && email) {
    const idx = lines.findIndex((l) => emailRx.test(l))
    if (idx > 0) {
      for (let j = idx - 1; j >= Math.max(0, idx - 3); j -= 1) {
        const prev = cleanNameLine(lines[j])
        if (prev && !emailRx.test(prev) && looksLikePersonName(prev)) {
          name = prev
          break
        }
      }
    }
  }

  if (!name && lines[0] && lines[0].length < 55 && !emailRx.test(lines[0])) {
    const c0 = cleanNameLine(lines[0])
    if (looksLikePersonName(c0)) name = c0
  }

  if (!name && email) {
    const parts = normalized.split(email)[0]
    const tail = parts.replace(/\s+/g, ' ').trim().slice(-120)
    const before = tail.match(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.\-]{2,50})\s*$/)
    if (before) {
      const candidate = cleanNameLine(before[1])
      if (looksLikePersonName(candidate)) name = candidate
    }
  }

  if (!name) {
    const head = normalized.slice(0, 1200).replace(/\s+/g, ' ')
    const loose = head.match(/\b([A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){1,3})\b/)
    if (loose) {
      const candidate = cleanNameLine(loose[1])
      if (looksLikePersonName(candidate)) name = candidate
    }
  }

  if (!name) {
    for (let i = 0; i < Math.min(lines.length, 8); i += 1) {
      const line = lines[i].trim()
      if (line.length > 50 || emailRx.test(line)) continue
      if (/^[A-ZÀ-Ÿ]{2,}(?:\s+[A-ZÀ-Ÿ]{2,}){0,3}$/.test(line) && line.length >= 5) {
        const titled = line
          .toLowerCase()
          .split(/\s+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        if (looksLikePersonName(titled)) {
          name = titled
          break
        }
      }
    }
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
      const compact = full.replace(/\s/g, '')
      if (compact.length < PDF_MIN_TEXT_CHARS) {
        const ocrText = await ocrPdfDocumentPages(doc)
        const o = String(ocrText || '').trim()
        if (o) full = o
      }
      return truncateForStore(full.trim())
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
