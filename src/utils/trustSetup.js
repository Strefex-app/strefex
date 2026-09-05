import useIatfControlStore from '../store/iatfControlStore'
import { isCertOnFile } from './iatfControlCompute'

/** True when plant should see the 15-minute trust setup wizard. */
export function needsTrustSetup(state = null) {
  const s = state || useIatfControlStore.getState()
  if (s.publishedCard?.publishedAt) return false
  const hasCert = (s.certificates || []).some(isCertOnFile)
  return !hasCert || !s.publishedCard
}

export function trustSetupProgress(state = null) {
  const s = state || useIatfControlStore.getState()
  let done = 0
  if (s.plantIndustry && s.plantIndustry !== 'general') done += 1
  else if (s.plantIndustry) done += 1
  if ((s.certificates || []).some(isCertOnFile)) done += 1
  if (s.publishedCard?.publishedAt) done += 1
  return { done, total: 3, percent: Math.round((done / 3) * 100) }
}
