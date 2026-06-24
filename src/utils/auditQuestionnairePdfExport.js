import { exportHtmlToStrefexPdfPaged } from './pmPdfExport'

/**
 * Portrait A4: STREFEX header + subtitle each page; questionnaire + remarks + signatures
 * split vertically. Page count matches actual slices (no “of N” mismatch).
 */
export async function exportHtmlToStrefexPortraitPdfPaged(element, opts) {
  return exportHtmlToStrefexPdfPaged(element, {
    ...opts,
    orientation: 'p',
  })
}
