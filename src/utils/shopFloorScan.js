/**
 * Shop-floor scan helpers: resolve a lot by lot number or serial.
 */

export function normalizeScanCode(raw) {
  return String(raw || '').trim().toUpperCase()
}

export function findLotByScan(lots = [], rawCode) {
  const code = normalizeScanCode(rawCode)
  if (!code) return null
  const list = Array.isArray(lots) ? lots : []
  return (
    list.find((lot) => normalizeScanCode(lot.lotNumber) === code)
    || list.find((lot) => normalizeScanCode(lot.serialNumber) === code)
    || list.find((lot) => normalizeScanCode(lot.materialCert) === code)
    || null
  )
}

export function formatLotLabel(lot) {
  if (!lot) return ''
  const serial = lot.serialNumber ? ` · S/N ${lot.serialNumber}` : ''
  return `${lot.lotNumber || lot.id}${serial}`
}
