import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.join(__dirname, 'cutdb-source.html')
const outPath = path.join(__dirname, '../src/data/cutDbSeed.js')

const html = fs.readFileSync(htmlPath, 'utf8')

function extractConst(name, kind = 'array') {
  const pattern =
    kind === 'array'
      ? new RegExp(`const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\n\\];`)
      : new RegExp(`const ${name}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`)
  const m = html.match(pattern)
  if (!m) throw new Error(`Missing ${name}`)
  const body = kind === 'array' ? `[${m[1]}]` : `{${m[1]}}`
  return new Function(`return ${body}`)()
}

function extractVarArray(name) {
  const re = new RegExp(`var ${name}\\s*=\\s*\\[([\\s\\S]*?)\\n\\];`)
  const m = html.match(re)
  if (!m) throw new Error(`Missing ${name}`)
  return new Function(`return [${m[1]}]`)()
}

const TOOLS = extractConst('TOOLS')
const SUPPLIERS = extractConst('SUPPLIERS')
const MACHINES = extractConst('MACHINES')
const COATINGS_DATA = extractConst('COATINGS_DATA')
const MATERIALS_DATA = extractConst('MATERIALS_DATA')
const VC_TABLE = extractConst('VC_TABLE', 'object')
const BENCH_DATA = extractConst('BENCH_DATA')
const AI_OFFLINE_DB = extractConst('AI_OFFLINE_DB', 'object')
const TOOL_LIFE_DATA = extractVarArray('TOOL_LIFE_DATA')

const SCORE_LABELS = {
  features: 'Feature Set',
  usability: 'Ease of Use',
  coverage: 'Brand Coverage',
  ordering: 'Order Workflow',
  calculator: 'Speed Calc',
  ai: 'AI Advisor',
  offline: 'Offline Use',
  value: 'Value for Money',
}

const TOOL_IDX = {
  hss: 0,
  'hss-co': 1,
  'carbide-tin': 2,
  'carbide-tialn': 3,
  'carbide-alcr': 4,
  'carbide-dlc': 5,
  'carbide-pcd': 6,
  'carbide-cbn': 7,
  ceramic: 8,
}

const OP_FZ_MOD = { mill: 1.0, drill: 1.8, turn: 2.5, ream: 3.0, tap: 1.0, thread: 0.8, bore: 1.5 }
const OP_VC_MOD = { mill: 1.0, drill: 0.85, turn: 1.2, ream: 0.3, tap: 0.05, thread: 0.7, bore: 0.9 }

const out = `/** Auto-extracted from scripts/cutdb-source.html — regenerate via scripts/extract-cutdb-seed.mjs */
export const CUT_DB = {
  tools: ${JSON.stringify(TOOLS)},
  suppliers: ${JSON.stringify(SUPPLIERS)},
  machines: ${JSON.stringify(MACHINES)},
  coatings: ${JSON.stringify(COATINGS_DATA)},
  materials: ${JSON.stringify(MATERIALS_DATA)},
  vcTable: ${JSON.stringify(VC_TABLE)},
  benchData: ${JSON.stringify(BENCH_DATA)},
  aiOfflineDb: ${JSON.stringify(AI_OFFLINE_DB)},
  toolLifeData: ${JSON.stringify(TOOL_LIFE_DATA)},
  scoreLabels: ${JSON.stringify(SCORE_LABELS)},
  toolIdx: ${JSON.stringify(TOOL_IDX)},
  opFzMod: ${JSON.stringify(OP_FZ_MOD)},
  opVcMod: ${JSON.stringify(OP_VC_MOD)},
}
`

fs.writeFileSync(outPath, out)
console.log('Wrote', outPath, {
  tools: TOOLS.length,
  suppliers: SUPPLIERS.length,
  machines: MACHINES.length,
})
