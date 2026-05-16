import {
  loadStrefexLogoForPdf,
  drawPmPdfHeader,
  drawPmPdfSubtitleBar,
  drawPmPdfFooter,
  PM_PDF_FOOTER_H,
} from './pmPdfExport'

const FOOTER_GAP_MM = 5
/** Space between subtitle bar and image body. */
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
 * Portrait A4: STREFEX header + subtitle each page; questionnaire + remarks + signatures
 * split vertically. Page count matches actual slices (no “of N” mismatch).
 */
export async function exportHtmlToStrefexPortraitPdfPaged(element, opts) {
  if (!element) throw new Error('Nothing to export')

  const html2canvas = (await import('html2canvas')).default
  const { default: jsPDF } = await import('jspdf')

  const hidden = []
  element.querySelectorAll('.ah-pdf-exclude, .pm-pdf-exclude').forEach((n) => {
    hidden.push({ n, v: n.style.visibility })
    n.style.visibility = 'hidden'
  })

  await new Promise((r) => setTimeout(r, 120))

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    scrollX: 0,
    scrollY: 0,
    x: 0,
    y: 0,
  })

  hidden.forEach(({ n, v }) => {
    n.style.visibility = v
  })

  const logo = await loadStrefexLogoForPdf()

  const measurePdf = new jsPDF('p', 'mm', 'a4')
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

  const pdf = new jsPDF('p', 'mm', 'a4')
  let yPx = 0

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
    if (pageIndex > 0) {
      pdf.addPage('p', 'a4')
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

  pdf.save(opts.filename)
}
