import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import useRfqStore from '../store/rfqStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import { useAuthStore } from '../store/authStore'
import { useAccountRegistry } from '../store/accountRegistry'
import useSourcingPlantStore from '../store/sourcingPlantStore'
import { useSubscriptionStore } from '../services/featureFlags'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import ExecutiveLocationMap from '../components/ExecutiveLocationMap'
import { BUYER_WORKSPACE_PATH, buyerWorkspaceUrl } from '../constants/rfqPaths'
import { buildBuyerPlants } from '../utils/intelligentSourcingData'
import { getApproximateLngLatOrFallback } from '../utils/accountApproximateLocation'
import { mergeNetworkManufacturersWithAccounts } from '../utils/accountSourcingCompleteness'
import { fetchSourcingNetworkAccounts } from '../services/sourcingNetworkService'
import { saveReceivingPlantsToAccount } from '../utils/receivingPlantsPersist'
import { getSupplierLocations } from '../data/supplierDatabase'
import { useMarketplaceCatalogVisibilityEffective } from '../hooks/useMarketplaceCatalogVisibilityEffective'
import {
  hasBuyerSide,
  hasManufacturerSide,
  normalizeAccountTypes,
} from '../utils/networkRoles'
import {
  continentFromCountry,
  formatTransitLabel,
  transitDaysForMode,
} from '../utils/transitLeadTime'
import './Home.css'

const SIGNAL = {
  ok: 'var(--stx-signal-ok, #5FB85C)',
  okBg: 'var(--badge-success-bg, #EAF6E9)',
  okFg: 'var(--badge-success-text, #2F7A2C)',
  watch: 'var(--stx-signal-watch, #E0A23B)',
  critical: 'var(--stx-signal-critical, #D2483F)',
  data: 'var(--stx-signal-data, #3AA6C9)',
  dataBg: 'var(--accent-light, #E4F3F8)',
  dataFg: 'var(--accent-text, #155F76)',
  muted: 'var(--stx-ink-faint, #8B9298)',
  navy: 'var(--stx-navy-800, #0A2540)',
  steelBg: 'var(--stx-steel-200, #EEF0F2)',
}


/** KPI ↔ map relation colors (pins + dotted lanes). */
const MAP_FOCUS = {
  sent: {
    color: '#0A2540',
    ring: 'rgba(10,37,64,.22)',
    label: 'RFQs sent',
    relation: 'Invited on sent RFQ',
  },
  awaiting: {
    color: '#E0A23B',
    ring: 'rgba(224,162,59,.25)',
    label: 'Awaiting quotes',
    relation: 'Awaiting quote',
  },
  quotes: {
    color: '#5FB85C',
    ring: 'rgba(95,184,92,.25)',
    label: 'Quotes in',
    relation: 'Quote received',
  },
  incoming: {
    color: '#D2483F',
    ring: 'rgba(210,72,63,.25)',
    label: 'Incoming RFQs',
    relation: 'Pending invitation',
  },
  bids: {
    color: '#E0A23B',
    ring: 'rgba(224,162,59,.25)',
    label: 'Bids open',
    relation: 'Bid sent · awaiting award',
  },
}


const SRC = {
  own: { src: 'Your activity', srcFg: SIGNAL.navy, srcBg: SIGNAL.steelBg },
  live: { src: 'Live status', srcFg: SIGNAL.dataFg, srcBg: SIGNAL.dataBg },
  ops: { src: 'Operations', srcFg: SIGNAL.okFg, srcBg: SIGNAL.okBg },
}

function formatWhen(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(value)
  }
}

function statusTone(kind, status) {
  if (kind === 'outbound') {
    if (status === 'draft') return { label: 'Draft', color: SIGNAL.muted }
    if (status === 'quoted') return { label: 'Quotes in', color: SIGNAL.ok }
    if (status === 'sent' || status === 'active') return { label: 'Awaiting', color: SIGNAL.watch }
    return { label: String(status || 'Open'), color: SIGNAL.data }
  }
  if (status === 'pending') return { label: 'Respond', color: SIGNAL.critical }
  if (status === 'responded') return { label: 'Awaiting award', color: SIGNAL.watch }
  if (status === 'awarded') return { label: 'Awarded', color: SIGNAL.ok }
  if (status === 'declined') return { label: 'Declined', color: SIGNAL.muted }
  return { label: String(status || 'Open'), color: SIGNAL.data }
}

function KpiWidget({
  label, value, unit, delta, deltaColor, sub, accent, src, srcFg, srcBg, onClick, active,
}) {
  return (
    <button
      type="button"
      className={`home-w home-w--kpi${active ? ' home-w--kpi-active' : ''}`}
      style={{ borderLeftColor: accent }}
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
    >
      <div className="home-w__kpi-label">{label}</div>
      <div className="home-w__kpi-row">
        <span className="home-w__kpi-value">
          {value}
          {unit ? <span className="home-w__kpi-unit">{unit}</span> : null}
        </span>
        {delta ? (
          <span className="home-w__kpi-delta" style={{ color: deltaColor || SIGNAL.navy }}>
            {delta}
          </span>
        ) : null}
      </div>
      {sub ? <div className="home-w__kpi-sub">{sub}</div> : null}
      {src ? (
        <span className="home-w__chip" style={{ color: srcFg, background: srcBg }}>
          {src}
        </span>
      ) : null}
    </button>
  )
}

function Window({ title, ruleColor, meta, children, className = '', onClick }) {
  const Tag = onClick ? 'button' : 'section'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={`home-w home-w--window ${className}`.trim()}
      onClick={onClick}
    >
      {(title || meta != null) ? (
        <div className="home-w__head">
          {title ? (
            <div className="home-w__title" style={ruleColor ? { borderLeftColor: ruleColor } : undefined}>
              {title}
            </div>
          ) : <span />}
          {meta != null ? <span className="home-w__meta">{meta}</span> : null}
        </div>
      ) : null}
      {children}
    </Tag>
  )
}

function PulseStat({ label, value, tone, onClick }) {
  return (
    <button type="button" className="home-w home-w--pulse" onClick={onClick}>
      <span className="home-w__pulse-value stx-text-wrap" style={{ color: tone || SIGNAL.navy }}>
        {value}
      </span>
      <span className="home-w__pulse-label">{label}</span>
    </button>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const projects = useProjectStore((state) => state.projects)
  const accountType = useSubscriptionStore((s) => s.accountType)
  const rfqs = useRfqStore((s) => s.rfqs)
  const receivedRfqs = useRfqStore((s) => s.receivedRfqs)
  const requests = useServiceRequestStore((s) => s.requests)
  const role = useAuthStore((s) => s.role)
  const user = useAuthStore((s) => s.user)
  const tenant = useAuthStore((s) => s.tenant)
  const accounts = useAccountRegistry((s) => s.accounts)
  const ensureAllAccountsSourcingFields = useAccountRegistry((s) => s.ensureAllAccountsSourcingFields)
  const mergeNetworkAccounts = useAccountRegistry((s) => s.mergeNetworkAccounts)
  const updateAccount = useAccountRegistry((s) => s.updateAccount)
  const setTenant = useAuthStore((s) => s.setTenant)
  const plant = useSourcingPlantStore((s) => s.plant)
  const setPlant = useSourcingPlantStore((s) => s.setPlant)
  const showMarketplaceCatalog = useMarketplaceCatalogVisibilityEffective()
  const [selectedLocId, setSelectedLocId] = useState(null)
  const [plantsPanelOpen, setPlantsPanelOpen] = useState(false)
  const [mapFocus, setMapFocus] = useState(null)
  const [transportMode, setTransportMode] = useState('sea')
  const isSuperAdmin = role === 'superadmin'
  const accountTypes = normalizeAccountTypes({
    accountType,
    accountTypes: user?.accountTypes,
    isSuperAdmin,
  })

  useEffect(() => {
    ensureAllAccountsSourcingFields()
  }, [ensureAllAccountsSourcingFields])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const rows = await fetchSourcingNetworkAccounts({ limit: 800 })
      if (cancelled || !rows.length) return
      mergeNetworkAccounts(rows)
    })()
    return () => { cancelled = true }
  }, [mergeNetworkAccounts])

  const myAccount = useMemo(() => {
    const email = String(user?.email || '').toLowerCase()
    if (!email) return null
    return accounts.find((a) => String(a.email || '').toLowerCase() === email) || null
  }, [accounts, user?.email])

  const defaultPlants = useMemo(
    () => buildBuyerPlants({ tenant, user, account: myAccount }),
    [tenant, user, myAccount],
  )
  const [plantList, setPlantList] = useState(null)
  const plants = plantList || defaultPlants
  const plantsSaveTimer = useRef(null)

  const persistPlants = useCallback((list) => {
    void saveReceivingPlantsToAccount({
      plants: list,
      email: user?.email,
      companyId: tenant?.id,
      updateAccount,
      setTenant,
      tenant,
    })
  }, [setTenant, tenant, updateAccount, user?.email])

  const schedulePersistPlants = useCallback((list) => {
    clearTimeout(plantsSaveTimer.current)
    plantsSaveTimer.current = setTimeout(() => persistPlants(list), 500)
  }, [persistPlants])

  useEffect(() => {
    setPlantList(null)
  }, [defaultPlants])

  useEffect(() => {
    if (!plants.length) return
    const match = plant && plants.some((p) => p.id === plant.id)
    if (!match) setPlant(plants[0])
  }, [plants, plant, setPlant])

  const updatePlantField = (id, key, value) => {
    const parsed = key === 'lat' || key === 'lon' ? (parseFloat(value) || 0) : value
    setPlantList((prev) => {
      const base = prev || defaultPlants
      const next = base.map((p) => (p.id === id ? { ...p, [key]: parsed } : p))
      schedulePersistPlants(next)
      return next
    })
    if (plant?.id === id) {
      setPlant({ ...plant, [key]: parsed })
    }
  }

  const addPlant = () => {
    const id = `plant-${Date.now()}`
    const nextRow = {
      id,
      name: 'New plant',
      cc: 'DE',
      lat: 50,
      lon: 10,
      cont: 'EU',
    }
    setPlantList((prev) => {
      const next = [...(prev || defaultPlants), nextRow]
      schedulePersistPlants(next)
      return next
    })
  }

  const removePlant = (id) => {
    const base = plantList || defaultPlants
    const left = base.filter((p) => p.id !== id)
    if (!left.length) return
    setPlantList(left)
    schedulePersistPlants(left)
    if (plant?.id === id) setPlant(left[0])
  }

  const savePlantsAndClose = () => {
    persistPlants(plants)
    setPlantsPanelOpen(false)
  }

  const avatarInitials = useMemo(() => {
    const name = String(user?.fullName || user?.name || user?.email || 'U').trim()
    const parts = name.split(/[\s@._-]+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }, [user])

  const showManufacturer = hasManufacturerSide(accountTypes) || isSuperAdmin
  const showBuyer = hasBuyerSide(accountTypes) || isSuperAdmin
  const isServiceProvider = accountTypes.includes('service_provider')

  const receivedList = useMemo(
    () => useRfqStore.getState().getSafeReceivedRfqs(),
    [receivedRfqs],
  )

  const receivedRfqStats = useMemo(() => {
    const list = Array.isArray(receivedList) ? receivedList : []
    return {
      total: list.length,
      pending: list.filter((r) => r.status === 'pending').length,
      responded: list.filter((r) => r.status === 'responded').length,
      awarded: list.filter((r) => r.status === 'awarded').length,
      declined: list.filter((r) => r.status === 'declined').length,
    }
  }, [receivedList])

  const serviceRequestStats = useMemo(() => {
    const list = Array.isArray(requests) ? requests : []
    return {
      total: list.length,
      open: list.filter((r) => r.status === 'new' || r.status === 'assigned').length,
    }
  }, [requests])

  const sentRfqStats = useMemo(() => {
    const list = Array.isArray(rfqs) ? rfqs : []
    const drafts = list.filter((r) => r.status === 'draft')
    const sent = list.filter((r) => r.status === 'sent' || r.status === 'active')
    const withQuotes = sent.filter((r) => Number(r.responses || r.sellerResponses?.length || 0) > 0)
    const quoteCount = withQuotes.reduce(
      (acc, r) => acc + Number(r.responses || r.sellerResponses?.length || 0),
      0,
    )
    return {
      drafts: drafts.length,
      sent: sent.length,
      withQuotes: withQuotes.length,
      awaiting: Math.max(0, sent.length - withQuotes.length),
      quoteCount,
      responseRate: sent.length > 0 ? Math.round((withQuotes.length / sent.length) * 100) : 0,
    }
  }, [rfqs])

  const projectsTotal = projects?.length ?? 0
  const projectsInProgress = projects?.reduce((acc, p) => {
    const inProgress = (p.tasks || []).filter((task) => task.status === 'in-progress').length
    return acc + inProgress
  }, 0) ?? 0

  const networkLocations = useMemo(() => {
    const registrySellers = mergeNetworkManufacturersWithAccounts(accounts).filter((a) => {
      const types = new Set()
      const primary = String(a?.accountType || '').toLowerCase()
      if (primary) types.add(primary)
      ;(Array.isArray(a?.accountTypes) ? a.accountTypes : []).forEach((t) => {
        const id = String(t || '').toLowerCase()
        if (id) types.add(id)
      })
      return types.has('seller')
    })
    const fromRegistry = registrySellers.map((a) => {
      const coords = a.coordinates?.length === 2
        && !(Number(a.coordinates[0]) === 0 && Number(a.coordinates[1]) === 0)
        ? a.coordinates
        : getApproximateLngLatOrFallback({
          country: a.country,
          city: a.city,
          address: a.address,
          seed: String(a.id ?? a.company ?? a.email ?? ''),
        })
      return {
        id: a.id,
        name: a.company || a.companyName || a.name || a.contactName || 'Manufacturer',
        coordinates: coords,
        country: a.country || '—',
        city: a.city || '—',
        industries: Array.isArray(a.industries) ? a.industries : [],
        categories: a.categories && typeof a.categories === 'object' ? a.categories : {},
        rating: a.rating ?? 0,
        riskLevel: a.riskLevel ?? 50,
        fitLevel: a.fitLevel ?? 50,
        source: 'registered',
      }
    })
    const registryIds = new Set(fromRegistry.map((l) => l.id))
    const directory = showMarketplaceCatalog
      ? getSupplierLocations()
        .filter((l) => !registryIds.has(l.id))
        .slice(0, 80)
      : []
    return [...fromRegistry, ...directory]
  }, [accounts, showMarketplaceCatalog])

  const plantLocation = useMemo(() => {
    if (!plant || plant.lat == null || plant.lon == null) return null
    return {
      id: `plant-${plant.id || 'home'}`,
      name: plant.name || 'Receiving plant',
      coordinates: [Number(plant.lon), Number(plant.lat)],
      cont: plant.cont || continentFromCountry(plant.cc || plant.country),
    }
  }, [plant])

  const locationIndex = useMemo(() => {
    const byId = new Map()
    const byEmail = new Map()
    networkLocations.forEach((loc) => {
      if (loc.id != null) byId.set(String(loc.id), loc)
    })
    accounts.forEach((a) => {
      const email = String(a.email || '').toLowerCase()
      const loc = byId.get(String(a.id))
      if (email && loc) byEmail.set(email, loc)
    })
    return { byId, byEmail }
  }, [networkLocations, accounts])

  const resolveInviteeLocation = (supplier) => {
    if (supplier == null) return null
    if (typeof supplier === 'string') {
      if (supplier.startsWith('invite:') && supplier.includes('@')) {
        return locationIndex.byEmail.get(supplier.slice('invite:'.length).toLowerCase()) || null
      }
      return locationIndex.byId.get(String(supplier))
        || locationIndex.byEmail.get(String(supplier).toLowerCase())
        || null
    }
    if (supplier.id != null && locationIndex.byId.has(String(supplier.id))) {
      return locationIndex.byId.get(String(supplier.id))
    }
    const email = String(supplier.email || '').toLowerCase()
    if (email && locationIndex.byEmail.has(email)) return locationIndex.byEmail.get(email)
    return null
  }

  /** Supplier/buyer pins linked to RFQ KPI statuses. */
  const rfqMapRelations = useMemo(() => {
    const pinMap = new Map()

    const upsert = (loc, focusKey, meta = {}) => {
      if (!loc?.coordinates) return
      const id = String(loc.id)
      const prev = pinMap.get(id)
      const rank = { quotes: 4, awaiting: 3, bids: 3, incoming: 2, sent: 1 }
      const nextRank = rank[focusKey] || 0
      const prevRank = prev ? (rank[prev.focusKey] || 0) : 0
      if (prev && prevRank > nextRank) {
        pinMap.set(id, {
          ...prev,
          focusKeys: [...new Set([...(prev.focusKeys || []), focusKey])],
        })
        return
      }
      const style = MAP_FOCUS[focusKey]
      pinMap.set(id, {
        ...loc,
        id,
        focusKey,
        focusKeys: [...new Set([...(prev?.focusKeys || []), focusKey])],
        pinColor: style.color,
        pinRing: style.ring,
        tone: focusKey === 'quotes' ? 'low' : focusKey === 'incoming' ? 'high' : 'medium',
        relationLabel: style.relation,
        ...meta,
      })
    }

    const sentRfqs = (Array.isArray(rfqs) ? rfqs : []).filter(
      (r) => r && (r.status === 'sent' || r.status === 'active'),
    )
    sentRfqs.forEach((rfq) => {
      const responses = Array.isArray(rfq.sellerResponses) ? rfq.sellerResponses : []
      const respondedIds = new Set(
        responses.map((row) => String(row.sellerId || row.sellerEmail || '').toLowerCase()).filter(Boolean),
      )
      const respondedEmails = new Set(
        responses.map((row) => String(row.sellerEmail || '').toLowerCase()).filter(Boolean),
      )
      ;(Array.isArray(rfq.suppliers) ? rfq.suppliers : []).forEach((supplier) => {
        const loc = resolveInviteeLocation(supplier)
        if (!loc) return
        upsert(loc, 'sent', { rfqId: rfq.id })
        const sid = String(typeof supplier === 'string' ? supplier : supplier.id || '').toLowerCase()
        const email = typeof supplier === 'string' && supplier.startsWith('invite:')
          ? supplier.slice('invite:'.length).toLowerCase()
          : String(supplier?.email || '').toLowerCase()
        const quoted = respondedIds.has(sid)
          || respondedIds.has(String(loc.id).toLowerCase())
          || (email && respondedEmails.has(email))
        upsert(loc, quoted ? 'quotes' : 'awaiting', { rfqId: rfq.id })
      })
    })

    const inbound = Array.isArray(receivedList) ? receivedList : []
    inbound.forEach((row) => {
      if (!row) return
      const buyerEmail = String(row.buyerEmail || '').toLowerCase()
      let loc = buyerEmail ? locationIndex.byEmail.get(buyerEmail) : null
      if (!loc && row.buyerCompany) {
        loc = networkLocations.find(
          (l) => String(l.name || '').toLowerCase() === String(row.buyerCompany).toLowerCase(),
        ) || null
      }
      if (!loc && buyerEmail) {
        const acct = accounts.find((a) => String(a.email || '').toLowerCase() === buyerEmail)
        if (acct) {
          const coords = acct.coordinates?.length === 2
            ? acct.coordinates
            : getApproximateLngLatOrFallback({
              country: acct.country,
              city: acct.city,
              address: acct.address,
              seed: String(acct.id ?? acct.email ?? ''),
            })
          loc = {
            id: acct.id || `buyer-${buyerEmail}`,
            name: acct.company || row.buyerCompany || 'Buyer',
            coordinates: coords,
            country: acct.country || '—',
            city: acct.city || '—',
            source: 'buyer',
          }
        }
      }
      if (!loc) return
      if (row.status === 'pending') upsert(loc, 'incoming', { rfqId: row.rfqId || row.id })
      if (row.status === 'responded') upsert(loc, 'bids', { rfqId: row.rfqId || row.id })
    })

    return [...pinMap.values()]
  }, [rfqs, receivedList, locationIndex, networkLocations, accounts])

  const mapDisplayLocations = useMemo(() => {
    const plantCont = plantLocation?.cont || plant?.cont || continentFromCountry(plant?.cc)
    const plantCoords = plantLocation?.coordinates

    const applyTransit = (loc) => {
      const days = plantCoords
        ? transitDaysForMode(
          plantCoords,
          loc.coordinates,
          transportMode,
          plantCont,
          continentFromCountry(loc.country || loc.cc),
        )
        : null
      return {
        ...loc,
        transitDays: days,
        transitLabel: formatTransitLabel(days, transportMode),
      }
    }

    if (mapFocus && MAP_FOCUS[mapFocus]) {
      return rfqMapRelations
        .filter((loc) => (loc.focusKeys || [loc.focusKey]).includes(mapFocus))
        .map((loc) => {
          const style = MAP_FOCUS[mapFocus]
          return applyTransit({
            ...loc,
            focusKey: mapFocus,
            pinColor: style.color,
            pinRing: style.ring,
            relationLabel: style.relation,
          })
        })
    }

    if (rfqMapRelations.length) {
      return rfqMapRelations.map(applyTransit)
    }

    return networkLocations
  }, [
    mapFocus,
    rfqMapRelations,
    networkLocations,
    plantLocation,
    plant,
    transportMode,
  ])

  const mapLanes = useMemo(() => {
    const plantCoords = plantLocation?.coordinates
    if (!plantCoords || !mapFocus || !MAP_FOCUS[mapFocus]) return null
    const style = MAP_FOCUS[mapFocus]
    const plantCont = plantLocation?.cont || plant?.cont || continentFromCountry(plant?.cc)
    return mapDisplayLocations
      .filter((loc) => loc.coordinates)
      .slice(0, 40)
      .map((loc) => {
        const days = transitDaysForMode(
          plantCoords,
          loc.coordinates,
          transportMode,
          plantCont,
          continentFromCountry(loc.country || loc.cc),
        )
        return {
          id: `lane-${loc.id}`,
          from: plantCoords,
          to: loc.coordinates,
          toId: loc.id,
          color: style.color,
          label: formatTransitLabel(days, transportMode),
          emphasize: selectedLocId === loc.id,
        }
      })
  }, [
    plantLocation,
    plant,
    mapFocus,
    mapDisplayLocations,
    transportMode,
    selectedLocId,
  ])

  const mapLegendItems = useMemo(() => {
    if (!mapFocus && !rfqMapRelations.length) return null
    const keys = mapFocus
      ? [mapFocus]
      : [...new Set(rfqMapRelations.map((l) => l.focusKey).filter(Boolean))]
    return keys
      .filter((k) => MAP_FOCUS[k])
      .map((k) => ({
        key: k,
        label: MAP_FOCUS[k].label,
        color: MAP_FOCUS[k].color,
      }))
  }, [mapFocus, rfqMapRelations])

  const handleKpiMapFocus = (key, path) => {
    if (!MAP_FOCUS[key]) {
      navigate(path)
      return
    }
    if (mapFocus === key) {
      navigate(path)
      return
    }
    setMapFocus(key)
    setSelectedLocId(null)
  }

  const regionMix = useMemo(() => {
    const counts = new Map()
    networkLocations.forEach((loc) => {
      const key = loc.country && loc.country !== '—' ? loc.country : 'Other'
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    const total = networkLocations.length || 1
    return [...counts.entries()]
      .map(([label, count]) => ({
        label,
        count,
        pct: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [networkLocations])

  const kpis = useMemo(() => {
    const cells = []
    if (showBuyer) {
      cells.push(
        {
          key: 'sent',
          label: 'RFQs sent',
          value: String(sentRfqStats.sent),
          delta: sentRfqStats.sent ? 'live' : '—',
          deltaColor: SIGNAL.navy,
          sub: sentRfqStats.sent ? 'Track & compare on this list' : 'Create an RFQ in Sourcing',
          accent: SIGNAL.navy,
          ...SRC.own,
          path: buyerWorkspaceUrl({ tab: 'track' }),
          mapKey: 'sent',
        },
        {
          key: 'awaiting',
          label: 'Awaiting quotes',
          value: String(sentRfqStats.awaiting),
          delta: sentRfqStats.awaiting ? '▲ watch' : '—',
          deltaColor: sentRfqStats.awaiting ? SIGNAL.watch : SIGNAL.muted,
          sub: 'Open outbound still waiting',
          accent: sentRfqStats.awaiting ? SIGNAL.watch : SIGNAL.ok,
          ...SRC.live,
          path: buyerWorkspaceUrl({ tab: 'track' }),
          mapKey: 'awaiting',
        },
        {
          key: 'quotes',
          label: 'Quotes in',
          value: String(sentRfqStats.quoteCount),
          delta: `${sentRfqStats.responseRate}%`,
          deltaColor: SIGNAL.ok,
          sub: `${sentRfqStats.withQuotes} RFQs with replies`,
          accent: SIGNAL.ok,
          ...SRC.ops,
          path: buyerWorkspaceUrl({ tab: 'track' }),
          mapKey: 'quotes',
        },
      )
    }
    if (showManufacturer) {
      cells.push(
        {
          key: 'incoming',
          label: 'Incoming RFQs',
          value: String(receivedRfqStats.pending),
          delta: receivedRfqStats.pending ? '▲ act' : '—',
          deltaColor: receivedRfqStats.pending ? SIGNAL.critical : SIGNAL.muted,
          sub: `${receivedRfqStats.total} invitations total`,
          accent: receivedRfqStats.pending ? SIGNAL.critical : SIGNAL.navy,
          ...SRC.live,
          path: '/dashboard/supplier',
          mapKey: 'incoming',
        },
        {
          key: 'bids',
          label: 'Bids open',
          value: String(receivedRfqStats.responded),
          delta: receivedRfqStats.responded ? 'live' : '—',
          deltaColor: SIGNAL.watch,
          sub: 'Awaiting award decision',
          accent: SIGNAL.watch,
          ...SRC.own,
          path: '/dashboard/supplier',
          mapKey: 'bids',
        },
        {
          key: 'awarded',
          label: 'Awarded',
          value: String(receivedRfqStats.awarded),
          delta: receivedRfqStats.declined ? `${receivedRfqStats.declined} closed` : '—',
          deltaColor: SIGNAL.ok,
          sub: 'Won invitations',
          accent: SIGNAL.ok,
          ...SRC.ops,
          path: '/dashboard/supplier',
        },
      )
    }
    if (isServiceProvider) {
      cells.push({
        key: 'svc',
        label: 'Service requests',
        value: String(serviceRequestStats.open),
        delta: serviceRequestStats.open ? 'open' : '—',
        deltaColor: SIGNAL.critical,
        sub: `${serviceRequestStats.total} total`,
        accent: SIGNAL.critical,
        ...SRC.live,
        path: '/service-requests',
      })
    }
    if (!showBuyer && !showManufacturer && !isServiceProvider) {
      cells.push({
        key: 'network',
        label: 'Network plants',
        value: String(networkLocations.length),
        delta: plantLocation ? 'mapped' : '—',
        deltaColor: SIGNAL.data,
        sub: 'Pins on the map below',
        accent: SIGNAL.data,
        ...SRC.ops,
        path: BUYER_WORKSPACE_PATH,
      })
    }
    return cells.slice(0, 5)
  }, [
    showBuyer,
    showManufacturer,
    isServiceProvider,
    sentRfqStats,
    receivedRfqStats,
    serviceRequestStats,
    networkLocations.length,
    plantLocation,
  ])

  /** Side column beside the map — must not repeat top KPI labels/values. */
  const mapSideStats = useMemo(() => {
    const countries = new Set(
      networkLocations
        .map((l) => (l.country && l.country !== '—' ? l.country : null))
        .filter(Boolean),
    ).size
    const plantName = plant?.name
      ? String(plant.name).replace(/\s+plant$/i, '')
      : null
    const items = [
      {
        key: 'countries',
        label: 'Countries',
        value: countries,
        tone: SIGNAL.data,
        onClick: () => navigate(BUYER_WORKSPACE_PATH),
      },
      {
        key: 'plant',
        label: 'Receiving plant',
        value: plantName || '—',
        tone: SIGNAL.navy,
        onClick: () => navigate('/profile'),
      },
    ]
    if (showBuyer) {
      items.push(
        {
          key: 'drafts',
          label: 'Draft RFQs',
          value: sentRfqStats.drafts,
          tone: SIGNAL.muted,
          onClick: () => navigate(BUYER_WORKSPACE_PATH),
        },
        {
          key: 'rate',
          label: 'Response rate',
          value: `${sentRfqStats.responseRate}%`,
          tone: SIGNAL.ok,
          onClick: () => navigate(buyerWorkspaceUrl({ tab: 'track' })),
        },
      )
    } else if (showManufacturer) {
      items.push(
        {
          key: 'closed',
          label: 'Closed',
          value: receivedRfqStats.declined,
          tone: SIGNAL.muted,
          onClick: () => navigate('/dashboard/supplier'),
        },
        {
          key: 'projects',
          label: 'Projects active',
          value: projectsInProgress,
          tone: SIGNAL.watch,
          onClick: () => navigate('/management/ops/projects'),
        },
      )
    } else {
      items.push(
        {
          key: 'pins',
          label: 'Map pins',
          value: networkLocations.length,
          tone: SIGNAL.data,
          onClick: () => navigate(BUYER_WORKSPACE_PATH),
        },
        {
          key: 'projects',
          label: 'Projects active',
          value: projectsInProgress,
          tone: SIGNAL.watch,
          onClick: () => navigate('/management/ops/projects'),
        },
      )
    }
    return items.slice(0, 4)
  }, [
    networkLocations,
    plant,
    showBuyer,
    showManufacturer,
    sentRfqStats.drafts,
    sentRfqStats.responseRate,
    receivedRfqStats.declined,
    projectsInProgress,
    navigate,
  ])

  /**
   * Pipeline = status funnel as the same KPI widgets as the top row.
   * Counts map to rfqStore statuses:
   *   Buyer: draft | sent/active | sent without replies | sent with replies
   *   Plant: pending | responded | awarded | declined
   */
  const pipeline = useMemo(() => {
    const track = buyerWorkspaceUrl({ tab: 'track' })
    const inbox = '/dashboard/supplier'
    if (showBuyer && !showManufacturer) {
      return [
        {
          key: 'pipe-draft',
          label: 'Draft',
          value: String(sentRfqStats.drafts),
          delta: sentRfqStats.drafts ? 'status' : '—',
          deltaColor: SIGNAL.muted,
          sub: 'Not sent yet · draft',
          accent: SIGNAL.muted,
          ...SRC.own,
          path: BUYER_WORKSPACE_PATH,
        },
        {
          key: 'pipe-sent',
          label: 'RFQs sent',
          value: String(sentRfqStats.sent),
          delta: sentRfqStats.sent ? 'live' : '—',
          deltaColor: SIGNAL.navy,
          sub: 'Outbound · sent / active',
          accent: SIGNAL.navy,
          ...SRC.own,
          path: track,
          mapKey: 'sent',
        },
        {
          key: 'pipe-await',
          label: 'Awaiting quotes',
          value: String(sentRfqStats.awaiting),
          delta: sentRfqStats.awaiting ? '▲ watch' : '—',
          deltaColor: sentRfqStats.awaiting ? SIGNAL.watch : SIGNAL.muted,
          sub: 'Sent · waiting for replies',
          accent: sentRfqStats.awaiting ? SIGNAL.watch : SIGNAL.ok,
          ...SRC.live,
          path: track,
          mapKey: 'awaiting',
        },
        {
          key: 'pipe-quoted',
          label: 'Quotes in',
          value: String(sentRfqStats.quoteCount),
          delta: `${sentRfqStats.withQuotes} RFQs`,
          deltaColor: SIGNAL.ok,
          sub: `${sentRfqStats.withQuotes} RFQs with replies`,
          accent: SIGNAL.ok,
          ...SRC.ops,
          path: track,
          mapKey: 'quotes',
        },
      ]
    }
    if (showManufacturer && !showBuyer) {
      return [
        {
          key: 'pipe-pending',
          label: 'Incoming RFQs',
          value: String(receivedRfqStats.pending),
          delta: receivedRfqStats.pending ? '▲ act' : '—',
          deltaColor: receivedRfqStats.pending ? SIGNAL.critical : SIGNAL.muted,
          sub: 'Inbox · pending response',
          accent: receivedRfqStats.pending ? SIGNAL.critical : SIGNAL.navy,
          ...SRC.live,
          path: inbox,
          mapKey: 'incoming',
        },
        {
          key: 'pipe-bids',
          label: 'Bids open',
          value: String(receivedRfqStats.responded),
          delta: receivedRfqStats.responded ? 'live' : '—',
          deltaColor: SIGNAL.watch,
          sub: 'Bid sent · awaiting award',
          accent: SIGNAL.watch,
          ...SRC.own,
          path: inbox,
          mapKey: 'bids',
        },
        {
          key: 'pipe-awarded',
          label: 'Awarded',
          value: String(receivedRfqStats.awarded),
          delta: receivedRfqStats.awarded ? 'won' : '—',
          deltaColor: SIGNAL.ok,
          sub: 'Won invitations · awarded',
          accent: SIGNAL.ok,
          ...SRC.ops,
          path: inbox,
        },
        {
          key: 'pipe-closed',
          label: 'Closed',
          value: String(receivedRfqStats.declined),
          delta: receivedRfqStats.declined ? 'done' : '—',
          deltaColor: SIGNAL.muted,
          sub: 'Declined / closed',
          accent: SIGNAL.muted,
          ...SRC.own,
          path: inbox,
        },
      ]
    }
    /* Buyer + manufacturer (or fallback): same metrics as top KPI row, status funnel order */
    const cells = []
    if (showBuyer) {
      cells.push(
        {
          key: 'pipe-sent',
          label: 'RFQs sent',
          value: String(sentRfqStats.sent),
          delta: sentRfqStats.sent ? 'live' : '—',
          deltaColor: SIGNAL.navy,
          sub: 'Outbound · sent / active',
          accent: SIGNAL.navy,
          ...SRC.own,
          path: track,
          mapKey: 'sent',
        },
        {
          key: 'pipe-await',
          label: 'Awaiting quotes',
          value: String(sentRfqStats.awaiting),
          delta: sentRfqStats.awaiting ? '▲ watch' : '—',
          deltaColor: sentRfqStats.awaiting ? SIGNAL.watch : SIGNAL.muted,
          sub: 'Outbound · no replies yet',
          accent: sentRfqStats.awaiting ? SIGNAL.watch : SIGNAL.ok,
          ...SRC.live,
          path: track,
          mapKey: 'awaiting',
        },
        {
          key: 'pipe-quotes',
          label: 'Quotes in',
          value: String(sentRfqStats.quoteCount),
          delta: `${sentRfqStats.responseRate}%`,
          deltaColor: SIGNAL.ok,
          sub: `${sentRfqStats.withQuotes} RFQs with replies`,
          accent: SIGNAL.ok,
          ...SRC.ops,
          path: track,
          mapKey: 'quotes',
        },
      )
    }
    if (showManufacturer) {
      cells.push(
        {
          key: 'pipe-incoming',
          label: 'Incoming RFQs',
          value: String(receivedRfqStats.pending),
          delta: receivedRfqStats.pending ? '▲ act' : '—',
          deltaColor: receivedRfqStats.pending ? SIGNAL.critical : SIGNAL.muted,
          sub: 'Inbox · pending',
          accent: receivedRfqStats.pending ? SIGNAL.critical : SIGNAL.navy,
          ...SRC.live,
          path: inbox,
          mapKey: 'incoming',
        },
        {
          key: 'pipe-bids',
          label: 'Bids open',
          value: String(receivedRfqStats.responded),
          delta: receivedRfqStats.responded ? 'live' : '—',
          deltaColor: SIGNAL.watch,
          sub: 'Inbox · responded',
          accent: SIGNAL.watch,
          ...SRC.own,
          path: inbox,
          mapKey: 'bids',
        },
      )
    }
    if (!cells.length) {
      cells.push({
        key: 'pipe-network',
        label: 'Network plants',
        value: String(networkLocations.length),
        delta: plantLocation ? 'mapped' : '—',
        deltaColor: SIGNAL.data,
        sub: 'Pins on the map above',
        accent: SIGNAL.data,
        ...SRC.ops,
        path: BUYER_WORKSPACE_PATH,
      })
    }
    return cells.slice(0, 5)
  }, [
    showBuyer,
    showManufacturer,
    sentRfqStats,
    receivedRfqStats,
    networkLocations.length,
    plantLocation,
  ])

  const activityRows = useMemo(() => {
    const rows = []
    if (showBuyer) {
      const list = (Array.isArray(rfqs) ? [...rfqs] : [])
        .filter((r) => r && (r.status === 'sent' || r.status === 'active' || r.status === 'draft'))
        .sort((a, b) => String(b.sentAt || b.createdAt || '').localeCompare(String(a.sentAt || a.createdAt || '')))
        .slice(0, 8)
      list.forEach((r) => {
        const quotes = Number(r.responses || r.sellerResponses?.length || 0)
        rows.push({
          id: `out-${r.id}`,
          ref: r.buyerRefDisplay || r.id,
          title: r.title || 'Network RFQ',
          meta: `${formatWhen(r.sentAt || r.createdAt)} · ${Array.isArray(r.suppliers) ? r.suppliers.length : 0} invited · ${quotes} quote${quotes === 1 ? '' : 's'}`,
          tone: statusTone('outbound', quotes > 0 ? 'quoted' : r.status),
          primary: quotes > 0 ? 'Compare' : 'Track',
          onPrimary: () => navigate(
            quotes > 0 ? `/rfq-comparison/${r.id}` : buyerWorkspaceUrl({ tab: 'track' }),
          ),
          secondary: quotes > 0 ? 'Track' : null,
          onSecondary: () => navigate(buyerWorkspaceUrl({ tab: 'track' })),
        })
      })
    }
    if (showManufacturer) {
      const list = (Array.isArray(receivedList) ? [...receivedList] : [])
        .sort((a, b) => String(b.receivedAt || b.createdAt || '').localeCompare(String(a.receivedAt || a.createdAt || '')))
        .slice(0, 8)
      list.forEach((r) => {
        rows.push({
          id: `in-${r.id}`,
          ref: r.buyerRefDisplay || r.id,
          title: r.title || r.rfqTitle || 'Incoming RFQ',
          meta: `${r.buyerCompany || r.buyerEmail || 'Buyer'} · Due ${formatWhen(r.deadline || r.dueDate)}`,
          tone: statusTone('inbound', r.status),
          primary: r.status === 'pending' ? 'Respond' : 'Open',
          onPrimary: () => navigate(`/dashboard/supplier?open=${encodeURIComponent(r.id)}`),
          secondary: null,
          onSecondary: null,
        })
      })
    }
    return rows.slice(0, 10)
  }, [showBuyer, showManufacturer, rfqs, receivedList, navigate])

  const attention = useMemo(() => {
    const items = []
    if (showBuyer && sentRfqStats.awaiting > 0) {
      items.push({
        id: 'await-quotes',
        tone: SIGNAL.watch,
        title: `${sentRfqStats.awaiting} outbound RFQ${sentRfqStats.awaiting === 1 ? '' : 's'} awaiting quotes`,
        meta: 'Track · Sourcing',
        path: buyerWorkspaceUrl({ tab: 'track' }),
      })
    }
    if (showBuyer && sentRfqStats.withQuotes > 0) {
      items.push({
        id: 'compare',
        tone: SIGNAL.ok,
        title: `${sentRfqStats.withQuotes} RFQ${sentRfqStats.withQuotes === 1 ? '' : 's'} ready to compare`,
        meta: 'Compare quotes',
        path: buyerWorkspaceUrl({ tab: 'track' }),
      })
    }
    if (showManufacturer && receivedRfqStats.pending > 0) {
      items.push({
        id: 'respond',
        tone: SIGNAL.critical,
        title: `${receivedRfqStats.pending} invitation${receivedRfqStats.pending === 1 ? '' : 's'} need a response`,
        meta: 'Inbox',
        path: '/dashboard/supplier',
      })
    }
    if (showManufacturer && receivedRfqStats.responded > 0) {
      items.push({
        id: 'award-wait',
        tone: SIGNAL.watch,
        title: `${receivedRfqStats.responded} bid${receivedRfqStats.responded === 1 ? '' : 's'} awaiting award`,
        meta: 'Inbox',
        path: '/dashboard/supplier',
      })
    }
    if (isServiceProvider && serviceRequestStats.open > 0) {
      items.push({
        id: 'svc-open',
        tone: SIGNAL.critical,
        title: `${serviceRequestStats.open} open service request${serviceRequestStats.open === 1 ? '' : 's'}`,
        meta: 'Service requests',
        path: '/service-requests',
      })
    }
    if (projectsInProgress > 0) {
      items.push({
        id: 'proj',
        tone: SIGNAL.data,
        title: `${projectsInProgress} project task${projectsInProgress === 1 ? '' : 's'} in progress`,
        meta: 'Management · Projects',
        path: '/management/ops/projects',
      })
    }
    return items.slice(0, 6)
  }, [
    showBuyer,
    showManufacturer,
    isServiceProvider,
    sentRfqStats,
    receivedRfqStats,
    serviceRequestStats,
    projectsInProgress,
  ])

  return (
    <AppLayout>
      <div className="home-dash">
        <header className="home-dash__topbar">
          <nav className="home-dash__crumbs" aria-label="Breadcrumb">
            <span className="home-dash__crumb home-dash__crumb--current" aria-current="page">
              Home
            </span>
          </nav>
          <div className="home-dash__topbar-right">
            <div className="home-dash__actions home-dash__actions--topbar">
              {showBuyer ? (
                <button
                  type="button"
                  className="home-w__btn home-w__btn--ghost home-w__btn--topbar"
                  onClick={() => navigate(buyerWorkspaceUrl({ tab: 'track' }))}
                >
                  Track RFQs
                </button>
              ) : null}
              {showManufacturer ? (
                <button
                  type="button"
                  className="home-w__btn home-w__btn--ghost home-w__btn--topbar"
                  onClick={() => navigate('/dashboard/supplier')}
                >
                  Inbox
                </button>
              ) : null}
              <button
                type="button"
                className="home-w__btn home-w__btn--primary home-w__btn--topbar"
                onClick={() => navigate(BUYER_WORKSPACE_PATH)}
              >
                Sourcing
              </button>
            </div>
            <div className="home-dash__plant">
              <span className="home-dash__plant-label">Receiving plant</span>
              <select
                className="home-dash__plant-select"
                value={plant?.id || plants[0]?.id || ''}
                onChange={(e) => {
                  const next = plants.find((p) => p.id === e.target.value)
                  if (next) setPlant(next)
                }}
                aria-label="Receiving plant"
              >
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="home-dash__plants-btn"
                title="Add or edit your receiving plants"
                onClick={() => setPlantsPanelOpen(true)}
              >
                <Icon name="gear" size={14} />
                Plants
              </button>
            </div>
            <button
              type="button"
              className="home-dash__avatar"
              onClick={() => navigate('/profile')}
              title="Account profile"
              aria-label="Open account profile"
            >
              {avatarInitials}
            </button>
          </div>
        </header>

        <div className="home-dash__inner">
          <div className={`home-dash__kpis home-dash__kpis--${Math.min(kpis.length, 5)}`}>
            {kpis.map((k) => (
              <KpiWidget
                key={k.key}
                label={k.label}
                value={k.value}
                unit={k.unit}
                delta={k.delta}
                deltaColor={k.deltaColor}
                sub={k.sub}
                accent={k.accent}
                src={k.src}
                srcFg={k.srcFg}
                srcBg={k.srcBg}
                active={Boolean(k.mapKey && mapFocus === k.mapKey)}
                onClick={() => (k.mapKey
                  ? handleKpiMapFocus(k.mapKey, k.path)
                  : navigate(k.path))}
              />
            ))}
          </div>

          {/* Map + pulse — RFQ KPI colors, lanes to plant, transport lead times */}
          <div className="home-dash__map-row">
            <ExecutiveLocationMap
              className="home-dash__map-widget"
              title={mapFocus && MAP_FOCUS[mapFocus]
                ? `${MAP_FOCUS[mapFocus].label} · map`
                : 'Supplier Locations'}
              disclaimer={
                mapFocus
                  ? 'Dotted lanes show transit lead time to the selected receiving plant (reference only). Click the same KPI again to open the full list.'
                  : 'Click RFQs sent, Awaiting quotes, Quotes in, Incoming RFQs, or Bids open to filter pins and draw lanes. Pins use approximate positions.'
              }
              locations={mapDisplayLocations}
              plantLocation={plantLocation}
              selectedId={selectedLocId}
              onMarkerClick={(loc) => setSelectedLocId(loc?.id || null)}
              metric="risk"
              legendMode={mapFocus || rfqMapRelations.length ? 'rfq' : 'risk'}
              legendItems={mapLegendItems}
              lanes={mapLanes}
              showLane
              showTransportModes
              transportMode={transportMode}
              onTransportModeChange={setTransportMode}
              plantLegendLabel={
                plantLocation
                  ? `Receiving plant${plant?.name ? ` · ${plant.name}` : ''}`
                  : null
              }
            />

            <div className="home-dash__pulse-col" aria-label="Map context indicators">
              {mapSideStats.map((stat) => (
                <PulseStat
                  key={stat.key}
                  label={stat.label}
                  value={stat.value}
                  tone={stat.tone}
                  onClick={stat.onClick}
                />
              ))}
              {mapFocus ? (
                <PulseStat
                  key="clear-focus"
                  label="Map filter"
                  value="Clear"
                  tone={SIGNAL.muted}
                  onClick={() => setMapFocus(null)}
                />
              ) : null}
            </div>
          </div>

          {/* Pipeline — same KPI widget chrome as top row; status funnel */}
          <section className="home-w home-w--main home-w--pipeline">
            <div className="home-w__main-head">
              <h2 className="home-w__main-title">Pipeline</h2>
              <span className="home-w__main-step">By status</span>
            </div>
            <div className={`home-dash__kpis home-dash__kpis--${Math.min(pipeline.length, 5)} home-dash__kpis--pipeline`}>
              {pipeline.map((k) => (
                <KpiWidget
                  key={k.key}
                  label={k.label}
                  value={k.value}
                  unit={k.unit}
                  delta={k.delta}
                  deltaColor={k.deltaColor}
                  sub={k.sub}
                  accent={k.accent}
                  src={k.src}
                  srcFg={k.srcFg}
                  srcBg={k.srcBg}
                  active={Boolean(k.mapKey && mapFocus === k.mapKey)}
                  onClick={() => (k.mapKey
                    ? handleKpiMapFocus(k.mapKey, k.path)
                    : navigate(k.path))}
                />
              ))}
            </div>
          </section>

          <div className="home-dash__grid">
            <Window title="Your RFQs" meta={activityRows.length}>
              {activityRows.length === 0 ? (
                <p className="home-w__empty">No RFQs yet. Create one in Sourcing to track quotes here.</p>
              ) : (
                <div className="home-w__list">
                  {activityRows.map((row) => (
                    <div key={row.id} className="home-w__row">
                      <div className="min-width-0">
                        <div className="home-w__row-title stx-text-wrap">
                          <span className="home-w__ref">{row.ref}</span>
                          {row.title}
                        </div>
                        <div className="home-w__row-meta">{row.meta}</div>
                      </div>
                      <div className="home-w__row-actions">
                        {row.secondary ? (
                          <button
                            type="button"
                            className="home-w__btn home-w__btn--ghost home-w__btn--sm"
                            onClick={row.onSecondary}
                          >
                            {row.secondary}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="home-w__btn home-w__btn--primary home-w__btn--sm"
                          onClick={row.onPrimary}
                        >
                          {row.primary}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Window>

            <div className="home-dash__rail">
              <Window title="Attention" ruleColor={SIGNAL.watch} meta={attention.length}>
                {attention.length === 0 ? (
                  <p className="home-w__empty">All clear.</p>
                ) : (
                  <div className="home-w__alerts">
                    {attention.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="home-w__alert"
                        onClick={() => navigate(item.path)}
                      >
                        <span className="home-w__alert-dot" style={{ background: item.tone }} />
                        <span className="min-width-0">
                          <span className="home-w__alert-text stx-text-wrap">{item.title}</span>
                          <span className="home-w__alert-meta">{item.meta}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </Window>

              <Window title="Region mix" ruleColor={SIGNAL.navy} meta={regionMix.length}>
                {regionMix.length === 0 ? (
                  <p className="home-w__empty">No mapped plants yet.</p>
                ) : (
                  <div className="home-w__regions">
                    {regionMix.map((r) => (
                      <div key={r.label} className="home-w__region">
                        <div className="home-w__region-top">
                          <span className="stx-text-wrap">{r.label}</span>
                          <span className="home-w__region-n">{r.count}</span>
                        </div>
                        <div className="home-w__region-bar">
                          <span style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Window>

              <Window
                className="home-w--accent"
                onClick={() => navigate(BUYER_WORKSPACE_PATH)}
              >
                <div className="home-w__accent-label">Sourcing path</div>
                <div className="home-w__accent-title">Find plants &amp; send RFQs</div>
                <div className="home-w__accent-sub">Domain → industry → category → shortlist → send</div>
              </Window>

              <Window className="home-w--inverse" onClick={() => navigate('/management')}>
                <div className="home-w__accent-label home-w__accent-label--on-dark">Management</div>
                <div className="home-w__accent-title home-w__accent-title--on-dark">
                  Plant tools · {projectsTotal} projects
                </div>
                <div className="home-w__accent-sub home-w__accent-sub--on-dark">
                  Production, cost, quality, compliance
                </div>
              </Window>
            </div>
          </div>
        </div>

        {plantsPanelOpen ? (
          <div className="home-plants-panel" role="dialog" aria-modal="true" aria-labelledby="home-plants-title">
            <button
              type="button"
              className="home-plants-panel__backdrop"
              aria-label="Close plants panel"
              onClick={() => setPlantsPanelOpen(false)}
            />
            <aside className="home-plants-panel__sheet">
              <div className="home-plants-panel__head">
                <div className="min-width-0">
                  <h2 id="home-plants-title" className="home-plants-panel__title">Receiving plants</h2>
                  <p className="home-plants-panel__meta">{plants.length} plant{plants.length === 1 ? '' : 's'}</p>
                </div>
                <button
                  type="button"
                  className="home-plants-panel__close"
                  onClick={() => setPlantsPanelOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="home-plants-panel__body">
                <p className="home-plants-panel__intro">
                  Your receiving plants. Coordinates drive transit and delivery estimates on the map — edit them, add a plant, or switch which one costs run against.
                </p>
                <div className="home-plants-panel__list">
                  {plants.map((p) => {
                    const active = (plant?.id || plants[0]?.id) === p.id
                    return (
                      <div
                        key={p.id}
                        className={`home-plants-panel__card${active ? ' home-plants-panel__card--active' : ''}`}
                      >
                        <div className="home-plants-panel__card-top">
                          <input
                            className="home-plants-panel__name"
                            value={p.name || ''}
                            onChange={(e) => updatePlantField(p.id, 'name', e.target.value)}
                            aria-label="Plant name"
                          />
                          <button
                            type="button"
                            className={`home-plants-panel__badge${active ? ' home-plants-panel__badge--on' : ''}`}
                            onClick={() => setPlant(p)}
                          >
                            {active ? 'In use' : 'Use'}
                          </button>
                          {plants.length > 1 ? (
                            <button
                              type="button"
                              className="home-plants-panel__remove"
                              title="Remove plant"
                              onClick={() => removePlant(p.id)}
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                        <div className="home-plants-panel__fields">
                          <label className="home-plants-panel__field">
                            <span>Country</span>
                            <input
                              value={p.cc || ''}
                              onChange={(e) => updatePlantField(p.id, 'cc', e.target.value)}
                            />
                          </label>
                          <label className="home-plants-panel__field">
                            <span>Latitude</span>
                            <input
                              value={p.lat ?? ''}
                              onChange={(e) => updatePlantField(p.id, 'lat', e.target.value)}
                            />
                          </label>
                          <label className="home-plants-panel__field">
                            <span>Longitude</span>
                            <input
                              value={p.lon ?? ''}
                              onChange={(e) => updatePlantField(p.id, 'lon', e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="home-plants-panel__actions">
                  <button type="button" className="home-w__btn home-w__btn--primary" onClick={addPlant}>
                    Add a receiving plant
                  </button>
                  <button type="button" className="home-w__btn home-w__btn--primary" onClick={savePlantsAndClose}>
                    Save to account
                  </button>
                  <button
                    type="button"
                    className="home-w__btn home-w__btn--ghost"
                    onClick={() => setPlantsPanelOpen(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
