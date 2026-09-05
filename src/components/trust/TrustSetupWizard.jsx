import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PLATFORM_HUB_INDUSTRY_SLUGS } from '../../data/platformHubIndustries'
import { getIndustryQualityProfile, primaryStandardForIndustry } from '../../data/industryQualityProfiles'
import { IATF_CONTROL_PATH } from '../../data/iatfControlCatalog'
import { COMPANY_DATABASE_PATH } from '../../data/companyDatabaseSpaces'
import useIatfControlStore from '../../store/iatfControlStore'
import { useAuthStore } from '../../store/authStore'
import { getTenantId } from '../../utils/tenantStorage'
import { buildReliabilityCard } from '../../utils/iatfControlCompute'
import { writePublishedReliability } from '../../utils/publishedReliability'
import './TrustSetupWizard.css'

const STEPS = [
  { id: 'industry', title: 'Plant industry', hint: 'Sets folder seeds and primary certificate.' },
  { id: 'certificate', title: 'Primary certificate', hint: 'Number, CB, and expiry — buyers see validity only after publish.' },
  { id: 'share', title: 'What buyers may see', hint: 'Opt in fields for your Network card.' },
  { id: 'publish', title: 'Publish & done', hint: 'One click makes your plant discoverable with evidence.' },
]

export default function TrustSetupWizard({ onComplete, compact = false }) {
  const user = useAuthStore((s) => s.user)
  const plantIndustry = useIatfControlStore((s) => s.plantIndustry) || 'general'
  const setPlantIndustry = useIatfControlStore((s) => s.setPlantIndustry)
  const certificates = useIatfControlStore((s) => s.certificates)
  const processes = useIatfControlStore((s) => s.processes)
  const lots = useIatfControlStore((s) => s.lots)
  const parts = useIatfControlStore((s) => s.parts)
  const share = useIatfControlStore((s) => s.share)
  const setShare = useIatfControlStore((s) => s.setShare)
  const addCertificate = useIatfControlStore((s) => s.addCertificate)
  const setPublishedCard = useIatfControlStore((s) => s.setPublishedCard)
  const ensureFolders = useIatfControlStore((s) => s.ensureFolders)
  const readOnly = useIatfControlStore((s) => s.isReadOnly())

  const primary = useMemo(() => primaryStandardForIndustry(plantIndustry), [plantIndustry])
  const [step, setStep] = useState(0)
  const [certForm, setCertForm] = useState({
    number: '',
    certifyingBody: '',
    expiresAt: '',
    scope: '',
  })
  const [note, setNote] = useState('')
  const [done, setDone] = useState(false)

  const hasPrimaryCert = certificates.some((c) => (
    c.standard === primary?.id && c.number && c.certifyingBody && c.expiresAt
  ))

  const goNext = () => setStep((s) => Math.min(STEPS.length - 1, s + 1))
  const goBack = () => setStep((s) => Math.max(0, s - 1))

  const handleIndustry = (slug) => {
    setPlantIndustry(slug)
    ensureFolders()
  }

  const handleSaveCert = (e) => {
    e.preventDefault()
    if (readOnly) return
    if (!certForm.number.trim() || !certForm.certifyingBody.trim() || !certForm.expiresAt) {
      setNote('Certificate number, certification body, and expiry are required.')
      return
    }
    addCertificate({
      standard: primary?.id || 'iso_9001',
      number: certForm.number.trim(),
      certifyingBody: certForm.certifyingBody.trim(),
      expiresAt: certForm.expiresAt,
      scope: certForm.scope.trim(),
      folderId: plantIndustry === 'medical' ? 'folder-06-13485' : 'folder-06-iatf',
    })
    setNote('Certificate saved.')
    goNext()
  }

  const handlePublish = () => {
    if (readOnly) return
    const card = buildReliabilityCard({
      certificates: useIatfControlStore.getState().certificates,
      processes,
      lots,
      parts,
      share,
      companyId: getTenantId(),
      companyName: user?.companyName || user?.company || '',
      industryId: plantIndustry,
    })
    setPublishedCard(card)
    writePublishedReliability(card)
    setDone(true)
    setNote('Published to the Network. Buyers see only opted-in fields.')
    onComplete?.(card)
  }

  if (done) {
    return (
      <div className={`trust-wizard${compact ? ' trust-wizard--compact' : ''}`}>
        <div className="trust-wizard__done">
          <h2 className="stx-text-heading">Trust setup complete</h2>
          <p className="stx-text-caption">
            Your plant industry is set, primary certificate is on file, and a reliability card is published.
          </p>
          <div className="trust-wizard__actions">
            <Link className="app-page-btn-primary" to={`${IATF_CONTROL_PATH}?tab=network`}>
              Review Network card
            </Link>
            <Link className="app-page-btn-outline" to={COMPANY_DATABASE_PATH}>
              Company Database
            </Link>
            <Link className="app-page-btn-outline" to="/dashboard/seller">
              Open RFQ inbox
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const current = STEPS[step]

  return (
    <div className={`trust-wizard${compact ? ' trust-wizard--compact' : ''}`}>
      <header className="trust-wizard__head">
        <div className="min-width-0">
          <h2 className="stx-text-heading">15-minute trust setup</h2>
          <p className="stx-text-caption stx-text-wrap">
            Publish once — answer buyer RFQs from plant evidence instead of email attachments.
          </p>
        </div>
        <ol className="trust-wizard__steps" aria-label="Setup steps">
          {STEPS.map((row, index) => (
            <li
              key={row.id}
              className={`trust-wizard__step${index === step ? ' is-active' : ''}${index < step ? ' is-done' : ''}`}
            >
              <span className="trust-wizard__step-n">{index + 1}</span>
              <span className="trust-wizard__step-label">{row.title}</span>
            </li>
          ))}
        </ol>
      </header>

      <section className="app-page-card trust-wizard__panel">
        <h3 className="stx-text-heading">{current.title}</h3>
        <p className="stx-text-caption">{current.hint}</p>

        {step === 0 && (
          <div className="trust-wizard__industry">
            <label className="stx-text-caption" htmlFor="trust-industry">Plant industry</label>
            <select
              id="trust-industry"
              value={plantIndustry}
              disabled={readOnly}
              onChange={(e) => handleIndustry(e.target.value)}
            >
              {PLATFORM_HUB_INDUSTRY_SLUGS.map((slug) => (
                <option key={slug} value={slug}>{getIndustryQualityProfile(slug).label}</option>
              ))}
              <option value="general">General manufacturing</option>
            </select>
            <p className="stx-text-caption">
              {getIndustryQualityProfile(plantIndustry).plantWorkspaceHint}
            </p>
            <button type="button" className="app-page-btn-primary" onClick={goNext}>
              Continue →
            </button>
          </div>
        )}

        {step === 1 && (
          <form className="trust-wizard__form" onSubmit={handleSaveCert}>
            {hasPrimaryCert && (
              <p className="app-page-alert app-page-alert--success">
                A {primary?.label} certificate is already on file. You can add another or continue.
              </p>
            )}
            <label>
              <span className="stx-text-caption">Standard</span>
              <input value={primary?.label || ''} readOnly />
            </label>
            <label>
              <span className="stx-text-caption">Certificate number *</span>
              <input
                value={certForm.number}
                onChange={(e) => setCertForm({ ...certForm, number: e.target.value })}
                required
                disabled={readOnly}
              />
            </label>
            <label>
              <span className="stx-text-caption">Certification body *</span>
              <input
                value={certForm.certifyingBody}
                onChange={(e) => setCertForm({ ...certForm, certifyingBody: e.target.value })}
                required
                disabled={readOnly}
              />
            </label>
            <label>
              <span className="stx-text-caption">Expires *</span>
              <input
                type="date"
                value={certForm.expiresAt}
                onChange={(e) => setCertForm({ ...certForm, expiresAt: e.target.value })}
                required
                disabled={readOnly}
              />
            </label>
            <label>
              <span className="stx-text-caption">Scope</span>
              <input
                value={certForm.scope}
                onChange={(e) => setCertForm({ ...certForm, scope: e.target.value })}
                placeholder="e.g. manufacture of machined parts"
                disabled={readOnly}
              />
            </label>
            <div className="trust-wizard__actions">
              <button type="button" className="app-page-btn-outline" onClick={goBack}>← Back</button>
              {hasPrimaryCert && (
                <button type="button" className="app-page-btn-outline" onClick={goNext}>Skip →</button>
              )}
              <button type="submit" className="app-page-btn-primary" disabled={readOnly}>
                Save certificate →
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <div className="trust-wizard__share">
            {[
              { key: 'shareCert', label: 'Certificate validity, CB, expiry, scope' },
              { key: 'shareProcesses', label: 'Process names' },
              { key: 'shareTraceMethod', label: 'Traceability method' },
              { key: 'sharePpap', label: 'PPAP levels in use' },
              { key: 'shareCapability', label: 'Capability record count' },
            ].map((row) => (
              <label key={row.key} className="trust-wizard__check">
                <input
                  type="checkbox"
                  checked={share[row.key] !== false}
                  disabled={readOnly}
                  onChange={(e) => setShare({ [row.key]: e.target.checked })}
                />
                <span>{row.label}</span>
              </label>
            ))}
            <p className="stx-text-caption">
              Lots, NCRs, other-customer PPAP, and drawings stay private.
            </p>
            <div className="trust-wizard__actions">
              <button type="button" className="app-page-btn-outline" onClick={goBack}>← Back</button>
              <button type="button" className="app-page-btn-primary" onClick={goNext}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="trust-wizard__publish">
            <ul className="trust-wizard__summary">
              <li>Industry: <strong>{getIndustryQualityProfile(plantIndustry).label}</strong></li>
              <li>Primary standard: <strong>{primary?.label}</strong></li>
              <li>Certificates on file: <strong>{certificates.length}</strong></li>
            </ul>
            <div className="trust-wizard__actions">
              <button type="button" className="app-page-btn-outline" onClick={goBack}>← Back</button>
              <button
                type="button"
                className="app-page-btn-primary"
                disabled={readOnly}
                onClick={handlePublish}
              >
                Publish reliability card
              </button>
            </div>
          </div>
        )}

        {note && <p className="stx-text-caption trust-wizard__note">{note}</p>}
      </section>
    </div>
  )
}
