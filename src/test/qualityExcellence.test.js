import { describe, it, expect, beforeEach } from 'vitest'
import {
  QUALITY_EXCELLENCE_STAGES,
  QUALITY_EXCELLENCE_TOOLS,
  createBlankQualityRecord,
  getQualityTool,
} from '../data/qualityExcellenceCatalog'
import { QUALITY_TRAINING, getQualityTraining } from '../data/qualityExcellenceTraining'
import { computeQualityRecord, coqBucketTotals, ansiZ14SampleSize } from '../utils/qualityExcellenceCompute'
import { QUALITY_VISUAL_KIND, ftaTree, groupFishboneCauses } from '../utils/qualityExcellenceVisuals'
import { parseDelimitedText, mapImportedRows } from '../utils/qualityExcellenceImport'
import { handleEnterAdvance } from '../utils/qualityEnterAdvance'
import useQualityExcellenceStore from '../store/qualityExcellenceStore'

describe('Quality Excellence catalog', () => {
  it('has 30 unique tagged tools', () => {
    expect(QUALITY_EXCELLENCE_STAGES).toHaveLength(7)
    expect(QUALITY_EXCELLENCE_TOOLS).toHaveLength(30)
    const ids = QUALITY_EXCELLENCE_TOOLS.map((t) => t.id)
    expect(new Set(ids).size).toBe(30)
    expect(QUALITY_EXCELLENCE_TOOLS.every((t) => t.number && t.name && t.tag && t.tagLabel)).toBe(true)
  })

  it('seeds standard worksheets for create', () => {
    const tool = getQualityTool('t1-5-whys')
    const blank = createBlankQualityRecord(tool)
    expect(blank.fields.status).toBe('draft')
    expect(blank.tables.chain).toHaveLength(6)
    expect(blank.tables.chain[0].step).toBe('Problem')

    const eightD = createBlankQualityRecord(getQualityTool('t4-8d'))
    expect(eightD.tables.disciplines).toHaveLength(9)
    expect(eightD.tables.isIsNot).toHaveLength(5)
  })

  it('maps a shape view for every tool', () => {
    expect(Object.keys(QUALITY_VISUAL_KIND)).toHaveLength(30)
    QUALITY_EXCELLENCE_TOOLS.forEach((tool) => {
      expect(QUALITY_VISUAL_KIND[tool.id]).toBeTruthy()
    })
  })

  it('has practitioner training for every tool', () => {
    expect(Object.keys(QUALITY_TRAINING)).toHaveLength(30)
    QUALITY_EXCELLENCE_TOOLS.forEach((tool) => {
      const training = getQualityTraining(tool.id)
      expect(training?.bullets?.length).toBeGreaterThan(2)
      expect(training.bullets.every((line) => line.length > 8)).toBe(true)
    })
  })

  it('groups fishbone causes and builds an FTA tree', () => {
    const groups = groupFishboneCauses([
      { category: 'Machine', cause: 'Worn collet' },
      { category: 'Method', cause: 'No torque spec' },
    ])
    expect(groups).toHaveLength(6)
    expect(groups.find((g) => g.short === 'Machine').causes).toHaveLength(1)

    const tree = ftaTree([
      { id: 'T', gate: 'top', description: 'Leak' },
      { id: 'B1', gate: 'basic', parent: 'T', description: 'Seal' },
    ], 'Leak')
    expect(tree.tops[0].id).toBe('T')
    expect(tree.byParent.get('T')).toHaveLength(1)
  })
})

describe('Quality Excellence compute', () => {
  it('computes FMEA RPN as S × O × D', () => {
    const next = computeQualityRecord('t10-fmea', {
      fields: {},
      tables: { modes: [{ severity: 8, occurrence: 5, detection: 4 }] },
    })
    expect(next.tables.modes[0].rpn).toBe(160)
  })

  it('computes Cpk, Ppk, OEE, RSS, and %GRR', () => {
    const cap = computeQualityRecord('t9-cpk-ppk', {
      fields: { usl: 10, lsl: 4, mean: 7, sigmaWithin: 0.5, sigmaOverall: 0.8 },
      tables: {},
    })
    expect(cap.fields.cpk).toBe(2)
    expect(cap.fields.ppk).toBe(1.25)

    const oee = computeQualityRecord('t17-tpm-oee', {
      fields: { availability: 90, performance: 80, quality: 95 },
      tables: {},
    })
    expect(oee.fields.oee).toBe(68.4)

    const rss = computeQualityRecord('t12-tolerance', {
      fields: {},
      tables: { components: [{ tolerance: 3, contributor: 'yes' }, { tolerance: 4, contributor: 'yes' }] },
    })
    expect(rss.fields.rss).toBe(5)

    const gage = computeQualityRecord('t8-gage-rr', {
      fields: { ev: 3, av: 4, pv: 12 },
      tables: {},
    })
    expect(gage.fields.grrPct).toBe(38.4615)
  })

  it('computes Pareto shares and COQ buckets', () => {
    const pareto = computeQualityRecord('t6-pareto', {
      fields: {},
      tables: { items: [{ name: 'A', cost: 80 }, { name: 'B', cost: 20 }] },
    })
    expect(pareto.tables.items[0].percent).toBe(80)
    expect(pareto.tables.items[1].cumulative).toBe(100)

    const totals = coqBucketTotals({
      tables: {
        lines: [
          { bucket: 'prevention', amount: 10 },
          { bucket: 'appraisal', amount: 5 },
          { bucket: 'internal_failure', amount: 20 },
        ],
      },
    })
    expect(totals.total).toBe(35)
    expect(totals.internal_failure).toBe(20)
  })

  it('computes SPC limits, Cpk from readings, Z1.4 n, and SMED %', () => {
    const spc = computeQualityRecord('t7-spc', {
      fields: {},
      tables: { points: [{ value: 10 }, { value: 12 }, { value: 11 }, { value: 10 }, { value: 12 }] },
    })
    expect(spc.fields.cl).toBe(11)
    expect(spc.fields.ucl).toBeGreaterThan(spc.fields.cl)
    expect(spc.fields.lcl).toBeLessThan(spc.fields.cl)

    const cap = computeQualityRecord('t9-cpk-ppk', {
      fields: { usl: 12, lsl: 8 },
      tables: { samples: [{ reading: 9.8 }, { reading: 10 }, { reading: 10.2 }, { reading: 9.9 }, { reading: 10.1 }] },
    })
    expect(cap.fields.mean).toBe(10)
    expect(cap.fields.sampleSize).toBe(5)
    expect(cap.fields.cpk).toBeGreaterThan(0)

    expect(ansiZ14SampleSize(100, 'II')).toBe(20)
    const smed = computeQualityRecord('t16-smed', {
      fields: { baselineMin: 40 },
      tables: { elements: [{ minutes: 10, type: 'internal' }, { minutes: 6, type: 'external' }] },
    })
    expect(smed.fields.actualMin).toBe(16)
    expect(smed.fields.reductionPct).toBe(60)
  })
})

describe('Quality Excellence import', () => {
  it('parses pasted numbers and maps to readings', () => {
    const parsed = parseDelimitedText('10.1\n10.2\n9.9')
    expect(parsed.rows).toHaveLength(3)
    const mapped = mapImportedRows(parsed.rows, [{ key: 'reading', label: 'Reading' }])
    expect(mapped[0].reading).toBe('10.1')
  })
})

describe('Quality Excellence store', () => {
  beforeEach(() => {
    useQualityExcellenceStore.setState({ records: [] })
  })

  it('creates, updates, and deletes a tool record', () => {
    const created = useQualityExcellenceStore.getState().createRecord('t10-fmea', {
      fields: { title: 'Line 3 PFMEA' },
    })
    expect(created.id).toMatch(/^qe-/)
    expect(created.toolId).toBe('t10-fmea')
    expect(created.tables.modes.length).toBeGreaterThan(0)

    useQualityExcellenceStore.getState().updateRecord(created.id, {
      tables: { modes: [{ ...created.tables.modes[0], severity: 9, occurrence: 6, detection: 5 }] },
    })
    const updated = useQualityExcellenceStore.getState().getById(created.id)
    expect(updated.tables.modes[0].rpn).toBe(270)

    useQualityExcellenceStore.getState().deleteRecord(created.id)
    expect(useQualityExcellenceStore.getState().getById(created.id)).toBeNull()
  })
})

describe('Enter advances to the next field', () => {
  it('moves focus to the next input', () => {
    const a = document.createElement('input')
    const b = document.createElement('input')
    const box = document.createElement('div')
    box.append(a, b)
    document.body.appendChild(box)
    a.focus()
    handleEnterAdvance(
      { key: 'Enter', target: a, preventDefault() {}, stopPropagation() {} },
      { container: box },
    )
    expect(document.activeElement).toBe(b)
    box.remove()
  })
})
