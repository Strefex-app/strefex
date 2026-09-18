import { PROFILE_ATTACHMENT_SLOT } from '../constants/companyProfileDirectory'
import { COMPANY_PACK_SLOTS, normalizeProfileAttachments } from './companyProfilePack'

const PDF_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs'
const MAX_PDF_PAGES = 8
const MAX_EDGE = 1280
const JPEG_QUALITY = 0.72

export const CATALOGUE_FOLDER = 'profile-attachments/catalogue'

export function isCatalogueAttachment(file) {
  return (file?.profile_slot || '') === PROFILE_ATTACHMENT_SLOT.PACK_CATALOGUE
}

export function catalogueFramesFromAttachments(list) {
  return normalizeProfileAttachments(list)
    .filter(isCatalogueAttachment)
    .slice()
    .sort((a, b) => {
      const sa = String(a.pack_source_slot || '')
      const sb = String(b.pack_source_slot || '')
      if (sa !== sb) return sa.localeCompare(sb)
      return (Number(a.page) || 0) - (Number(b.page) || 0)
    })
    .map((file) => {
      const slotMeta = COMPANY_PACK_SLOTS.find((s) => s.id === file.pack_source_slot)
      const page = Number(file.page) || 1
      return {
        path: file.path,
        caption: slotMeta ? `${slotMeta.shortLabel} · ${page}` : `Catalogue · ${page}`,
        page,
        slot: file.pack_source_slot || '',
      }
    })
}

export function attachmentsWithoutCatalogueSlot(list, sourceSlot) {
  return normalizeProfileAttachments(list).filter(
    (a) => !(isCatalogueAttachment(a) && a.pack_source_slot === sourceSlot),
  )
}

export function isPdfPackFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const t = String(file?.type || '').toLowerCase()
  return t === 'application/pdf' || /\.pdf$/i.test(name)
}

export function isImagePackFile(file) {
  const name = String(file?.name || '').toLowerCase()
  const t = String(file?.type || '').toLowerCase()
  return t.startsWith('image/') || /\.(jpe?g|png|gif|webp)$/i.test(name)
}

function canvasToJpegBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY)
  })
}

function scaleCanvas(source, maxEdge = MAX_EDGE) {
  const w = source.width
  const h = source.height
  if (!w || !h) return source
  const scale = Math.min(1, maxEdge / Math.max(w, h))
  if (scale >= 0.999) return source
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(w * scale))
  out.height = Math.max(1, Math.round(h * scale))
  const ctx = out.getContext('2d')
  ctx.drawImage(source, 0, 0, out.width, out.height)
  return out
}

async function pdfFileToJpegBlobs(file) {
  if (typeof document === 'undefined') return []
  const pdfjs = await import('pdfjs-dist')
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC
  }
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const n = Math.min(doc.numPages, MAX_PDF_PAGES)
  const blobs = []
  for (let p = 1; p <= n; p += 1) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale: 1.35 })
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: ctx, viewport }).promise
    const sized = scaleCanvas(canvas)
    const blob = await canvasToJpegBlob(sized)
    if (blob) blobs.push(blob)
  }
  return blobs
}

async function imageFileToJpegBlob(file) {
  if (typeof document === 'undefined') return null
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Image could not be read'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || img.width
    canvas.height = img.naturalHeight || img.height
    canvas.getContext('2d').drawImage(img, 0, 0)
    return canvasToJpegBlob(scaleCanvas(canvas))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Turn a PDF or photo into JPEG blobs for the in-platform catalogue. PowerPoint is skipped. */
export async function fileToCatalogueBlobs(file) {
  if (!file) return []
  if (isPdfPackFile(file)) return pdfFileToJpegBlobs(file)
  if (isImagePackFile(file)) {
    const blob = await imageFileToJpegBlob(file)
    return blob ? [blob] : []
  }
  return []
}

export async function syncCatalogueForSlot({
  companyId,
  slot,
  sourceFile,
  attachments,
  upload,
  remove,
}) {
  const previous = normalizeProfileAttachments(attachments).filter(
    (a) => isCatalogueAttachment(a) && a.pack_source_slot === slot,
  )
  for (const row of previous) {
    try {
      await remove(row.path)
    } catch { /* already gone */ }
  }
  let next = attachmentsWithoutCatalogueSlot(attachments, slot)
  const blobs = await fileToCatalogueBlobs(sourceFile)
  let page = 1
  for (const blob of blobs) {
    const file = new File([blob], `${slot}-${page}.jpg`, { type: 'image/jpeg' })
    const meta = await upload(companyId, file, PROFILE_ATTACHMENT_SLOT.PACK_CATALOGUE, {
      folder: CATALOGUE_FOLDER,
    })
    next = [
      ...next,
      {
        ...meta,
        pack_source_slot: slot,
        page,
      },
    ]
    page += 1
  }
  return next
}

export async function blobUrlFromSignedPath(path, getSignedUrl) {
  if (!path || typeof getSignedUrl !== 'function') return null
  const signed = await getSignedUrl(path, 180)
  if (!signed) return null
  const res = await fetch(signed)
  if (!res.ok) throw new Error('Catalogue frame could not be loaded')
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
