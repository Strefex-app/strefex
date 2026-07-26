/** CutDB filter, compare and calculator helpers — mirrors HTML app logic. */

export function findSupplierByLabel(suppliers, label) {
  if (!label) return null
  const needle = label.toLowerCase()
  return suppliers.find((s) => {
    const name = s.name.toLowerCase()
    return name === needle || name.includes(needle) || s.id.toLowerCase() === needle.replace(/\s+/g, '')
  }) || null
}

export function uniqueToolApplications(tools) {
  const apps = new Set()
  tools.forEach((t) => {
    if (!t.application) return
    t.application.split(/[,;]/).forEach((part) => {
      const trimmed = part.trim()
      if (trimmed) apps.add(trimmed)
    })
  })
  return [...apps].sort((a, b) => a.localeCompare(b))
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
}

export function toolSearchText(t) {
  return [
    t.name,
    t.code,
    t.notes,
    t.subtype,
    t.application,
    ...(t.materials || []),
    ...(t.processes || []),
    ...(t.machineTypes || []),
    ...(t.machineBrands || []),
    ...(t.suppliers || []),
  ]
    .join(' ')
    .toLowerCase()
}

export function buildToolSpecPairs(t) {
  return [
    ['Code', t.code],
    ['Type', t.type],
    ['Subtype', t.subtype],
    ['Diameter', t.diameter != null ? `${t.diameter} mm` : '—'],
    ['Flutes', t.flutes != null ? String(t.flutes) : '—'],
    ['Coating', t.coating],
    ['Substrate', t.substrate],
    ['Hardness', t.hardness],
    ['ISO Class', t.isoClass],
    ['Cut Speed', t.cutSpeed],
    ['Feed', t.feed],
    ['Max Depth', t.maxDepth],
    ['Shank', t.shank],
    ['Coolant', t.coolant],
    ['Price', t.price],
  ]
}

export function filterTools(tools, filters) {
  const {
    q = '',
    type = '',
    subtype = '',
    coat = '',
    substrate = '',
    mat = '',
    iso = '',
    proc = '',
    machtype = '',
    sup = '',
    app = '',
    diam = '',
    hard = '',
    sort = '',
  } = filters

  const query = q.trim().toLowerCase()
  let res = tools.filter((t) => {
    if (query && !toolSearchText(t).includes(query)) return false
    if (type && t.type !== type) return false
    if (subtype && t.subtype !== subtype) return false
    if (coat && t.coating !== coat) return false
    if (substrate && t.substrate !== substrate) return false
    if (mat && !(t.materials || []).includes(mat)) return false
    if (iso && t.isoClass !== iso) return false
    if (proc && !(t.processes || []).includes(proc)) return false
    if (machtype && !(t.machineTypes || []).includes(machtype)) return false
    if (sup && !(t.suppliers || []).includes(sup)) return false
    if (app && !(t.application || '').includes(app)) return false
    if (hard && t.hardness !== hard) return false
    if (diam && t.diameter != null) {
      const [mn, mx] = diam.split('-').map(Number)
      if (t.diameter < mn || t.diameter > mx) return false
    }
    return true
  })

  if (sort === 'name') res = [...res].sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === 'code') res = [...res].sort((a, b) => a.code.localeCompare(b.code))
  else if (sort === 'diam-asc') res = [...res].sort((a, b) => (a.diameter ?? 999) - (b.diameter ?? 999))
  else if (sort === 'diam-desc') res = [...res].sort((a, b) => (b.diameter ?? -1) - (a.diameter ?? -1))

  return res
}

export function filterSuppliers(suppliers, { q = '', region = '', category = '' }) {
  const query = q.trim().toLowerCase()
  return suppliers.filter((s) => {
    const hay = `${s.name} ${s.country} ${s.region} ${(s.tools || []).join(' ')} ${s.desc || ''}`.toLowerCase()
    if (query && !hay.includes(query)) return false
    if (region && s.region !== region) return false
    if (category && s.category !== category) return false
    return true
  })
}

export function filterMachines(machines, { q = '', region = '', category = '', type = '' }) {
  const query = q.trim().toLowerCase()
  return machines.filter((m) => {
    const hay = `${m.name} ${m.country} ${m.region} ${(m.types || []).join(' ')} ${m.desc || ''}`.toLowerCase()
    if (query && !hay.includes(query)) return false
    if (region && m.region !== region) return false
    if (category && m.category !== category) return false
    if (type && !(m.types || []).includes(type)) return false
    return true
  })
}

export function calcSpeedFeed(db, params) {
  const {
    op = 'mill',
    dia = 10,
    mat = 'p-low',
    tool = 'carbide-tialn',
    fl = 4,
    ap = 2,
    ae = 5,
    maxRpm = 12000,
    cool = 'flood',
  } = params

  const row = db.vcTable?.[mat]
  if (!row) return { error: 'Unknown material group' }

  const toolIdx = db.toolIdx?.[tool]
  const vcBase = toolIdx != null ? row.vc?.[toolIdx] : null
  if (vcBase == null) return { error: 'No data for this tool / material combination' }

  const vcMod = db.opVcMod?.[op] ?? 1
  let vc = vcBase * vcMod
  if (row.cool_mod?.[cool]) vc *= row.cool_mod[cool]

  const rpmRaw = (1000 * vc) / Math.max(dia, 0.1)
  const rpm = Math.min(Math.round(rpmRaw), maxRpm)
  const vcAct = (Math.PI * dia * rpm) / 1000

  const fzBase = row.fz_base ?? 0.05
  const fzMod = db.opFzMod?.[op] ?? 1
  const fz = fzBase * fzMod
  const feed = Math.round(fz * fl * rpm * 10) / 10

  const mrrMod = row.mrr_mod ?? 1
  const mrr = Math.round(ae * ap * feed * mrrMod * 10) / 10

  return {
    vc: Math.round(vcAct),
    rpm,
    fz: Math.round(fz * 1000) / 1000,
    feed,
    mrr,
    warning: rpmRaw > maxRpm ? `RPM limited to ${maxRpm} (theoretical ${Math.round(rpmRaw)})` : '',
  }
}

export function aiOfflineAnswer(db, question) {
  const q = question.trim().toLowerCase()
  if (!q) return 'Ask about materials, coatings, brands, or troubleshooting (e.g. stainless, titanium, chatter, TiAlN).'
  for (const [key, answer] of Object.entries(db.aiOfflineDb || {})) {
    if (q.includes(key.toLowerCase())) {
      return answer
    }
  }
  return 'No cached match. Try keywords: stainless, aluminium, titanium, hardened, inconel, cast iron, TiAlN, CBN, chatter, drill, Sandvik, ONMY.'
}
