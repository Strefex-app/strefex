import { getIndustryQualityProfile } from '../data/industryQualityProfiles'
import { cardHasStandard, liveStandardStatus } from './iatfControlCompute'

function row(id, label, status, hint = '') {
  return { id, label, status, hint }
}

/** Match buyer RFQ requirements against live plant records. */
export function computeRfqEvidenceMatch(requirements = {}, plant = {}, industryId = 'general') {
  const reqs = requirements || {}
  const profile = getIndustryQualityProfile(industryId || plant.plantIndustry || 'general')
  const certificates = plant.certificates || []
  const documents = plant.documents || []
  const lots = plant.lots || []
  const parts = plant.parts || []
  const ppapPackages = plant.ppapPackages || []
  const checks = []

  if (reqs.ppapLevel) {
    const level = String(reqs.ppapLevel)
    const partLevels = parts.map((p) => String(p.ppapLevel || '')).filter(Boolean)
    const packApproved = ppapPackages.some((pkg) => pkg.status === 'approved' && String(pkg.level || '3') === level)
    const onFile = partLevels.includes(level) || packApproved
    checks.push(row(
      'ppap',
      `PPAP Level ${level}`,
      onFile ? 'on_file' : 'gap',
      onFile ? 'PPAP level evidenced on part or pack' : 'Add PPAP pack or set part PPAP level',
    ))
  }

  if (reqs.traceabilityRequired) {
    const hasLot = lots.length > 0
    const hasSerial = lots.some((lot) => lot.serialNumber)
    checks.push(row(
      'trace',
      'Lot / serial traceability',
      hasLot ? 'on_file' : 'gap',
      hasSerial ? 'Serial traceability on file' : hasLot ? 'Lot traceability on file' : 'Create at least one lot record',
    ))
  }

  if (reqs.imdsRequired) {
    const imdsDoc = documents.some((doc) => /imds|material declaration/i.test(`${doc.title} ${doc.notes}`))
    checks.push(row(
      'imds',
      'IMDS / material declaration',
      imdsDoc ? 'on_file' : 'gap',
      imdsDoc ? 'Material declaration document found' : 'Add material declaration to plant library',
    ))
  }

  if (reqs.iso13485Required || profile.primaryStandardId === 'iso_13485') {
    const live = liveStandardStatus(certificates, 'iso_13485')
    checks.push(row(
      'iso13485',
      'ISO 13485',
      live.status === 'valid' ? 'on_file' : 'gap',
      live.status === 'valid' ? 'Valid certificate on file' : 'Upload ISO 13485 certificate in Plant QMS',
    ))
  }

  if (reqs.designControlsRequired) {
    const dhf = documents.some((doc) => doc.type === 'dhf_record' || /design history|dhf/i.test(doc.title || ''))
    checks.push(row(
      'dhf',
      'Design history / DHF',
      dhf ? 'on_file' : 'gap',
      dhf ? 'DHF document on file' : 'Add DHF record in Company Database',
    ))
  }

  if (reqs.sterilizationValidation) {
    const val = documents.some((doc) => doc.type === 'validation_protocol' || /steril/i.test(doc.title || ''))
    checks.push(row(
      'sterilization',
      'Sterilization validation',
      val ? 'on_file' : 'gap',
      val ? 'Validation protocol on file' : 'Add validation protocol document',
    ))
  }

  if (reqs.regulatoryPath) {
    const reg = documents.some((doc) => doc.type === 'regulatory_submission')
    checks.push(row(
      'regulatory',
      `Regulatory pathway (${reqs.regulatoryPath})`,
      reg ? 'on_file' : 'gap',
      reg ? 'Regulatory submission on file' : 'Add regulatory technical file',
    ))
  }

  if (reqs.udiRequired) {
    const udi = lots.some((lot) => lot.serialNumber) || documents.some((doc) => /udi|label/i.test(doc.title || ''))
    checks.push(row(
      'udi',
      'UDI / device labeling traceability',
      udi ? 'on_file' : 'gap',
      udi ? 'Traceability or labeling record found' : 'Add serial/lot or labeling record',
    ))
  }

  if (profile.primaryStandardId === 'iatf_16949' || reqs.ppapLevel) {
    const iatf = liveStandardStatus(certificates, 'iatf_16949')
    if (iatf.status === 'valid' || reqs.ppapLevel) {
      checks.push(row(
        'iatf',
        'IATF 16949',
        iatf.status === 'valid' ? 'on_file' : 'gap',
        iatf.status === 'valid' ? 'Valid IATF certificate' : 'Upload IATF certificate',
      ))
    }
  }

  const primaryLive = liveStandardStatus(certificates, profile.primaryStandardId)
  if (!checks.some((c) => c.id === profile.primaryStandardId) && profile.primaryStandardId) {
    checks.unshift(row(
      profile.primaryStandardId,
      profile.certStandards.find((s) => s.id === profile.primaryStandardId)?.label || 'Primary standard',
      primaryLive.status === 'valid' ? 'on_file' : 'gap',
      primaryLive.status === 'valid' ? 'Primary certificate valid' : 'Upload primary industry certificate',
    ))
  }

  if (plant.publishedCard) {
    checks.push(row('published', 'Published reliability card', 'on_file', 'Visible to buyers on the Network'))
  }

  const applicable = checks.filter((c) => c.status !== 'na')
  const onFile = applicable.filter((c) => c.status === 'on_file')
  const gaps = applicable.filter((c) => c.status === 'gap')

  return {
    checks: applicable,
    onFileCount: onFile.length,
    gapCount: gaps.length,
    total: applicable.length,
    readyPercent: applicable.length ? Math.round((onFile.length / applicable.length) * 100) : 100,
    isReady: gaps.length === 0 && applicable.length > 0,
    gaps,
  }
}

export function summarizeRfqRequirements(requirements = {}) {
  const reqs = requirements || {}
  const parts = []
  if (reqs.ppapLevel) parts.push(`PPAP L${reqs.ppapLevel}`)
  if (reqs.traceabilityRequired) parts.push('Traceability')
  if (reqs.imdsRequired) parts.push('IMDS')
  if (reqs.iso13485Required) parts.push('ISO 13485')
  if (reqs.designControlsRequired) parts.push('Design controls')
  if (reqs.sterilizationValidation) parts.push('Sterilization validation')
  if (reqs.regulatoryPath) parts.push(`Regulatory: ${reqs.regulatoryPath}`)
  if (reqs.udiRequired) parts.push('UDI')
  if (reqs.ndaRequired) parts.push('NDA required')
  return parts.length ? parts.join(' · ') : 'Standard RFQ requirements'
}
