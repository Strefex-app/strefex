/**
 * Shared PDF chrome for STREFEX (same pipeline as Project Management:
 * html2canvas capture + jsPDF with header/footer). Used by PM, auditor reports, etc.
 */

export const PM_PDF_HEADER_H = 18
export const PM_PDF_SUBTITLE_H = 7
export const PM_PDF_FOOTER_H = 8

export async function loadStrefexLogoForPdf() {
  try {
    const logoImg = new Image()
    logoImg.crossOrigin = 'anonymous'
    logoImg.src = `${import.meta.env.BASE_URL}assets/strefex-logo-reference.png`
    await new Promise((res, rej) => {
      logoImg.onload = res
      logoImg.onerror = rej
      setTimeout(rej, 3000)
    })
    const lc = document.createElement('canvas')
    lc.width = logoImg.width
    lc.height = logoImg.height
    const ctx = lc.getContext('2d')
    ctx.drawImage(logoImg, 0, 0)
    const imgData = ctx.getImageData(0, 0, lc.width, lc.height)
    const px = imgData.data
    for (let i = 0; i < px.length; i += 4) {
      const brightness = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114
      if (brightness < 60) {
        px[i + 3] = 0
      } else {
        px[i] = 255
        px[i + 1] = 255
        px[i + 2] = 255
        px[i + 3] = Math.round((brightness / 255) * 255)
      }
    }
    ctx.putImageData(imgData, 0, 0)
    return {
      dataUrl: lc.toDataURL('image/png'),
      imgW: lc.width,
      imgH: lc.height,
    }
  } catch {
    return null
  }
}

function paintPmPdfHeaderGradient(pdf, w, headerH) {
  pdf.setFillColor(0, 2, 34)
  pdf.rect(0, 0, w * 0.5, headerH, 'F')
  pdf.setFillColor(0, 8, 136)
  pdf.rect(w * 0.5, 0, w * 0.5, headerH, 'F')
  for (let i = 0; i < 20; i += 1) {
    const g = Math.round(2 + (8 - 2) * (i / 20))
    const b = Math.round(34 + (136 - 34) * (i / 20))
    pdf.setFillColor(0, g, b)
    pdf.rect((w / 20) * i, 0, w / 20 + 0.5, headerH, 'F')
  }
}

/** @returns header height (mm) */
export function drawPmPdfHeader(pdf, w, titleCenter, logo, dateStr) {
  const headerH = PM_PDF_HEADER_H
  paintPmPdfHeaderGradient(pdf, w, headerH)

  if (logo?.dataUrl) {
    const logoHmm = 10
    const logoWmm = (logo.imgW / logo.imgH) * logoHmm
    pdf.addImage(logo.dataUrl, 'PNG', 8, (headerH - logoHmm) / 2, logoWmm, logoHmm)
  } else {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(14)
    pdf.setTextColor(255, 255, 255)
    pdf.text('STREFEX', 10, headerH / 2 + 2)
  }

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(255, 255, 255)
  pdf.text(titleCenter, w / 2, headerH / 2 + 2, { align: 'center' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(180, 190, 220)
  const d = dateStr ?? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  pdf.text(d, w - 10, headerH / 2 + 2, { align: 'right' })

  return headerH
}

export function drawPmPdfSubtitleBar(pdf, w, yStart, statsText) {
  const subH = PM_PDF_SUBTITLE_H
  pdf.setFillColor(244, 246, 249)
  pdf.rect(0, yStart, w, subH, 'F')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(100, 100, 120)
  if (statsText) {
    pdf.text(statsText, 10, yStart + subH / 2 + 1)
  }
  return subH
}

export function addPmPdfCanvasFit(pdf, canvas, w, pageH, contentTopMm) {
  const contentAvailH = pageH - contentTopMm - 14
  const contentAvailW = w - 16
  const imgRatio = canvas.height / canvas.width
  let imgW = contentAvailW
  let imgH = imgW * imgRatio
  if (imgH > contentAvailH) {
    imgH = contentAvailH
    imgW = imgH / imgRatio
  }
  const imgX = 8 + (contentAvailW - imgW) / 2
  pdf.setDrawColor(220, 225, 235)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(imgX - 1, contentTopMm - 1, imgW + 2, imgH + 2, 1, 1, 'S')
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imgX, contentTopMm, imgW, imgH)
}

export function drawPmPdfFooter(pdf, w, pageH, pageLabel, printedByName) {
  const footerH = PM_PDF_FOOTER_H
  const footerY = pageH - footerH
  for (let i = 0; i < 20; i += 1) {
    const g = Math.round(8 + (2 - 8) * (i / 20))
    const b = Math.round(136 + (34 - 136) * (i / 20))
    pdf.setFillColor(0, g, b)
    pdf.rect((w / 20) * i, footerY, w / 20 + 0.5, footerH, 'F')
  }
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7)
  pdf.setTextColor(180, 190, 220)
  pdf.text(`Printed by: ${printedByName || 'Unknown'}`, 10, footerY + footerH / 2 + 1)
  pdf.setTextColor(140, 150, 180)
  pdf.text('STREFEX Platform — Confidential', w / 2, footerY + footerH / 2 + 1, { align: 'center' })
  pdf.setTextColor(180, 190, 220)
  pdf.text(pageLabel, w - 10, footerY + footerH / 2 + 1, { align: 'right' })
}

/** A4 content width at html2canvas scale 2 (~96 dpi). */
export const PM_PDF_CAPTURE_WIDTH = {
  portrait: 794,
  landscape: 1123,
}

const FOOTER_GAP_MM = 5
const SUBTITLE_CLEARANCE_MM = 5

function sliceCanvasVertically(source, yPx, sliceHeightPx) {
  const h = Math.max(0, Math.min(sliceHeightPx, source.height - yPx))
  if (h <= 0) return null
  const c = document.createElement('canvas')
  c.width = source.width
  c.height = h
  const ctx = c.getContext('2d')
  ctx.drawImage(source, 0, yPx, source.width, h, 0, 0, source.width, h)
  return c
}

/**
 * Multi-page STREFEX PDF from a DOM element (portrait or landscape A4).
 * Splits tall content across pages instead of shrinking to one page.
 */
export async function exportHtmlToStrefexPdfPaged(element, opts) {
  if (!element) throw new Error('Nothing to export')

  const orientation = opts.orientation === 'l' ? 'l' : 'p'
  const html2canvas = (await import('html2canvas')).default
  const { default: jsPDF } = await import('jspdf')

  const hidden = []
  element.querySelectorAll('.ah-pdf-exclude, .pm-pdf-exclude').forEach((n) => {
    hidden.push({ n, v: n.style.visibility })
    n.style.visibility = 'hidden'
  })

  const layoutBackup = {
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    margin: element.style.margin,
  }
  const captureW = opts.captureWidthPx
    ?? (orientation === 'l' ? PM_PDF_CAPTURE_WIDTH.landscape : PM_PDF_CAPTURE_WIDTH.portrait)
  element.style.width = `${captureW}px`
  element.style.maxWidth = `${captureW}px`
  element.style.margin = '0 auto'
  element.classList.add('pm-pdf-capture')

  if (opts.beforeCapture) {
    await opts.beforeCapture(element)
  }

  await new Promise((r) => setTimeout(r, 120))

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
  })

  element.classList.remove('pm-pdf-capture')
  element.style.width = layoutBackup.width
  element.style.maxWidth = layoutBackup.maxWidth
  element.style.margin = layoutBackup.margin

  hidden.forEach(({ n, v }) => {
    n.style.visibility = v
  })

  if (opts.afterCapture) {
    opts.afterCapture(element)
  }

  const logo = await loadStrefexLogoForPdf()

  const measurePdf = new jsPDF(orientation, 'mm', 'a4')
  const wMm = measurePdf.internal.pageSize.getWidth()
  const pageHMm = measurePdf.internal.pageSize.getHeight()
  const marginXMm = 8
  const availWmm = wMm - 2 * marginXMm
  const footerReserveMm = PM_PDF_FOOTER_H + FOOTER_GAP_MM

  const scaledHmm = (canvas.height / canvas.width) * availWmm
  const mmPerPx = scaledHmm / Math.max(1, canvas.height)

  const longestSubtitle = `${opts.subtitle || ''}${opts.subtitle ? ' · ' : ''}continued (page 99)`
  const h0 = drawPmPdfHeader(measurePdf, wMm, opts.title, logo)
  const s0 = drawPmPdfSubtitleBar(measurePdf, wMm, h0, longestSubtitle)
  const contentTopWorstMm = h0 + s0 + SUBTITLE_CLEARANCE_MM
  const usableWorstMm = pageHMm - contentTopWorstMm - footerReserveMm - 1
  const slicePxPlan = Math.max(1, Math.floor(usableWorstMm / mmPerPx))

  const slicesPx = []
  for (let y = 0; y < canvas.height; ) {
    const sp = Math.min(slicePxPlan, canvas.height - y)
    slicesPx.push(sp)
    y += sp
  }
  if (slicesPx.length === 0) {
    slicesPx.push(Math.max(1, canvas.height))
  }
  const totalPages = Math.max(1, slicesPx.length)

  const pdf = new jsPDF(orientation, 'mm', 'a4')
  let yPx = 0

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    if (pageIndex > 0) {
      pdf.addPage(orientation, 'a4')
    }

    const subtitle =
      totalPages > 1 && pageIndex > 0
        ? `${opts.subtitle || ''}${opts.subtitle ? ' · ' : ''}continued (page ${pageIndex + 1} of ${totalPages})`
        : opts.subtitle || ''

    const headerH = drawPmPdfHeader(pdf, wMm, opts.title, logo)
    const subH = drawPmPdfSubtitleBar(pdf, wMm, headerH, subtitle)
    const contentTop = headerH + subH + SUBTITLE_CLEARANCE_MM

    const thisSlicePx = slicesPx[pageIndex]
    const sliceHmm = thisSlicePx * mmPerPx

    const slice = sliceCanvasVertically(canvas, yPx, thisSlicePx)
    if (slice) {
      pdf.setDrawColor(220, 225, 235)
      pdf.setLineWidth(0.25)
      pdf.roundedRect(marginXMm - 0.5, contentTop - 0.5, availWmm + 1, sliceHmm + 1, 0.5, 0.5, 'S')
      pdf.addImage(slice.toDataURL('image/png'), 'PNG', marginXMm, contentTop, availWmm, sliceHmm)
    }

    drawPmPdfFooter(
      pdf,
      wMm,
      pageHMm,
      `Page ${pageIndex + 1} of ${totalPages}`,
      opts.printedBy || 'Unknown',
    )
    yPx += thisSlicePx
  }

  pdf.save(opts.filename || 'report.pdf')
}

/**
 * Single-page STREFEX PDF — scales captured content to fit one A4 page (portrait or landscape).
 * Intended for compact executive summaries with orientation-specific CSS layout.
 */
export async function exportHtmlToStrefexPdfOnePage(element, opts) {
  if (!element) throw new Error('Nothing to export')

  const orientation = opts.orientation === 'l' ? 'l' : 'p'
  const html2canvas = (await import('html2canvas')).default
  const { default: jsPDF } = await import('jspdf')

  const hidden = []
  element.querySelectorAll('.ah-pdf-exclude, .pm-pdf-exclude').forEach((n) => {
    hidden.push({ n, v: n.style.visibility })
    n.style.visibility = 'hidden'
  })

  const layoutBackup = {
    width: element.style.width,
    maxWidth: element.style.maxWidth,
    margin: element.style.margin,
  }
  const captureW = opts.captureWidthPx
    ?? (orientation === 'l' ? PM_PDF_CAPTURE_WIDTH.landscape : PM_PDF_CAPTURE_WIDTH.portrait)

  element.style.width = `${captureW}px`
  element.style.maxWidth = `${captureW}px`
  element.style.margin = '0 auto'
  element.classList.add('pm-pdf-capture')
  element.classList.remove('pm-pdf-capture--portrait', 'pm-pdf-capture--landscape')
  element.classList.add(orientation === 'l' ? 'pm-pdf-capture--landscape' : 'pm-pdf-capture--portrait')

  if (opts.beforeCapture) {
    await opts.beforeCapture(element)
  }

  await new Promise((r) => setTimeout(r, 120))

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
  })

  element.classList.remove('pm-pdf-capture', 'pm-pdf-capture--portrait', 'pm-pdf-capture--landscape')
  element.style.width = layoutBackup.width
  element.style.maxWidth = layoutBackup.maxWidth
  element.style.margin = layoutBackup.margin

  hidden.forEach(({ n, v }) => {
    n.style.visibility = v
  })

  if (opts.afterCapture) {
    opts.afterCapture(element)
  }

  const logo = await loadStrefexLogoForPdf()
  const pdf = new jsPDF(orientation, 'mm', 'a4')
  const wMm = pdf.internal.pageSize.getWidth()
  const pageHMm = pdf.internal.pageSize.getHeight()

  const headerH = drawPmPdfHeader(pdf, wMm, opts.title, logo)
  const subH = drawPmPdfSubtitleBar(pdf, wMm, headerH, opts.subtitle || '')
  const contentTop = headerH + subH + SUBTITLE_CLEARANCE_MM

  addPmPdfCanvasFit(pdf, canvas, wMm, pageHMm, contentTop)
  drawPmPdfFooter(pdf, wMm, pageHMm, 'Page 1 of 1', opts.printedBy || 'Unknown')

  pdf.save(opts.filename || 'report.pdf')
}
