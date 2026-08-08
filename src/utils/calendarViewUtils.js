const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_MON = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function isoTodayLocal() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

export function padDateKey(y, m0, day) {
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function parseIsoDate(iso) {
  return new Date(`${iso}T12:00:00`)
}

export function addDaysIso(iso, days) {
  const d = parseIsoDate(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function addMonthsIso(iso, months) {
  const d = parseIsoDate(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** ISO week: Monday-based start date for the week containing iso. */
export function startOfWeekMonday(iso) {
  const d = parseIsoDate(iso)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export function weekDateKeys(iso) {
  const start = startOfWeekMonday(iso)
  return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i))
}

export function isoYear(iso) {
  return Number(iso.slice(0, 4))
}

export function isoMonth0(iso) {
  return Number(iso.slice(5, 7)) - 1
}

export function formatDayLong(iso) {
  try {
    return parseIsoDate(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatMonthYear(iso) {
  try {
    const d = parseIsoDate(iso)
    return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return iso
  }
}

export function formatWeekRange(iso) {
  const keys = weekDateKeys(iso)
  const start = parseIsoDate(keys[0])
  const end = parseIsoDate(keys[6])
  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()
  const startStr = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const endStr = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${startStr} – ${endStr}`
}

export function formatShortDate(iso) {
  try {
    return parseIsoDate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function formatWeekdayShort(iso) {
  try {
    return WEEKDAY_SHORT[parseIsoDate(iso).getDay()]
  } catch {
    return ''
  }
}

export { MONTH_NAMES, WEEKDAY_MON }
