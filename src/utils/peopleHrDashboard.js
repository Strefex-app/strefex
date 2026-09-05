/**
 * Aggregate People / HR dashboard metrics from the live HR Space employees database
 * (`useHrSpaceStore.employees` — same records as Workforce / employee profiles).
 */

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const AGE_BANDS = [
  { id: '20-24', min: 20, max: 24 },
  { id: '25-29', min: 25, max: 29 },
  { id: '30-34', min: 30, max: 34 },
  { id: '35-39', min: 35, max: 39 },
  { id: '40-44', min: 40, max: 44 },
  { id: '45-49', min: 45, max: 49 },
  { id: '50-54', min: 50, max: 54 },
  { id: '55-59', min: 55, max: 59 },
]
const RACE_ORDER = [
  'White',
  'Two or More Races',
  'Black or African American',
  'Asian',
  'Hispanic or Latino',
  'American Indian or Alaska Native',
  'Native Hawaiian or Other Pacific Islander',
]
const GENDER_KEYS = ['M', 'F', 'N.C']

function parseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function yearsBetween(from, to = new Date()) {
  if (!from) return null
  const ms = to.getTime() - from.getTime()
  if (ms < 0) return 0
  return ms / (365.25 * 24 * 60 * 60 * 1000)
}

function formatYearsMonths(yearsFloat) {
  if (yearsFloat == null || Number.isNaN(yearsFloat)) return '—'
  const y = Math.floor(yearsFloat)
  const m = Math.round((yearsFloat - y) * 12)
  if (m === 12) return `${y + 1} y 0 m`
  return `${y} y ${m} m`
}

function ageFromBirthDate(birthDate, now = new Date()) {
  const d = parseDate(birthDate)
  if (!d) return null
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1
  return age
}

function isActive(emp) {
  const s = String(emp.status || 'active').toLowerCase()
  return s === 'active' || s === 'onboarding'
}

function hasLeft(emp) {
  const s = String(emp.status || '').toLowerCase()
  return s === 'left' || s === 'inactive' || s === 'terminated' || s === 'resigned' || Boolean(emp.leftDate)
}

function pctDelta(current, previous) {
  if (!previous) return { pct: 0, direction: 0 }
  const pct = ((current - previous) / previous) * 100
  return { pct: Math.round(pct * 100) / 100, direction: Math.sign(pct) }
}

/**
 * @param {object[]} employees
 * @param {object[]} departments
 * @param {{ year?: number }} [opts]
 */
export function buildPeopleHrDashboard(employees = [], departments = [], opts = {}) {
  const now = new Date()
  const year = opts.year || now.getFullYear()
  const priorYear = year - 1
  const list = Array.isArray(employees) ? employees : []

  const total = list.length
  const active = list.filter(isActive).length
  const left = list.filter(hasLeft).length
  const deptNames = new Set(
    (Array.isArray(departments) && departments.length
      ? departments.map((d) => d.name || d)
      : list.map((e) => e.department).filter(Boolean)
    ),
  )

  const ages = list.map((e) => ageFromBirthDate(e.birthDate, now)).filter((a) => a != null)
  const avgAge = ages.length ? ages.reduce((s, a) => s + a, 0) / ages.length : null

  const tenures = list
    .filter(isActive)
    .map((e) => yearsBetween(parseDate(e.hireDate), now))
    .filter((t) => t != null)
  const avgTenure = tenures.length ? tenures.reduce((s, t) => s + t, 0) / tenures.length : null

  /* Prior-year snapshot: employees hired before Jan 1 of current year (approx) */
  const priorCutoff = new Date(`${year}-01-01T00:00:00`)
  const priorList = list.filter((e) => {
    const hired = parseDate(e.hireDate)
    return hired && hired < priorCutoff
  })
  const priorActive = priorList.filter((e) => {
    if (!hasLeft(e)) return true
    const leftAt = parseDate(e.leftDate)
    return leftAt && leftAt >= priorCutoff
  }).length
  const priorLeft = list.filter((e) => {
    const leftAt = parseDate(e.leftDate)
    return leftAt && leftAt.getFullYear() === priorYear
  }).length
  const priorTenures = priorList
    .map((e) => yearsBetween(parseDate(e.hireDate), priorCutoff))
    .filter((t) => t != null)
  const priorAvgTenure = priorTenures.length
    ? priorTenures.reduce((s, t) => s + t, 0) / priorTenures.length
    : null
  const priorAges = priorList.map((e) => ageFromBirthDate(e.birthDate, priorCutoff)).filter((a) => a != null)
  const priorAvgAge = priorAges.length ? priorAges.reduce((s, a) => s + a, 0) / priorAges.length : null

  const kpis = [
    {
      id: 'total',
      label: 'Total employees',
      value: String(total),
      ...pctDelta(total, priorList.length || total),
    },
    {
      id: 'active',
      label: 'Active employees',
      value: String(active),
      ...pctDelta(active, priorActive || active),
    },
    {
      id: 'left',
      label: 'Employees left',
      value: String(left),
      ...pctDelta(left, priorLeft || left || 1),
    },
    {
      id: 'depts',
      label: 'Departments',
      value: String(deptNames.size),
      pct: 0,
      direction: 0,
    },
    {
      id: 'age',
      label: 'Average age',
      value: formatYearsMonths(avgAge),
      ...pctDelta(avgAge || 0, priorAvgAge || avgAge || 1),
    },
    {
      id: 'tenure',
      label: 'Average tenure',
      value: formatYearsMonths(avgTenure),
      ...pctDelta(avgTenure || 0, priorAvgTenure || avgTenure || 1),
    },
  ]

  const hiresThisYear = Array(12).fill(0)
  const hiresPriorYear = Array(12).fill(0)
  list.forEach((e) => {
    const hired = parseDate(e.hireDate)
    if (!hired) return
    if (hired.getFullYear() === year) hiresThisYear[hired.getMonth()] += 1
    if (hired.getFullYear() === priorYear) hiresPriorYear[hired.getMonth()] += 1
  })
  const hireMax = Math.max(1, ...hiresThisYear, ...hiresPriorYear)
  const hiringByMonth = MONTH_LABELS.map((label, i) => ({
    label,
    current: hiresThisYear[i],
    prior: hiresPriorYear[i],
    currentPct: Math.round((hiresThisYear[i] / hireMax) * 100),
    priorPct: Math.round((hiresPriorYear[i] / hireMax) * 100),
  }))

  const byDeptMap = new Map()
  list.filter(isActive).forEach((e) => {
    const key = e.department || 'Unassigned'
    byDeptMap.set(key, (byDeptMap.get(key) || 0) + 1)
  })
  const byDepartment = [...byDeptMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
  const deptMax = Math.max(1, ...byDepartment.map((d) => d.count))

  const byAge = AGE_BANDS.map((band) => {
    const current = ages.filter((a) => a >= band.min && a <= band.max).length
    const prior = priorAges.filter((a) => a >= band.min && a <= band.max).length
    return { label: band.id, current, prior }
  })
  const ageMax = Math.max(1, ...byAge.flatMap((b) => [b.current, b.prior]))

  /* Headcount per plant / work site (city · country); Unspecified when missing. */
  const byLocationMap = new Map()
  list.filter(isActive).forEach((e) => {
    const city = String(e.city || '').trim()
    const country = String(e.country || '').trim()
    const label = city || country || 'Unspecified'
    const key = city || country
      ? `${city.toLowerCase()}|${country.toLowerCase()}`
      : 'unspecified'
    const prev = byLocationMap.get(key)
    if (prev) {
      prev.count += 1
    } else {
      byLocationMap.set(key, {
        id: `plant-loc-${key}`,
        label,
        city,
        country,
        count: 1,
      })
    }
  })
  const byLocation = [...byLocationMap.values()].sort((a, b) => b.count - a.count)
  const locMax = Math.max(1, ...byLocation.map((d) => d.count))

  /* One map pin per plant location that has city/country (not Unspecified). */
  const mapLocations = byLocation
    .filter((row) => row.city || row.country)
    .map((row) => ({
      id: row.id,
      name: row.city ? `${row.city} plant` : `${row.country} plant`,
      city: row.city || '',
      country: row.country || '',
      count: row.count,
      department: '',
    }))

  const diversity = RACE_ORDER.map((race) => {
    const row = { race, M: 0, F: 0, 'N.C': 0, total: 0 }
    list.filter(isActive).forEach((e) => {
      if ((e.race || 'White') !== race) return
      const g = e.gender === 'M' || e.gender === 'F' ? e.gender : 'N.C'
      row[g] += 1
      row.total += 1
    })
    return row
  }).filter((r) => r.total > 0)
  const diversityMax = Math.max(1, ...diversity.map((r) => r.total))

  return {
    year,
    priorYear,
    updatedAt: now,
    kpis,
    hiringByMonth,
    hireMax,
    byDepartment: byDepartment.map((d) => ({ ...d, pct: Math.round((d.count / deptMax) * 100) })),
    byAge: byAge.map((b) => ({
      ...b,
      currentPct: Math.round((b.current / ageMax) * 100),
      priorPct: Math.round((b.prior / ageMax) * 100),
    })),
    byLocation: byLocation.map((d) => ({
      ...d,
      pct: Math.round((d.count / locMax) * 100),
    })),
    mapLocations,
    diversity,
    diversityMax,
    genderKeys: GENDER_KEYS,
    totals: { total, active, left, departments: deptNames.size },
  }
}
