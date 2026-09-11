/** Parse YYYY-MM-DD as a local calendar day (avoids UTC shift in Asia/EU). */
export function parseExhibitionDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return new Date(NaN)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function exhibitionYear(iso) {
  const y = Number(String(iso || '').slice(0, 4))
  return Number.isFinite(y) ? y : parseExhibitionDate(iso).getFullYear()
}

export function exhibitionMonth(iso) {
  return parseExhibitionDate(iso).getMonth()
}
