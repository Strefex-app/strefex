export function buildInitialResponses(questionnaire) {
  const responses = {}
  if (!questionnaire?.categories) return responses
  questionnaire.categories.forEach((cat) => {
    cat.questions.forEach((q) => {
      responses[q.id] = { score: 0, notes: '', finding: false, findingText: '' }
    })
  })
  return responses
}

export function calculateQuestionnaireScores(questionnaire, responses) {
  if (!questionnaire?.categories) {
    return { total: 0, max: 0, percentage: 0, categories: {} }
  }

  let totalScore = 0
  let maxScore = 0
  const categoryScores = {}

  questionnaire.categories.forEach((cat) => {
    let catTotal = 0
    let catMax = 0
    cat.questions.forEach((q) => {
      catTotal += responses[q.id]?.score || 0
      catMax += q.maxScore
    })
    categoryScores[cat.id] = {
      score: catTotal,
      max: catMax,
      percentage: catMax > 0 ? Math.round((catTotal / catMax) * 100) : 0,
    }
    totalScore += catTotal
    maxScore += catMax
  })

  return {
    total: totalScore,
    max: maxScore,
    percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
    categories: categoryScores,
  }
}

export function countFindings(responses) {
  return Object.values(responses).filter((r) => r.finding).length
}

export function getScoreClass(percentage) {
  if (percentage >= 85) return 'excellent'
  if (percentage >= 70) return 'good'
  if (percentage >= 50) return 'average'
  return 'poor'
}

/** Overlay persisted answers onto the current template (drops answers for removed questions). */
export function mergeSavedResponses(questionnaire, saved) {
  const base = buildInitialResponses(questionnaire)
  if (!saved || typeof saved !== 'object') return base
  Object.keys(base).forEach((k) => {
    const s = saved[k]
    if (s && typeof s === 'object') {
      base[k] = {
        score: typeof s.score === 'number' ? s.score : base[k].score,
        notes: s.notes != null ? String(s.notes) : base[k].notes,
        finding: Boolean(s.finding),
        findingText: s.findingText != null ? String(s.findingText) : base[k].findingText,
      }
    }
  })
  return base
}
