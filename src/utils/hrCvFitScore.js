/**
 * Heuristic "fit" score: overlap between role criteria text and CV text.
 * Not a replacement for real AI — deterministic, private, works offline.
 * Optional OpenAI-style hook: set VITE_OPENAI_API_KEY + model later in a thin wrapper.
 */

function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß+\-#.\s]/gi, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP.has(w))
}

const STOP = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'have', 'has', 'are', 'was', 'were',
  'und', 'der', 'die', 'das', 'mit', 'von', 'für', 'bei', 'eine', 'einen', 'sowie', 'oder',
  'you', 'your', 'our', 'all', 'any', 'can', 'will', 'may', 'not', 'but', 'into', 'also',
])

/**
 * Build searchable corpus from position (title, description, department, industry, keywords, hints).
 * @param {object} position
 */
export function buildRoleCorpus(position) {
  const parts = [
    position?.title,
    position?.department,
    position?.description,
    position?.industry,
    position?.mustHaveKeywords,
    position?.preferredExperience,
    position?.aiMatchHints,
  ]
  return parts.filter(Boolean).join(' \n ')
}

/**
 * @param {object} position — open position row from hrSpaceStore
 * @param {string} cvText
 * @returns {{ score: number, reasons: string[] }}
 */
export function scoreCvAgainstPosition(position, cvText) {
  const roleRaw = buildRoleCorpus(position)
  const roleTokens = new Set(tokenize(roleRaw))
  const cvTokens = tokenize(cvText)

  if (roleTokens.size === 0) {
    return {
      score: 0,
      reasons: ['Add a title, description, industry, or keywords to this position to score applicants.'],
    }
  }
  if (cvTokens.length === 0) {
    return {
      score: 0,
      reasons: [
        'No readable CV text yet — text-based PDFs and .txt work best; image scans and scanned PDFs are OCR’d when possible.',
      ],
    }
  }

  const cvSet = new Set(cvTokens)
  const hits = []
  roleTokens.forEach((t) => {
    if (cvSet.has(t)) hits.push(t)
  })

  const union = new Set([...roleTokens, ...cvSet])
  const jaccard = union.size ? hits.length / union.size : 0
  const coverage = roleTokens.size ? hits.length / roleTokens.size : 0
  const score = Math.min(100, Math.round(jaccard * 55 + coverage * 45))

  const reasons = []
  if (hits.length) {
    const sample = [...new Set(hits)].slice(0, 8).join(', ')
    reasons.push(`Matched terms: ${sample}${hits.length > 8 ? '…' : ''}`)
  } else {
    reasons.push('Few direct keyword overlaps with the role profile.')
  }
  if (position?.mustHaveKeywords) {
    const must = String(position.mustHaveKeywords)
      .split(/[,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    const cvLower = String(cvText).toLowerCase()
    const mustHits = must.filter((m) => m.length > 1 && cvLower.includes(m))
    if (must.length) {
      reasons.push(
        mustHits.length
          ? `Must-have phrases found: ${mustHits.slice(0, 5).join(', ')}`
          : 'None of the listed must-have phrases were found verbatim in the CV text.',
      )
    }
  }
  if (position?.industry && cvLowerIncludes(cvText, position.industry)) {
    reasons.push(`Industry mention aligned: ${position.industry}`)
  }

  return { score, reasons }
}

function cvLowerIncludes(cvText, needle) {
  const n = String(needle || '').trim().toLowerCase()
  if (n.length < 2) return false
  return String(cvText || '').toLowerCase().includes(n)
}
