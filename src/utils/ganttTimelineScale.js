const MS_PER_DAY = 24 * 60 * 60 * 1000

export const GANTT_SCALES = {
  day: { id: 'day', label: 'Days', pxPerDay: 28, snapDays: 1, padBefore: 5, padAfter: 14 },
  week: { id: 'week', label: 'Weeks', pxPerDay: 9, snapDays: 7, padBefore: 14, padAfter: 42 },
  month: { id: 'month', label: 'Months', pxPerDay: 2.4, snapDays: 7, padBefore: 45, padAfter: 120 },
  year: { id: 'year', label: 'Years', pxPerDay: 0.38, snapDays: 30, padBefore: 180, padAfter: 540 },
}

export function getGanttScale(scaleId) {
  return GANTT_SCALES[scaleId] || GANTT_SCALES.week
}

function parseDate(str) {
  return new Date(`${str}T12:00:00`)
}

function toIso(d) {
  return d.toISOString().slice(0, 10)
}

function addDaysDate(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function startOfWeek(d) {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(12, 0, 0, 0)
  return x
}

/** ISO-8601 calendar week (Mon–Sun); week 1 contains the year's first Thursday. */
function getISOWeekInfo(d) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const isoYear = target.getFullYear()
  const jan4 = new Date(isoYear, 0, 4, 12, 0, 0, 0)
  const jan4Day = (jan4.getDay() + 6) % 7
  jan4.setDate(jan4.getDate() - jan4Day + 3)
  const week = 1 + Math.round((target.getTime() - jan4.getTime()) / MS_PER_DAY / 7)
  return { week, isoYear }
}

function formatISOWeekLabel(week) {
  return `CW${String(week).padStart(2, '0')}`
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0, 0)
}

function startOfYear(d) {
  return new Date(d.getFullYear(), 0, 1, 12, 0, 0, 0)
}

function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate()
}

function fmtMonthShort(d) {
  return d.toLocaleString('en', { month: 'short' })
}

function fmtMonthYear(d) {
  return d.toLocaleString('en', { month: 'short', year: 'numeric' })
}

/** Padded timeline bounds from task dates. */
export function buildDateRange(allTasksFlat, scaleId) {
  const scale = getGanttScale(scaleId)
  let min = null
  let max = null
  allTasksFlat.forEach((t) => {
    ;[t.startDate, t.endDate, t.baselineStart, t.baselineEnd].filter(Boolean).forEach((d) => {
      if (!min || d < min) min = d
      if (!max || d > max) max = d
    })
  })
  if (!min) min = toIso(new Date())
  if (!max) max = min
  const s = addDaysDate(parseDate(min), -scale.padBefore)
  const e = addDaysDate(parseDate(max), scale.padAfter)
  return { min: toIso(s), max: toIso(e), minMs: s.getTime(), maxMs: e.getTime() }
}

export function dateToPx(dateStr, minMs, pxPerDay) {
  if (!dateStr) return 0
  return ((parseDate(dateStr).getTime() - minMs) / MS_PER_DAY) * pxPerDay
}

export function pxToDate(px, minMs, pxPerDay) {
  const ms = minMs + (px / pxPerDay) * MS_PER_DAY
  return toIso(new Date(ms))
}

export function pxDeltaToDays(dx, pxPerDay, snapDays) {
  const raw = Math.round(dx / pxPerDay)
  if (!snapDays || snapDays <= 1) return raw
  return Math.round(raw / snapDays) * snapDays
}

export function timelineWidthPx(minMs, maxMs, pxPerDay) {
  return Math.max(((maxMs - minMs) / MS_PER_DAY) * pxPerDay, pxPerDay * 7)
}

function buildDayGrid(min, max, pxPerDay) {
  const cols = []
  for (let d = parseDate(min); d <= parseDate(max); d = addDaysDate(d, 1)) {
    cols.push({
      left: dateToPx(toIso(d), parseDate(min).getTime(), pxPerDay),
      width: pxPerDay,
      label: String(d.getDate()),
      sub: null,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isToday: toIso(d) === toIso(new Date()),
      key: toIso(d),
    })
  }
  return cols
}

function buildWeekGrid(min, max, pxPerDay) {
  const cols = []
  const minMs = parseDate(min).getTime()
  let d = startOfWeek(parseDate(min))
  const end = parseDate(max)
  while (d <= end) {
    const weekEnd = addDaysDate(d, 6)
    const width = pxPerDay * 7
    const { week, isoYear } = getISOWeekInfo(d)
    cols.push({
      left: dateToPx(toIso(d), minMs, pxPerDay),
      width,
      label: formatISOWeekLabel(week),
      sub: `${d.getDate()} ${fmtMonthShort(d)}`,
      isoYear,
      isoWeek: week,
      isWeekend: false,
      isToday: toIso(new Date()) >= toIso(d) && toIso(new Date()) <= toIso(weekEnd),
      key: `w-${toIso(d)}`,
    })
    d = addDaysDate(d, 7)
  }
  return cols
}

function buildMonthGrid(min, max, pxPerDay) {
  const cols = []
  const minMs = parseDate(min).getTime()
  let d = startOfMonth(parseDate(min))
  const end = parseDate(max)
  while (d <= end) {
    const dim = daysInMonth(d.getFullYear(), d.getMonth())
    const width = dim * pxPerDay
    cols.push({
      left: dateToPx(toIso(d), minMs, pxPerDay),
      width,
      label: fmtMonthShort(d),
      sub: String(d.getFullYear()),
      isWeekend: false,
      isToday: new Date().getFullYear() === d.getFullYear() && new Date().getMonth() === d.getMonth(),
      key: `m-${d.getFullYear()}-${d.getMonth()}`,
    })
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12, 0, 0, 0)
  }
  return cols
}

function buildYearGrid(min, max, pxPerDay) {
  const cols = []
  const minMs = parseDate(min).getTime()
  let y = parseDate(min).getFullYear()
  const endY = parseDate(max).getFullYear()
  while (y <= endY) {
    const d = new Date(y, 0, 1, 12, 0, 0, 0)
    const dim = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 366 : 365
    cols.push({
      left: dateToPx(toIso(d), minMs, pxPerDay),
      width: dim * pxPerDay,
      label: String(y),
      sub: null,
      isWeekend: false,
      isToday: new Date().getFullYear() === y,
      key: `y-${y}`,
    })
    y += 1
  }
  return cols
}

export function buildGridColumns(scaleId, min, max, pxPerDay) {
  switch (scaleId) {
    case 'day':
      return buildDayGrid(min, max, pxPerDay)
    case 'week':
      return buildWeekGrid(min, max, pxPerDay)
    case 'month':
      return buildMonthGrid(min, max, pxPerDay)
    case 'year':
      return buildYearGrid(min, max, pxPerDay)
    default:
      return buildWeekGrid(min, max, pxPerDay)
  }
}

/** Top header tier (groups lower columns). */
export function buildHeaderGroups(scaleId, gridCols, minMs, pxPerDay) {
  if (!gridCols.length) return []
  if (scaleId === 'day') {
    const groups = []
    let cur = null
    gridCols.forEach((c) => {
      const d = parseDate(c.key)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (key !== cur) {
        groups.push({ label: fmtMonthYear(d), width: c.width, key })
        cur = key
      } else {
        groups[groups.length - 1].width += c.width
      }
    })
    return groups
  }
  if (scaleId === 'week') {
    const groups = []
    let cur = null
    gridCols.forEach((c) => {
      const yearKey = String(c.isoYear ?? parseDate(c.key.replace('w-', '')).getFullYear())
      const groupLabel = `${yearKey} · CW`
      if (yearKey !== cur) {
        groups.push({ label: groupLabel, width: c.width, key: yearKey })
        cur = yearKey
      } else {
        groups[groups.length - 1].width += c.width
      }
    })
    return groups
  }
  if (scaleId === 'month') {
    const groups = []
    let cur = null
    gridCols.forEach((c) => {
      const y = c.sub
      if (y !== cur) {
        groups.push({ label: y, width: c.width, key: y })
        cur = y
      } else {
        groups[groups.length - 1].width += c.width
      }
    })
    return groups
  }
  if (scaleId === 'year') {
    const groups = []
    let cur = null
    gridCols.forEach((c) => {
      const decade = `${Math.floor(Number(c.label) / 10) * 10}s`
      if (decade !== cur) {
        groups.push({ label: decade, width: c.width, key: decade })
        cur = decade
      } else {
        groups[groups.length - 1].width += c.width
      }
    })
    return groups
  }
  return []
}

/** Extend range forward until timeline pixel width fills at least minWidthPx. */
export function extendDateRangeToFillWidth(range, scaleId, pxPerDay, minWidthPx) {
  if (!minWidthPx || minWidthPx < 100) return range
  let { min, max, minMs, maxMs } = range
  let width = timelineWidthPx(minMs, maxMs, pxPerDay)
  if (width >= minWidthPx) return range

  let end = parseDate(max)
  let guard = 0
  while (width < minWidthPx && guard < 240) {
    guard += 1
    switch (scaleId) {
      case 'day':
        end = addDaysDate(end, 14)
        break
      case 'week':
        end = addDaysDate(end, 28)
        break
      case 'month': {
        const next = new Date(end.getFullYear(), end.getMonth() + 1, 1, 12, 0, 0, 0)
        end = addDaysDate(next, daysInMonth(next.getFullYear(), next.getMonth()) - 1)
        break
      }
      case 'year':
        end = new Date(end.getFullYear() + 1, 11, 31, 12, 0, 0, 0)
        break
      default:
        end = addDaysDate(end, 28)
    }
    maxMs = end.getTime()
    max = toIso(end)
    width = timelineWidthPx(minMs, maxMs, pxPerDay)
  }
  return { min, max, minMs, maxMs }
}

export function minBarWidthPx(pxPerDay, scaleId) {
  if (scaleId === 'year') return Math.max(6, pxPerDay * 14)
  if (scaleId === 'month') return Math.max(8, pxPerDay * 3)
  return Math.max(pxPerDay, 12)
}
