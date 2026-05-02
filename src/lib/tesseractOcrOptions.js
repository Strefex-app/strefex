/**
 * Same-origin Tesseract worker + WASM core (Vite-resolved URLs).
 * Defaults load these from jsdelivr inside a blob worker, which often fails on
 * mobile Safari / strict CSP; direct Worker + bundled assets avoids that.
 */
import workerPath from 'tesseract.js/dist/worker.min.js?url'
import corePath from 'tesseract.js-core/tesseract-core-lstm.wasm.js?url'

export function getTesseractBundledOptions() {
  return {
    workerPath,
    corePath,
    workerBlobURL: false,
  }
}
