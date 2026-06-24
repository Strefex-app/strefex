/**
 * Three-bucket RFQ costing: Material | Process | Personnel
 */

const BUCKET_COLORS = {
  material: '#4fc3f7',
  process: '#00d4ff',
  personnel: '#b060ff',
}

function materialUnitCost(mat, weightG) {
  const scrap = 1 + (Number(mat.scrapPct ?? 15) / 100)
  return (weightG / 1000) * mat.price * scrap
}

function toolingAmortEUR(proc, compMult, tolMult) {
  if (proc === 'imm') return (35000 + compMult * 15000 + (tolMult > 1.5 ? 15000 : 0)) / 1_000_000
  if (proc === 'casting') return 80000 / 500000
  if (proc === 'press') return 25000 / 2_000_000
  return 0
}

function toolingMouldEUR(proc, compMult, tolMult) {
  if (proc === 'imm') return 35000 + compMult * 15000 + (tolMult > 1.5 ? 15000 : 0)
  if (proc === 'casting') return 80000
  if (proc === 'press') return 25000
  return 0
}

/**
 * @param {object} input
 * @returns three-bucket breakdown + legacy fields for compatibility
 */
export function calcThreeBucketCost({
  proc,
  mat,
  weightG,
  tolMult = 1,
  finishMult = 1,
  qty = 10000,
  complexity = 'medium',
  complexityMult = null,
  processDef,
  processRates,
  personnelRates,
  toolingEUR,
  toolShots = 1_000_000,
  marginPct = 25,
}) {
  const p = processDef
  const compMult = complexityMult ?? p.complexMult[complexity] ?? p.complexMult.medium ?? 1.5
  const cycleH = (p.cycleBase * compMult * tolMult * (processRates?.cycleFactor ?? 1)) / 60
  const setupTimeH = processRates?.setupTimeH ?? p.setupTime
  const safeQty = Math.max(qty, 100)

  const matCost = materialUnitCost(mat, weightG)

  const machineCycle = cycleH * (processRates?.machineRateEUR ?? p.machineRate)
  const peripheralCycle = cycleH * (processRates?.peripheralRateEUR ?? 0)
  const energyCycle = cycleH * (processRates?.energyRateEUR ?? 0)
  const toolingAmort = toolingEUR != null ? toolingEUR / Math.max(toolShots, 1) : toolingAmortEUR(proc, compMult, tolMult)
  const setupMachine = (setupTimeH * (processRates?.processRateEUR ?? processRates?.machineRateEUR ?? p.machineRate)) / safeQty

  const directLabour = cycleH * (personnelRates?.cycleLabourRateEUR ?? 0)
  const setupLabour = (personnelRates?.setupLabourEUR ?? 0) / safeQty
  const overhead = (directLabour + setupLabour) * ((personnelRates?.overheadPct ?? 180) / 100)

  const processSubtotal = machineCycle + peripheralCycle + energyCycle + toolingAmort + setupMachine
  const personnelSubtotal = directLabour + setupLabour + overhead
  const preFinish = matCost + processSubtotal + personnelSubtotal
  const finishing = preFinish * (finishMult - 1)
  const preMargin = preFinish + finishing
  const margin = marginPct / 100
  const unitPrice = preMargin / (1 - margin)

  return {
    buckets: {
      material: matCost,
      process: processSubtotal + finishing * (processSubtotal / Math.max(preFinish, 1e-9)),
      personnel: personnelSubtotal + finishing * (personnelSubtotal / Math.max(preFinish, 1e-9)),
    },
    material: matCost,
    process: {
      machineCycle,
      peripheralCycle,
      energyCycle,
      tooling: toolingAmort,
      setup: setupMachine,
      total: processSubtotal,
    },
    personnel: {
      directLabour,
      setupLabour,
      overhead,
      total: personnelSubtotal,
    },
    finishing,
    preMargin,
    marginAmount: unitPrice - preMargin,
    total: unitPrice,
    cycleH,
    toolingMouldEUR: toolingEUR ?? toolingMouldEUR(proc, compMult, tolMult),
    bucketRows: [
      { key: 'material', label: 'Material cost', value: matCost, color: BUCKET_COLORS.material },
      { key: 'process', label: 'Process cost', value: processSubtotal, color: BUCKET_COLORS.process },
      { key: 'personnel', label: 'Personnel cost', value: personnelSubtotal, color: BUCKET_COLORS.personnel },
    ],
    detailRows: [
      { label: 'Material', value: matCost, color: BUCKET_COLORS.material, bucket: 'material' },
      { label: 'Machine cycle', value: machineCycle, color: BUCKET_COLORS.process, bucket: 'process' },
      { label: 'Peripherals', value: peripheralCycle, color: BUCKET_COLORS.process, bucket: 'process' },
      { label: 'Energy', value: energyCycle, color: BUCKET_COLORS.process, bucket: 'process' },
      { label: 'Tooling amort.', value: toolingAmort, color: '#ff6d00', bucket: 'process' },
      { label: 'Setup (machine)', value: setupMachine, color: '#ffab00', bucket: 'process' },
      { label: 'Direct labour', value: directLabour, color: BUCKET_COLORS.personnel, bucket: 'personnel' },
      { label: 'Setup labour', value: setupLabour, color: BUCKET_COLORS.personnel, bucket: 'personnel' },
      { label: 'Overhead', value: overhead, color: '#9c27b0', bucket: 'personnel' },
      { label: 'Finishing', value: finishing, color: '#00e676', bucket: 'process' },
    ],
  }
}

export function runRfqIntelQuickCalc(input) {
  const {
    procId = 'imm',
    materialId = 'pp',
    materials = [],
    complexity = 1.5,
    weightG = 120,
    tol = 1,
    finish = 1,
    vol = 10000,
    processDef,
    processRates,
    personnelRates,
    tooling = 45000,
    toolShots = 1_000_000,
    marginPct = 25,
  } = input

  const mat = materials.find((m) => m.id === materialId) || materials[0]
  const result = calcThreeBucketCost({
    proc: procId,
    mat,
    weightG,
    tolMult: tol,
    finishMult: finish,
    qty: Math.max(vol, 1),
    complexityMult: complexity,
    processDef,
    processRates,
    personnelRates,
    toolingEUR: tooling,
    toolShots,
    marginPct,
  })

  const volumes = [50, 100, 500, 1000, 5000, 10000, 50000, 100000]
  const volumePrices = volumes.map((v) => {
    const r = calcThreeBucketCost({
      proc: procId,
      mat,
      weightG,
      tolMult: tol,
      finishMult: finish,
      qty: v,
      complexityMult: complexity,
      processDef,
      processRates,
      personnelRates,
      toolingEUR: tooling,
      toolShots,
      marginPct,
    })
    return { vol: v, unit: r.total }
  })

  return {
    process: processDef.name,
    material: mat.name,
    preMargin: result.preMargin,
    unitPrice: result.total,
    buckets: result.buckets,
    bucketRows: result.bucketRows,
    rows: result.detailRows,
    volumePrices,
    meta: {
      processRateEUR: processRates?.processRateEUR,
      personnelCycleRateEUR: personnelRates?.cycleLabourRateEUR,
      overheadPct: personnelRates?.overheadPct,
      toolingEUR: tooling,
      toolShots,
      marginPct,
    },
  }
}

export { BUCKET_COLORS }
