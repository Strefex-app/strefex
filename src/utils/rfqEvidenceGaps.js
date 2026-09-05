import {
  liveStandardStatus,
  inferTraceMethod,
} from './iatfControlCompute'
import {
  filterStandardForIndustry,
  getIndustryQualityProfile,
} from '../data/industryQualityProfiles'

/**
 * Compare an RFQ's quality asks against plant records (certificates, parts, lots).
 * Used in the manufacturer RFQ inbox so sellers answer faster with fewer surprises.
 */
export function analyzeRfqEvidenceGaps({
  rfq = {},
  certificates = [],
  parts = [],
  lots = [],
  publishedCard = null,
} = {}) {
  const industryId = rfq.industryId || 'general'
  const profile = getIndustryQualityProfile(industryId)
  const primary = filterStandardForIndustry(industryId)
  const requirements = rfq.requirements || {}
  const checks = []

  const primaryLive = liveStandardStatus(certificates, primary?.id || profile.primaryStandardId)
  const primaryOnFile = primaryLive.status === 'valid'
    || Boolean(publishedCard?.standards?.[primary?.id]?.valid)
    || (primary?.id === 'iatf_16949' && publishedCard?.iatfValid)
    || (primary?.id === 'iso_13485' && publishedCard?.iso13485Valid)
    || (primary?.id === 'iso_9001' && publishedCard?.iso9001Valid)

  checks.push({
    id: 'primary_cert',
    label: `${primary?.label || 'Primary standard'} certificate`,
    required: true,
    status: primaryOnFile ? 'on_file' : 'gap',
    hint: primaryOnFile
      ? (primaryLive.cert?.expiresAt ? `Valid · expires ${primaryLive.cert.expiresAt}` : 'On file')
      : 'Upload and publish a valid certificate in Plant QMS',
  })

  if (requirements.iso13485Required) {
    const live = liveStandardStatus(certificates, 'iso_13485')
    const ok = live.status === 'valid' || publishedCard?.iso13485Valid
    checks.push({
      id: 'iso_13485',
      label: 'ISO 13485 required by RFQ',
      required: true,
      status: ok ? 'on_file' : 'gap',
      hint: ok ? 'On file' : 'Buyer asked for ISO 13485 — add to certificate vault',
    })
  }

  if (requirements.ppapLevel) {
    const level = String(requirements.ppapLevel)
    const matching = (parts || []).filter((p) => String(p.ppapLevel || '') === level)
    const approved = matching.some((p) => p.ppapStatus === 'approved')
    const anyLevel = (parts || []).some((p) => p.ppapLevel)
    checks.push({
      id: 'ppap',
      label: `PPAP level ${level}`,
      required: true,
      status: approved ? 'on_file' : anyLevel ? 'partial' : 'gap',
      hint: approved
        ? `Approved PPAP L${level} on a part master`
        : anyLevel
          ? 'PPAP levels exist but not approved at requested level'
          : 'No PPAP status on part masters yet',
    })
  }

  if (requirements.traceabilityRequired || requirements.udiRequired) {
    const method = publishedCard?.traceMethod || inferTraceMethod(lots)
    const ok = method && method !== 'none'
    checks.push({
      id: 'trace',
      label: requirements.udiRequired ? 'UDI / device labeling traceability' : 'Lot / serial traceability',
      required: true,
      status: ok ? 'on_file' : 'gap',
      hint: ok ? `Plant evidences ${method} traceability` : 'No lot or serial evidence in plant lots yet',
    })
  }

  if (requirements.imdsRequired) {
    checks.push({
      id: 'imds',
      label: 'IMDS / substance declaration',
      required: true,
      status: 'manual',
      hint: 'Confirm IMDS submission readiness before quoting',
    })
  }

  if (requirements.designControlsRequired) {
    checks.push({
      id: 'design',
      label: 'Design history / DMR',
      required: true,
      status: 'manual',
      hint: 'Confirm DHF/DMR pack is available in Company Database',
    })
  }

  if (requirements.ndaRequired) {
    checks.push({
      id: 'nda',
      label: 'NDA before drawings',
      required: true,
      status: 'manual',
      hint: 'Buyer requires NDA acceptance before attachments are released',
    })
  }

  const gaps = checks.filter((c) => c.status === 'gap')
  const onFile = checks.filter((c) => c.status === 'on_file')
  const readyPercent = checks.length
    ? Math.round((onFile.length / checks.length) * 100)
    : 100

  return {
    industryId,
    primaryStandardLabel: primary?.label || 'Primary standard',
    checks,
    gaps,
    onFileCount: onFile.length,
    gapCount: gaps.length,
    readyPercent,
    isReady: gaps.length === 0,
  }
}
