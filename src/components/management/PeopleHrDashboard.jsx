import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import useHrSpaceStore from '../../store/hrSpaceStore'
import useSourcingPlantStore from '../../store/sourcingPlantStore'
import { useAuthStore } from '../../store/authStore'
import { useAccountRegistry } from '../../store/accountRegistry'
import { buildBuyerPlants } from '../../utils/intelligentSourcingData'
import { getApproximateLngLatOrFallback } from '../../utils/accountApproximateLocation'
import { buildPeopleHrDashboard } from '../../utils/peopleHrDashboard'
import { hrCanon } from '../../data/companyWorkflows'
import ExecutiveLocationMap from '../ExecutiveLocationMap'
import { SOURCING_MAP_COLORS } from '../WorldMap'
import './PeopleHrDashboard.css'

/** Catalog plants always available so the HR map can show every site, not only the selected receiving plant. */
const CATALOG_PLANTS = [
  { id: 'muc', name: 'Munich plant', city: 'Munich', country: 'Germany', lat: 48.14, lon: 11.58 },
  { id: 'det', name: 'Detroit plant', city: 'Detroit', country: 'United States', lat: 42.33, lon: -83.05 },
  { id: 'qro', name: 'Querétaro plant', city: 'Querétaro', country: 'Mexico', lat: 20.59, lon: -100.39 },
  { id: 'sha', name: 'Shanghai plant', city: 'Shanghai', country: 'China', lat: 31.23, lon: 121.47 },
  { id: 'hkg', name: 'Hong Kong plant', city: 'Hong Kong', country: 'Hong Kong', lat: 22.32, lon: 114.17 },
]

function Delta({ pct, direction }) {
  if (!direction) {
    return <span className="phd-delta phd-delta--flat">0% vs PY</span>
  }
  const sign = direction > 0 ? '+' : ''
  return (
    <span className={`phd-delta ${direction > 0 ? 'phd-delta--up' : 'phd-delta--down'}`}>
      {direction > 0 ? '▲' : '▼'}
      {' '}
      {sign}
      {pct}
      % vs PY
    </span>
  )
}

function hireYearsFromEmployees(employees = []) {
  const years = new Set()
  const current = new Date().getFullYear()
  years.add(current)
  years.add(current - 1)
  ;(Array.isArray(employees) ? employees : []).forEach((e) => {
    if (!e?.hireDate) return
    const d = new Date(e.hireDate)
    if (!Number.isNaN(d.getTime())) years.add(d.getFullYear())
  })
  return [...years].sort((a, b) => b - a)
}

function normalizePlace(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function plantMatchKey(city, country) {
  return `${normalizePlace(city)}|${normalizePlace(country)}`
}

export default function PeopleHrDashboard() {
  const employees = useHrSpaceStore((s) => s.employees)
  const departments = useHrSpaceStore((s) => s.departments)
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const accounts = useAccountRegistry((s) => s.accounts)
  const plant = useSourcingPlantStore((s) => s.plant)
  const [selectedLocId, setSelectedLocId] = useState(null)
  const yearOptions = useMemo(() => hireYearsFromEmployees(employees), [employees])
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  const chartYear = yearOptions.includes(selectedYear)
    ? selectedYear
    : (yearOptions[0] || new Date().getFullYear())

  const data = useMemo(
    () => buildPeopleHrDashboard(employees, departments, { year: chartYear }),
    [employees, departments, chartYear],
  )

  const welcomeName = user?.fullName || user?.name || user?.email || 'guest'
  const updatedLabel = data.updatedAt.toLocaleDateString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const myAccount = useMemo(() => {
    const email = String(user?.email || '').toLowerCase()
    if (!email) return null
    return accounts.find((a) => String(a.email || '').toLowerCase() === email) || null
  }, [accounts, user?.email])

  const companyPlants = useMemo(() => {
    const fromBuyer = buildBuyerPlants({ tenant, user, account: myAccount })
    const merged = new Map()
    CATALOG_PLANTS.forEach((p) => {
      merged.set(p.id, { ...p })
    })
    fromBuyer.forEach((p) => {
      merged.set(p.id || `buyer-${p.name}`, {
        id: p.id,
        name: p.name,
        city: p.city || String(p.name || '').replace(/\s*plant$/i, '').trim(),
        country: p.country || '',
        lat: p.lat,
        lon: p.lon,
      })
    })
    if (plant?.lat != null && plant?.lon != null) {
      merged.set(plant.id || 'selected', {
        id: plant.id || 'selected',
        name: plant.name || 'Company plant',
        city: plant.city || String(plant.name || '').replace(/\s*plant$/i, '').trim(),
        country: plant.country || '',
        lat: Number(plant.lat),
        lon: Number(plant.lon),
      })
    }
    return [...merged.values()].filter((p) => p.lat != null && p.lon != null)
  }, [tenant, user, myAccount, plant])

  /** Employees matched to plant sites; leftover cities become extra plant pins. */
  const plantHeadcountPins = useMemo(() => {
    const byPlantId = new Map(companyPlants.map((p) => [p.id, { ...p, count: 0 }]))
    const byPlace = new Map()
    companyPlants.forEach((p) => {
      byPlace.set(plantMatchKey(p.city, p.country), p.id)
      byPlace.set(plantMatchKey(p.city, ''), p.id)
      const cityFromName = String(p.name || '').replace(/\s*plant$/i, '').trim()
      if (cityFromName) byPlace.set(plantMatchKey(cityFromName, ''), p.id)
    })

    const orphanCities = new Map()

    data.byLocation.forEach((row) => {
      if (row.label === 'Unspecified' || (!row.city && !row.country)) return
      const matchId = byPlace.get(plantMatchKey(row.city, row.country))
        || byPlace.get(plantMatchKey(row.city, ''))
      if (matchId && byPlantId.has(matchId)) {
        byPlantId.get(matchId).count += row.count
        return
      }
      const orphanKey = plantMatchKey(row.city, row.country) || row.id
      orphanCities.set(orphanKey, {
        id: row.id,
        name: row.city ? `${row.city} plant` : `${row.country} plant`,
        city: row.city,
        country: row.country,
        count: row.count,
        coordinates: getApproximateLngLatOrFallback({
          country: row.country,
          city: row.city,
          seed: String(row.id),
        }),
      })
    })

    const pins = [
      ...[...byPlantId.values()].map((p) => ({
        id: `plant-${p.id}`,
        name: p.name,
        label: p.name,
        city: p.city || '—',
        country: p.country || '—',
        count: p.count,
        coordinates: [Number(p.lon), Number(p.lat)],
        marker: 'plant',
        tone: 'low',
      })),
      ...[...orphanCities.values()].map((p) => ({
        ...p,
        label: p.name,
        marker: 'plant',
        tone: 'low',
      })),
    ]

    return pins
  }, [companyPlants, data.byLocation])

  const plantLocationBars = data.byLocation
  const hq = plantLocationBars.find((r) => r.label !== 'Unspecified') || plantLocationBars[0]
  const workforcePath = hrCanon('workforce')
  const employeeCount = Array.isArray(employees) ? employees.length : 0

  return (
    <section className="phd" aria-label="People human resources dashboard">
      <header className="phd__header">
        <div className="phd__header-main">
          <h2 className="phd__title">Human resources dashboard</h2>
          <p className="phd__subtitle">
            Overview
            {' · '}
            <span className="phd__year">{data.year}</span>
            {' vs '}
            <span className="phd__year-prior">{data.priorYear}</span>
          </p>
          <p className="phd__source stx-text-wrap">
            Live from the
            {' '}
            <Link to={workforcePath}>employees database</Link>
            {' '}
            (HR Space)
            {' · '}
            n=
            {employeeCount}
            {hq ? ` · largest site ${hq.label}` : ''}
          </p>
        </div>
        <div className="phd__meta">
          <div>
            Welcome,
            {' '}
            {welcomeName}
          </div>
          <div>
            Last updated:
            {' '}
            {updatedLabel}
          </div>
        </div>
      </header>

      {!employeeCount ? (
        <p className="phd__empty stx-text-wrap">
          No employees in the database yet.
          {' '}
          <Link to={hrCanon('onboarding')}>Add employees in HR Space</Link>
          {' '}
          to populate this dashboard.
        </p>
      ) : null}

      <div className="phd__kpis">
        {data.kpis.map((kpi) => (
          <article key={kpi.id} className="phd__kpi">
            <div className="phd__kpi-label">{kpi.label}</div>
            <div className="phd__kpi-value">{kpi.value}</div>
            <Delta pct={kpi.pct} direction={kpi.direction} />
          </article>
        ))}
      </div>

      {/* Row 1 — department + plant locations map */}
      <div className="phd__row phd__row--geo">
        <article className="phd__panel phd__panel--dept">
          <h3 className="phd__panel-title">Employees by department</h3>
          <div className="phd__bars-h phd__bars-h--dept">
            {data.byDepartment.length === 0 ? (
              <p className="phd__panel-empty">No department data</p>
            ) : (
              data.byDepartment.map((row) => (
                <div key={row.label} className="phd__bar-h">
                  <span className="phd__bar-h-label stx-text-wrap">{row.label}</span>
                  <div className="phd__bar-h-track">
                    <span style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="phd__bar-h-n">{row.count}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <ExecutiveLocationMap
          className="phd__map-widget"
          title="Employee locations"
          disclaimer=""
          locations={plantHeadcountPins}
          plantLocation={null}
          selectedId={selectedLocId}
          onMarkerClick={(loc) => setSelectedLocId(loc?.id || null)}
          legendMode="plants"
          legendItems={[
            {
              key: 'plant',
              label: 'Plant location',
              color: SOURCING_MAP_COLORS.plant,
            },
          ]}
          showLane={false}
          mapFit="xMidYMid meet"
        />
      </div>

      {/* Row 2 — hiring · plant headcount · age · diversity */}
      <div className="phd__row phd__row--charts">
        <article className="phd__panel phd__panel--hiring">
          <div className="phd__panel-head">
            <h3 className="phd__panel-title phd__panel-title--inline">Hiring by month</h3>
            <div className="phd__year-btns" role="group" aria-label="Selected year for hiring chart">
              {yearOptions.slice(0, 4).map((y) => (
                <button
                  key={y}
                  type="button"
                  className={`phd__year-btn${y === chartYear ? ' is-active' : ''}`}
                  aria-pressed={y === chartYear}
                  onClick={() => setSelectedYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
          <div className="phd__bars-v" role="img" aria-label={`Hires by month for ${data.year}`}>
            {data.hiringByMonth.map((m, i) => (
              <div key={`${m.label}-${i}`} className="phd__bar-v">
                <div className="phd__bar-v-track">
                  <span className="phd__bar-v-prior" style={{ height: `${m.priorPct}%` }} />
                  <span className="phd__bar-v-cur" style={{ height: `${m.currentPct}%` }} />
                </div>
                <span className="phd__bar-v-label">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="phd__legend">
            <span><i className="phd__swatch phd__swatch--accent" /> {data.year} hires</span>
            <span><i className="phd__swatch phd__swatch--muted" /> {data.priorYear} hires</span>
          </div>
        </article>

        <article className="phd__panel phd__panel--locations">
          <h3 className="phd__panel-title">Employees by plant location</h3>
          <div className="phd__bars-h phd__bars-h--locations">
            {plantLocationBars.length === 0 ? (
              <p className="phd__panel-empty">No location data</p>
            ) : (
              plantLocationBars.map((row) => (
                <div key={row.id || row.label} className="phd__bar-h">
                  <span className="phd__bar-h-label stx-text-wrap">{row.label}</span>
                  <div className="phd__bar-h-track">
                    <span style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="phd__bar-h-n">{row.count}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="phd__panel">
          <h3 className="phd__panel-title">Employees by age group</h3>
          <div className="phd__bars-v phd__bars-v--age" role="img" aria-label="Employees by age group">
            {data.byAge.map((b) => (
              <div key={b.label} className="phd__bar-v">
                <div className="phd__bar-v-track">
                  <span className="phd__bar-v-prior" style={{ height: `${b.priorPct}%` }} />
                  <span className="phd__bar-v-cur" style={{ height: `${b.currentPct}%` }} />
                </div>
                <span className="phd__bar-v-label">{b.label}</span>
              </div>
            ))}
          </div>
          <div className="phd__legend">
            <span><i className="phd__swatch phd__swatch--accent" /> {data.year}</span>
            <span><i className="phd__swatch phd__swatch--muted" /> Prior</span>
          </div>
        </article>

        <article className="phd__panel">
          <h3 className="phd__panel-title">Diversity by gender and race</h3>
          <div className="phd__diversity">
            <div className="phd__div-head">
              <span />
              {data.genderKeys.map((g) => (
                <span key={g} className="phd__div-col">{g}</span>
              ))}
              <span className="phd__div-col">All</span>
            </div>
            {data.diversity.map((row) => (
              <div key={row.race} className="phd__div-row">
                <span className="phd__div-race stx-text-wrap">{row.race}</span>
                {data.genderKeys.map((g) => (
                  <span key={g} className="phd__div-cell">
                    {row[g] > 0 ? (
                      <i className="phd__div-block" style={{ opacity: Math.min(1, 0.35 + row[g] * 0.25) }} />
                    ) : (
                      <i className="phd__div-block phd__div-block--empty" />
                    )}
                    <em>{row[g] || '—'}</em>
                  </span>
                ))}
                <div className="phd__div-total">
                  <div className="phd__bar-h-track">
                    <span style={{ width: `${Math.round((row.total / data.diversityMax) * 100)}%` }} />
                  </div>
                  <em>{row.total}</em>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
