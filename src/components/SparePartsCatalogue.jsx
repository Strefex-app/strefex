import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import ExecutiveLocationMap from './ExecutiveLocationMap'
import {
  buildSparePartsCatalogue,
  compareSparePartMakers,
  expoSellersForIndustry,
  mapLocationsForMakers,
  SPARE_PARTS_PRODUCT_CATEGORY_ID,
} from '../data/sparePartsCatalogue'
import { useAccountRegistry } from '../store/accountRegistry'
import useExhibitionStore from '../store/exhibitionStore'
import { COUNTRY_COORDINATES } from '../data/supplierDatabase'
import './SparePartsCatalogue.css'

const ROLE_LABEL = {
  oem: 'OEM',
  aftermarket: 'Parts maker',
  registered: 'Registered',
  expo: 'Expo',
}

function accountAsSeller(a) {
  const productCategoryIds = [
    ...(a.productCategoryIds || []),
    ...Object.values(a.productCategories || {}).flat(),
  ]
  const cats = a.categories && typeof a.categories === 'object' && !Array.isArray(a.categories)
    ? Object.values(a.categories).flat()
    : (a.categories || a.categoryIds || [])
  return {
    id: a.id,
    name: a.company || a.name,
    country: a.country,
    city: a.city,
    rating: a.rating,
    priceIndex: a.priceIndex,
    leadTimeDays: a.leadTimeDays,
    coordinates: a.coordinates,
    email: a.email,
    categories: cats,
    productCategoryIds,
    productCategories: a.productCategories,
    source: 'database',
  }
}

export default function SparePartsCatalogue({
  industryId,
  categoryId = null,
  equipmentId = null,
  extraSellers = [],
  equipmentBasePath = '',
  compact = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const accounts = useAccountRegistry((s) => s.accounts)
  const registerAccount = useAccountRegistry((s) => s.registerAccount)
  const exhibitions = useExhibitionStore((s) => s.exhibitions)

  const registrySellers = useMemo(
    () =>
      (accounts || [])
        .filter((a) => String(a.accountType || '').toLowerCase() === 'seller')
        .filter((a) => !industryId || (a.industries || []).includes(industryId) || !(a.industries || []).length)
        .map(accountAsSeller),
    [accounts, industryId],
  )

  const mergedExtras = useMemo(
    () => [...extraSellers, ...registrySellers],
    [extraSellers, registrySellers],
  )

  const catalogue = useMemo(
    () => buildSparePartsCatalogue({
      industryId,
      categoryId,
      equipmentId,
      extraSellers: mergedExtras,
    }),
    [industryId, categoryId, equipmentId, mergedExtras],
  )

  const expoPool = useMemo(
    () => expoSellersForIndustry(industryId, exhibitions),
    [industryId, exhibitions],
  )

  const [eqFilter, setEqFilter] = useState(equipmentId || '')
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [compareIds, setCompareIds] = useState([])
  const [expoIds, setExpoIds] = useState([])
  const [mapPinId, setMapPinId] = useState(null)
  const [reg, setReg] = useState({ company: '', email: '', country: 'DE', city: '', priceIndex: 100 })
  const [regNote, setRegNote] = useState('')

  const products = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return catalogue.products.filter((p) => {
      if (eqFilter && p.equipmentId !== eqFilter) return false
      if (!needle) return true
      const hay = `${p.name} ${p.sku} ${p.equipmentName} ${p.makers.map((m) => m.name).join(' ')}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [catalogue.products, eqFilter, q])

  const selected = products.find((p) => p.id === selectedId) || null

  const selectedMakers = useMemo(() => {
    if (!selected) return []
    const extraExpo = expoPool.filter((e) => expoIds.includes(e.id))
    return compareSparePartMakers([...selected.makers, ...extraExpo])
  }, [selected, expoPool, expoIds])

  const mapLocations = useMemo(() => mapLocationsForMakers(selectedMakers), [selectedMakers])

  const compareRows = useMemo(
    () => selectedMakers.filter((m) => compareIds.includes(m.id)),
    [selectedMakers, compareIds],
  )

  if (!catalogue.equipmentCount) return null

  const goEquipment = (id) => {
    if (!equipmentBasePath || !id) return
    const item = catalogue.equipment.find((e) => e.id === id)
    if (!item) return
    navigate(`${equipmentBasePath}/${item.categoryId}/${item.id}/suppliers`)
  }

  const pickPart = (p) => {
    setSelectedId(p.id)
    setCompareIds(p.makers.map((m) => m.id))
    setMapPinId(null)
  }

  const toggleCompare = (id) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const addExpo = (seller) => {
    setExpoIds((prev) => (prev.includes(seller.id) ? prev : [...prev, seller.id]))
    setCompareIds((prev) => (prev.includes(seller.id) ? prev : [...prev, seller.id]))
    if (!selected && products[0]) setSelectedId(products[0].id)
  }

  const registerHref = `/add-supplier?industry=${encodeURIComponent(industryId || '')}&industryLabel=${encodeURIComponent(industryId || '')}&context=spares&productCategory=${encodeURIComponent(SPARE_PARTS_PRODUCT_CATEGORY_ID)}${selected ? `&sku=${encodeURIComponent(selected.sku)}` : ''}&returnTo=${encodeURIComponent(location.pathname)}`

  const submitRegister = (e) => {
    e.preventDefault()
    const company = reg.company.trim()
    const email = (reg.email || `${company.replace(/\s+/g, '.').toLowerCase()}@spares.local`).trim().toLowerCase()
    if (!company) return
    const cc = String(reg.country || 'DE').toUpperCase()
    registerAccount({
      id: `spare-${Date.now()}`,
      company,
      email,
      accountType: 'seller',
      status: 'active',
      plan: 'start',
      industries: industryId ? [industryId] : [],
      categories: categoryId && industryId ? { [industryId]: [categoryId] } : {},
      productCategories: industryId ? { [industryId]: [SPARE_PARTS_PRODUCT_CATEGORY_ID] } : {},
      country: cc,
      city: reg.city.trim(),
      priceIndex: Number(reg.priceIndex) || 100,
      rating: 0,
      leadTimeDays: 16,
      coordinates: COUNTRY_COORDINATES[cc]?.coordinates || null,
    })
    setRegNote(`${company} is registered on this spare-parts list and will pin on the map.`)
    setReg({ company: '', email: '', country: cc, city: '', priceIndex: 100 })
  }

  return (
    <section className={`spc ${compact ? 'spc--compact' : ''}`}>
      <div className="spc-head">
        <div className="spc-head__copy">
          <h2 className="app-page-title">Spare parts catalogue</h2>
          <p className="app-page-subtitle">
            Choose a part to pin its makers on the map. Register a seller here, or pull an exhibitor from expo into the same priced comparison.
          </p>
        </div>
        <div className="stx-indicator-strip spc-kpis">
          <div className="spc-kpi">
            <span className="spc-kpi__n">{catalogue.productCount}</span>
            <span className="spc-kpi__l">Part numbers</span>
          </div>
          <div className="spc-kpi">
            <span className="spc-kpi__n">{catalogue.makerCount}</span>
            <span className="spc-kpi__l">Makers</span>
          </div>
          <div className="spc-kpi">
            <span className="spc-kpi__n">{expoPool.length}</span>
            <span className="spc-kpi__l">Expo booths</span>
          </div>
        </div>
      </div>

      <div className="spc-tools">
        <input
          className="spc-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SKU, part, equipment, or maker"
          aria-label="Search spare parts catalogue"
        />
        <div className="spc-chips">
          <button type="button" className={`spc-chip${eqFilter === '' ? ' is-on' : ''}`} onClick={() => setEqFilter('')}>
            All equipment
          </button>
          {catalogue.equipment.map((eq) => (
            <button
              key={eq.id}
              type="button"
              className={`spc-chip${eqFilter === eq.id ? ' is-on' : ''}`}
              onClick={() => setEqFilter(eq.id === eqFilter ? '' : eq.id)}
            >
              {eq.name}
            </button>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <p className="app-page-body">No spare parts match this filter.</p>
      ) : (
        <div className="spc-grid">
          {products.map((p) => (
            <article
              key={p.id}
              className={`spc-card${selectedId === p.id ? ' is-selected' : ''}`}
            >
              <div className="spc-card__top">
                <div>
                  <div className="spc-sku">{p.sku}</div>
                  <h3 className="spc-name stx-text-wrap">{p.name}</h3>
                  <p className="spc-meta stx-text-wrap">
                    {p.categoryName} · {p.equipmentName}
                    {p.typicalLife ? ` · life ${p.typicalLife}` : ''}
                  </p>
                </div>
                <div className="spc-card__actions">
                  <button type="button" className="spc-link" onClick={() => pickPart(p)}>
                    {selectedId === p.id ? 'Selected' : 'Map & compare'}
                  </button>
                  {equipmentBasePath ? (
                    <button type="button" className="spc-link" onClick={() => goEquipment(p.equipmentId)}>
                      Equipment
                    </button>
                  ) : null}
                </div>
              </div>
              <table className="spc-table">
                <thead>
                  <tr>
                    <th>Seller</th>
                    <th>Role</th>
                    <th>Origin</th>
                    <th>Price idx</th>
                  </tr>
                </thead>
                <tbody>
                  {compareSparePartMakers(p.makers).slice(0, 4).map((m) => (
                    <tr key={`${p.id}-${m.id || m.name}`}>
                      <td className="stx-text-wrap">{m.name}</td>
                      <td>
                        <span className={`spc-role spc-role--${m.role}`}>{ROLE_LABEL[m.role] || m.role}</span>
                      </td>
                      <td>{m.country}</td>
                      <td>{m.priceIndex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div className="spc-detail">
          <h3 className="spc-detail__title stx-text-wrap">
            {selected.sku} · {selected.name}
          </h3>
          <p className="app-page-body">
            Pins are sellers who make this part. Tick rows to compare price index (100 = market). Expo booths can be added below.
          </p>
          <ExecutiveLocationMap
            title="Sellers for this spare part"
            disclaimer="Pins use country or city centroids until a street plant is verified."
            locations={mapLocations}
            selectedId={mapPinId}
            onMarkerClick={(loc) => setMapPinId(loc?.id || null)}
            legendMode="none"
            legendItems={[
              { key: 'oem', label: 'OEM', color: '#2e7d32' },
              { key: 'aftermarket', label: 'Parts maker', color: '#e65100' },
              { key: 'registered', label: 'Registered', color: '#1565c0' },
              { key: 'expo', label: 'Expo', color: '#6a1b9a' },
            ]}
            showLane={false}
            className="spc-map"
          />

          <div className="spc-detail__grid">
            <div>
              <h3 className="spc-detail__h">Seller list</h3>
              <div className="stx-fluid-table-wrap">
                <table className="spc-table spc-table--wide">
                  <thead>
                    <tr>
                      <th>Compare</th>
                      <th>Seller</th>
                      <th>Role</th>
                      <th>Origin</th>
                      <th>Lead</th>
                      <th>Price idx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMakers.map((m) => (
                      <tr key={m.id} className={mapPinId === m.id ? 'is-pin' : ''}>
                        <td>
                          <input
                            type="checkbox"
                            checked={compareIds.includes(m.id)}
                            onChange={() => toggleCompare(m.id)}
                            aria-label={`Compare ${m.name}`}
                          />
                        </td>
                        <td>
                          <button type="button" className="spc-name-btn stx-text-wrap" onClick={() => setMapPinId(m.id)}>
                            {m.name}
                          </button>
                          {m.expoName ? <div className="spc-meta">{m.expoName}</div> : null}
                        </td>
                        <td>
                          <span className={`spc-role spc-role--${m.role}`}>{ROLE_LABEL[m.role] || m.role}</span>
                        </td>
                        <td>{[m.city, m.country].filter(Boolean).join(', ')}</td>
                        <td>{m.leadTimeDays ? `${m.leadTimeDays}d` : '—'}</td>
                        <td>
                          <span
                            className="spc-price"
                            data-tier={m.priceIndex <= 100 ? 'good' : m.priceIndex <= 110 ? 'mid' : 'high'}
                          >
                            {m.priceIndex}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="spc-detail__h">Price compare</h3>
              {compareRows.length === 0 ? (
                <p className="app-page-body">Tick sellers in the list to compare price index side by side.</p>
              ) : (
                <table className="spc-table">
                  <thead>
                    <tr>
                      <th>Seller</th>
                      <th>Role</th>
                      <th>Price idx</th>
                      <th>vs market</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareSparePartMakers(compareRows).map((m) => (
                      <tr key={`cmp-${m.id}`}>
                        <td className="stx-text-wrap">{m.name}</td>
                        <td>{ROLE_LABEL[m.role] || m.role}</td>
                        <td>{m.priceIndex}</td>
                        <td>{m.priceIndex === 100 ? 'par' : m.priceIndex < 100 ? `${100 - m.priceIndex}% below` : `${m.priceIndex - 100}% above`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="spc-detail__grid">
            <form className="spc-reg" onSubmit={submitRegister}>
              <h3 className="spc-detail__h">Register a seller on this part</h3>
              <p className="app-page-body">They appear in the list and on the map once country (and optional city) is set.</p>
              <label className="spc-label">
                Company
                <input value={reg.company} onChange={(e) => setReg((p) => ({ ...p, company: e.target.value }))} required />
              </label>
              <label className="spc-label">
                Email
                <input type="email" value={reg.email} onChange={(e) => setReg((p) => ({ ...p, email: e.target.value }))} placeholder="optional" />
              </label>
              <div className="spc-reg__row">
                <label className="spc-label">
                  Country code
                  <input value={reg.country} onChange={(e) => setReg((p) => ({ ...p, country: e.target.value }))} maxLength={3} />
                </label>
                <label className="spc-label">
                  City
                  <input value={reg.city} onChange={(e) => setReg((p) => ({ ...p, city: e.target.value }))} />
                </label>
                <label className="spc-label">
                  Price idx
                  <input
                    type="number"
                    min="70"
                    max="160"
                    value={reg.priceIndex}
                    onChange={(e) => setReg((p) => ({ ...p, priceIndex: e.target.value }))}
                  />
                </label>
              </div>
              <div className="spc-reg__actions">
                <button type="submit" className="spc-btn">Register on this list</button>
                <button type="button" className="spc-link" onClick={() => navigate(registerHref)}>
                  Full supplier form
                </button>
              </div>
              {regNote ? <p className="spc-note">{regNote}</p> : null}
            </form>

            <div className="spc-expo">
              <h3 className="spc-detail__h">Expo exhibitors</h3>
              <p className="app-page-body">Add a spare-parts booth from the exhibition calendar into this comparison.</p>
              <ul className="spc-expo__list">
                {expoPool.slice(0, 8).map((e) => (
                  <li key={e.id}>
                    <div className="spc-expo__copy">
                      <div className="spc-expo__name stx-text-wrap">{e.name}</div>
                      <div className="spc-meta">{[e.city, e.country].filter(Boolean).join(' · ')} · idx {e.priceIndex}</div>
                    </div>
                    <button type="button" className="spc-link" onClick={() => addExpo(e)}>
                      {expoIds.includes(e.id) ? 'In compare' : 'Add to compare'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p className="app-page-body" style={{ marginTop: 16 }}>Select a spare part to show sellers on the map and open priced compare.</p>
      )}
    </section>
  )
}
