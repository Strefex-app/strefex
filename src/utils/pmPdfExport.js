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
