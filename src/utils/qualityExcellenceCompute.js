function num(value) {
  if (value === '' || value == null) return null
  const n = Number(String(value).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function round4(n) {
  return Math.round(n * 10000) / 10000
}

function mean(values) {
  if (!values.length) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function sampleStdev(values) {
  if (values.length < 2) return null
  const m = mean(values)
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function nums(rows, key) {
  return (rows || []).map((row) => num(row[key])).filter((v) => v != null)
}

/** ANSI Z1.4 single sampling, general inspection — sample size from lot size. */
export function ansiZ14SampleSize(lotSize, level = 'II') {
  const n = num(lotSize)
  if (n == null || n <= 0) return null
  const tables = {
    I: [[8, 2], [15, 2], [25, 3], [50, 5], [90, 8], [150, 13], [280, 20], [500, 32], [1200, 50], [3200, 80], [10000, 125], [35000, 200], [150000, 315], [Infinity, 500]],
    II: [[8, 2], [15, 3], [25, 5], [50, 8], [90, 13], [150, 20], [280, 32], [500, 50], [1200, 80], [3200, 125], [10000, 200], [35000, 315], [150000, 500], [Infinity, 800]],
    III: [[8, 3], [15, 5], [25, 8], [50, 13], [90, 20], [150, 32], [280, 50], [500, 80], [1200, 125], [3200, 200], [10000, 315], [35000, 500], [Infinity, 800]],
  }
  const key = ['I', 'II', 'III'].includes(level) ? level : 'II'
  const row = tables[key].find(([max]) => n <= max)
  return row ? row[1] : 2
}

export function computeQualityRecord(toolId, record) {
  if (!record) return record
  const next = {
    ...record,
    fields: { ...(record.fields || {}) },
    tables: { ...(record.tables || {}) },
  }
  const f = next.fields

  if (toolId === 't6-pareto') {
    const items = next.tables.items || []
    const total = items.reduce((sum, row) => {
      const cost = num(row.cost)
      const count = num(row.count)
      return sum + (cost != null ? cost : count || 0)
    }, 0)
    f.total = round4(total)
    let cumulative = 0
    next.tables.items = items.map((row) => {
      const cost = num(row.cost)
      const count = num(row.count)
      const value = cost != null ? cost : count || 0
      const percent = total > 0 ? (value / total) * 100 : 0
      cumulative += percent
      return { ...row, percent: round4(percent), cumulative: round4(cumulative) }
    })
  }

  if (toolId === 't7-spc') {
    const points = next.tables.points || []
    const values = nums(points, 'value')
    const m = mean(values)
    const sd = sampleStdev(values)
    if (m != null) f.cl = round4(m)
    if (m != null && sd != null) {
      f.ucl = round4(m + 3 * sd)
      f.lcl = round4(m - 3 * sd)
      f.stdev = round4(sd)
    }
    f.sampleSize = values.length
    next.tables.points = points.map((row, i) => {
      const v = num(row.value)
      const prev = num(points[i - 1]?.value)
      const range = num(row.range) ?? (v != null && prev != null ? round4(Math.abs(v - prev)) : row.range)
      let signal = row.signal
      if (v != null && num(f.ucl) != null && num(f.lcl) != null) {
        if (v > num(f.ucl) || v < num(f.lcl)) signal = 'beyond_limits'
        else if (!signal || signal === 'beyond_limits') signal = 'none'
      }
      return { ...row, range, signal }
    })
  }

  if (toolId === 't8-gage-rr') {
    const ev = num(f.ev)
    const av = num(f.av)
    const pv = num(f.pv)
    if (ev != null && av != null && pv != null) {
      const grr = Math.sqrt(ev * ev + av * av)
      const tv = Math.sqrt(grr * grr + pv * pv)
      f.grr = round4(grr)
      if (tv > 0) f.grrPct = round4((grr / tv) * 100)
      if (grr > 0) f.ndc = round4(1.41 * (pv / grr))
      const pct = num(f.grrPct)
      if (pct != null) {
        f.verdict = pct < 10 ? 'acceptable_<10' : pct <= 30 ? 'marginal_10_30' : 'unacceptable_>30'
      }
    }
  }

  if (toolId === 't9-cpk-ppk') {
    const readings = nums(next.tables.samples, 'reading')
    if (readings.length >= 1) {
      f.mean = round4(mean(readings))
      f.sampleSize = readings.length
    }
    if (readings.length >= 2) {
      f.sigmaOverall = round4(sampleStdev(readings))
      if (num(f.sigmaWithin) == null) f.sigmaWithin = f.sigmaOverall
    }
    const usl = num(f.usl)
    const lsl = num(f.lsl)
    const m = num(f.mean)
    const sw = num(f.sigmaWithin)
    const so = num(f.sigmaOverall)
    if (usl != null && lsl != null && usl > lsl) {
      if (sw && sw > 0) f.cp = round4((usl - lsl) / (6 * sw))
      if (so && so > 0) f.pp = round4((usl - lsl) / (6 * so))
    }
    if (usl != null && lsl != null && m != null) {
      if (sw && sw > 0) f.cpk = round4(Math.min((usl - m) / (3 * sw), (m - lsl) / (3 * sw)))
      if (so && so > 0) f.ppk = round4(Math.min((usl - m) / (3 * so), (m - lsl) / (3 * so)))
    }
  }

  if (toolId === 't10-fmea') {
    next.tables.modes = (next.tables.modes || []).map((row) => {
      const s = num(row.severity)
      const o = num(row.occurrence)
      const d = num(row.detection)
      const rpn = s != null && o != null && d != null ? s * o * d : num(row.rpn)
      let priority = row.priority
      if (rpn != null) {
        priority = rpn >= 200 || (s != null && s >= 9) ? 'H' : rpn >= 80 ? 'M' : 'L'
      }
      return { ...row, rpn, priority }
    })
    const rpns = (next.tables.modes || []).map((r) => num(r.rpn)).filter((v) => v != null)
    f.maxRpn = rpns.length ? Math.max(...rpns) : ''
  }

  if (toolId === 't12-tolerance') {
    const parts = (next.tables.components || []).filter((row) => row.contributor !== 'no')
    const tols = nums(parts, 'tolerance')
    if (tols.length) {
      f.rss = round4(Math.sqrt(tols.reduce((sum, t) => sum + t * t, 0)))
      f.worstCase = round4(tols.reduce((sum, t) => sum + Math.abs(t), 0))
    }
  }

  if (toolId === 't14-doe') {
    const responses = nums(next.tables.runs, 'response')
    if (responses.length) f.meanResponse = round4(mean(responses))
  }

  if (toolId === 't16-smed') {
    const elements = next.tables.elements || []
    const internal = nums(elements.filter((r) => r.type === 'internal'), 'minutes')
    const external = nums(elements.filter((r) => r.type === 'external'), 'minutes')
    f.internalMin = round4(internal.reduce((s, v) => s + v, 0))
    f.externalMin = round4(external.reduce((s, v) => s + v, 0))
    if (num(f.actualMin) == null && (internal.length || external.length)) {
      f.actualMin = round4((num(f.internalMin) || 0) + (num(f.externalMin) || 0))
    }
    const base = num(f.baselineMin)
    const actual = num(f.actualMin)
    if (base && actual != null && base > 0) f.reductionPct = round4(((base - actual) / base) * 100)
  }

  if (toolId === 't17-tpm-oee') {
    const a = num(f.availability)
    const p = num(f.performance)
    const q = num(f.quality)
    if (a != null && p != null && q != null) {
      f.oee = round4((a / 100) * (p / 100) * (q / 100) * 100)
    }
    const mins = nums(next.tables.losses, 'minutes')
    f.lossMinutes = round4(mins.reduce((s, v) => s + v, 0))
  }

  if (toolId === 't19-lpa') {
    const checks = next.tables.checks || []
    const scored = checks.filter((r) => r.result === 'pass' || r.result === 'fail')
    const pass = scored.filter((r) => r.result === 'pass').length
    if (scored.length) f.score = round4((pass / scored.length) * 100)
  }

  if (toolId === 't20-kpi-dashboard') {
    next.tables.kpis = (next.tables.kpis || []).map((row) => {
      const target = num(row.target)
      const actual = num(row.actual)
      return {
        ...row,
        gap: target != null && actual != null ? round4(actual - target) : row.gap,
      }
    })
  }

  if (toolId === 't21-frequency-reduction' || toolId === 't26-lpa-rightsizing') {
    const current = num(f.currentCount)
    const proposed = num(f.proposedCount)
    if (current && proposed != null && current > 0) {
      f.reductionPct = round4(((current - proposed) / current) * 100)
    }
  }

  if (toolId === 't22-skip-lot') {
    const level = ['I', 'II', 'III'].includes(f.level) ? f.level : 'II'
    const n = ansiZ14SampleSize(f.lotSize, level)
    if (n != null) f.sampleSize = n
    const aql = num(f.aql)
    if (n != null && aql != null) {
      const ac = Math.max(0, Math.floor(n * aql / 100))
      f.accept = ac
      f.reject = ac + 1
    }
  }

  if (toolId === 't23-inspection-matrix') {
    const rows = next.tables.inspections || []
    f.keepCost = round4(nums(rows.filter((r) => r.action === 'keep'), 'cost').reduce((s, v) => s + v, 0))
    f.removeCost = round4(nums(rows.filter((r) => r.action === 'remove' || r.action === 'merge'), 'cost').reduce((s, v) => s + v, 0))
  }

  if (toolId === 't27-supplier-rightsizing') {
    next.tables.suppliers = (next.tables.suppliers || []).map((row) => {
      if (row.action) return row
      const ppm = num(row.ppm)
      const ppk = num(row.ppk)
      const complaints = num(row.complaints) || 0
      let action = 'incoming'
      if (ppm != null && ppm <= 50 && (ppk == null || ppk >= 1.67) && complaints === 0) action = 'dock_to_stock'
      else if (ppm != null && ppm <= 200 && (ppk == null || ppk >= 1.33)) action = 'skip_lot'
      return { ...row, action }
    })
  }

  if (toolId === 't28-simplification-register') {
    next.tables.items = (next.tables.items || []).map((row) => {
      const current = num(row.currentCost)
      const simplified = num(row.simplifiedCost)
      return {
        ...row,
        saving: current != null && simplified != null ? round4(current - simplified) : row.saving,
      }
    })
    f.totalSaving = round4(nums(next.tables.items, 'saving').reduce((s, v) => s + v, 0))
  }

  if (toolId === 't30-coq') {
    const totals = coqBucketTotals(next)
    f.prevention = round4(totals.prevention)
    f.appraisal = round4(totals.appraisal)
    f.internalFailure = round4(totals.internal_failure)
    f.externalFailure = round4(totals.external_failure)
    f.totalCoq = round4(totals.total)
    const invest = totals.prevention + totals.appraisal
    f.failureShare = totals.total ? round4(((totals.internal_failure + totals.external_failure) / totals.total) * 100) : ''
    f.investmentShare = totals.total ? round4((invest / totals.total) * 100) : ''
  }

  return next
}

export function coqBucketTotals(record) {
  const totals = {
    prevention: 0,
    appraisal: 0,
    internal_failure: 0,
    external_failure: 0,
    total: 0,
  }
  ;(record?.tables?.lines || []).forEach((row) => {
    const amount = num(row.amount) || 0
    if (totals[row.bucket] != null) totals[row.bucket] += amount
    totals.total += amount
  })
  return totals
}

export function resultChips(toolId, record) {
  const c = computeQualityRecord(toolId, record)
  const f = c.fields || {}
  const chips = []
  const add = (label, value) => {
    if (value !== '' && value != null && value !== false) chips.push({ label, value })
  }
  if (toolId === 't6-pareto') add('Total', f.total)
  if (toolId === 't7-spc') {
    add('CL', f.cl); add('UCL', f.ucl); add('LCL', f.lcl); add('n', f.sampleSize)
  }
  if (toolId === 't8-gage-rr') {
    add('%GRR', f.grrPct); add('ndc', f.ndc); add('Verdict', f.verdict)
  }
  if (toolId === 't9-cpk-ppk') {
    add('n', f.sampleSize); add('Mean', f.mean); add('Cpk', f.cpk); add('Ppk', f.ppk); add('Cp', f.cp)
  }
  if (toolId === 't10-fmea') add('Max RPN', f.maxRpn)
  if (toolId === 't12-tolerance') {
    add('RSS', f.rss); add('Worst case', f.worstCase)
  }
  if (toolId === 't14-doe') add('Mean response', f.meanResponse)
  if (toolId === 't16-smed') {
    add('Internal min', f.internalMin); add('External min', f.externalMin); add('% reduced', f.reductionPct)
  }
  if (toolId === 't17-tpm-oee') {
    add('OEE %', f.oee); add('Loss min', f.lossMinutes)
  }
  if (toolId === 't19-lpa') add('Score %', f.score)
  if (toolId === 't21-frequency-reduction' || toolId === 't26-lpa-rightsizing') add('% reduced', f.reductionPct)
  if (toolId === 't22-skip-lot') {
    add('n', f.sampleSize); add('Ac', f.accept); add('Re', f.reject)
  }
  if (toolId === 't23-inspection-matrix') {
    add('Keep cost', f.keepCost); add('Remove/merge', f.removeCost)
  }
  if (toolId === 't28-simplification-register') add('Total saving', f.totalSaving)
  if (toolId === 't30-coq') {
    add('Total COQ', f.totalCoq); add('Failure %', f.failureShare)
  }
  return chips
}

export function summarizeQualityRecord(toolId, record) {
  const chips = resultChips(toolId, record)
  if (chips.length) return chips.map((c) => `${c.label} ${c.value}`).join(' · ')
  const fields = record?.fields || {}
  return fields.rootCause || fields.goal || fields.prediction || '—'
}

/** Which numbers a QC operator types — everything else is auto. */
export const NUMBER_ENTRY = {
  't6-pareto': { table: 'items', columns: ['name', 'count', 'cost'] },
  't7-spc': { table: 'points', columns: ['sample', 'value'] },
  't8-gage-rr': { fields: ['ev', 'av', 'pv'] },
  't9-cpk-ppk': { fields: ['usl', 'lsl', 'sigmaWithin'], table: 'samples', columns: ['reading'] },
  't10-fmea': { table: 'modes', columns: ['item', 'failureMode', 'severity', 'occurrence', 'detection'] },
  't12-tolerance': { fields: ['requirement'], table: 'components', columns: ['component', 'tolerance', 'contributor'] },
  't14-doe': { table: 'runs', columns: ['run', 'settings', 'response'] },
  't16-smed': { fields: ['baselineMin', 'targetMin'], table: 'elements', columns: ['element', 'minutes', 'type'] },
  't17-tpm-oee': { fields: ['availability', 'performance', 'quality'], table: 'losses', columns: ['loss', 'minutes'] },
  't19-lpa': { table: 'checks', columns: ['check', 'result'] },
  't20-kpi-dashboard': { table: 'kpis', columns: ['name', 'target', 'actual'] },
  't21-frequency-reduction': { fields: ['ppk', 'currentCount', 'proposedCount'] },
  't22-skip-lot': { fields: ['lotSize', 'aql', 'level'] },
  't23-inspection-matrix': { table: 'inspections', columns: ['inspection', 'cost', 'action'] },
  't24-cp-rightsizing': { table: 'rows', columns: ['ctq', 'action'] },
  't25-gauge-rationalisation': { table: 'gauges', columns: ['gauge', 'action'] },
  't26-lpa-rightsizing': { fields: ['passRate', 'currentCount', 'proposedCount'] },
  't27-supplier-rightsizing': { table: 'suppliers', columns: ['supplier', 'ppm', 'ppk', 'complaints'] },
  't28-simplification-register': { table: 'items', columns: ['item', 'currentCost', 'simplifiedCost'] },
  't30-coq': { table: 'lines', columns: ['bucket', 'item', 'amount'] },
}
