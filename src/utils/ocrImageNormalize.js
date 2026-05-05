const MAX_OCR_IMAGE_SIDE_DESKTOP = 2400
const MAX_OCR_IMAGE_SIDE_MOBILE = 1760
export const OCR_JPEG_QUALITY = 0.88

function getMaxOcrImageSide() {
  if (typeof window === 'undefined') return MAX_OCR_IMAGE_SIDE_DESKTOP
  try {
    return window.matchMedia('(max-width: 768px)').matches
      ? MAX_OCR_IMAGE_SIDE_MOBILE
      : MAX_OCR_IMAGE_SIDE_DESKTOP
  } catch {
    return MAX_OCR_IMAGE_SIDE_DESKTOP
  }
}

async function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality)
  })
}

async function resizeBitmapToJpeg(bitmap, maxSide, quality) {
  const iw = bitmap.width
  const ih = bitmap.height
  if (iw < 8 || ih < 8) return null
  const scale = Math.min(1, maxSide / Math.max(iw, ih))
  const w = Math.max(1, Math.round(iw * scale))
  const h = Math.max(1, Math.round(ih * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvasToJpegBlob(canvas, quality)
}

async function normalizeImageViaHtmlImage(blob, maxSide, quality) {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image decode failed'))
      img.src = url
    })
    const iw = img.naturalWidth
    const ih = img.naturalHeight
    if (iw < 8 || ih < 8) return blob
    const scale = Math.min(1, maxSide / Math.max(iw, ih))
    const w = Math.max(1, Math.round(iw * scale))
    const h = Math.max(1, Math.round(ih * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return blob
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)
    return await canvasToJpegBlob(canvas, quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function isHeicLike(file) {
  if (!file || typeof file !== 'object') return false
  const t = (file.type || '').toLowerCase()
  const n = (file.name || '').toLowerCase()
  return t.includes('heic') || t.includes('heif') || n.endsWith('.heic') || n.endsWith('.heif')
}

/** Downscale and convert to JPEG with EXIF orientation where supported; mobile-safe fallbacks. */
export async function normalizeImageForOcr(blob) {
  if (!(blob instanceof Blob)) return blob

  const maxSide = getMaxOcrImageSide()

  const tryBitmap = async (opts) => {
    try {
      if (opts) return await createImageBitmap(blob, opts)
      return await createImageBitmap(blob)
    } catch {
      return null
    }
  }

  let bitmap =
    (await tryBitmap({ imageOrientation: 'from-image' })) ||
    (await tryBitmap())

  if (bitmap) {
    try {
      const out = await resizeBitmapToJpeg(bitmap, maxSide, OCR_JPEG_QUALITY)
      return out || blob
    } finally {
      bitmap.close?.()
    }
  }

  try {
    return await normalizeImageViaHtmlImage(blob, maxSide, OCR_JPEG_QUALITY)
  } catch {
    return blob
  }
}

/** Rotate JPEG/Blob clockwise in 90° steps. */
export async function rotateBlobQuarterTurnsCw(blob, quarterTurns) {
  const q = ((((quarterTurns | 0) % 4) + 4) % 4)
  if (!(blob instanceof Blob) || q === 0) return blob
  let bitmap
  try {
    bitmap = await createImageBitmap(blob).catch(() => null)
    if (!bitmap) return blob
    const w = bitmap.width
    const h = bitmap.height
    if (w < 2 || h < 2) return blob
    const nw = q % 2 === 1 ? h : w
    const nh = q % 2 === 1 ? w : h
    const canvas = document.createElement('canvas')
    canvas.width = nw
    canvas.height = nh
    const ctx = canvas.getContext('2d')
    if (!ctx) return blob
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, nw, nh)
    ctx.translate(nw / 2, nh / 2)
    ctx.rotate((q * Math.PI) / 2)
    ctx.drawImage(bitmap, -w / 2, -h / 2)
    return await canvasToJpegBlob(canvas, OCR_JPEG_QUALITY)
  } catch {
    return blob
  } finally {
    bitmap?.close?.()
  }
}
