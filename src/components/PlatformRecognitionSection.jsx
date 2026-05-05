import { useEffect, useMemo, useCallback, useRef } from 'react'
import {
  evaluatePlatformRecognition,
  serializePlatformRecognitionStore,
} from '../services/platformRecognitionService'
import { isSupabaseConfigured } from '../config/supabase'
import { companiesService } from '../services/supabaseService'
import {
  useCompanyRecognitionStore,
  PLATFORM_AUDIT_STANDARDS,
  PLATFORM_AUDIT_INDUSTRIES,
} from '../store/companyRecognitionStore'
import { PROFILE_ATTACHMENT_SLOT_LABELS, PROFILE_ATTACHMENT_SLOT } from '../constants/companyProfileDirectory'

const PDF_PPT_ACCEPT =
  '.pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'

export default function PlatformRecognitionSection({
  tenant,
  user,
  isAdmin,
  setTenant,
}) {
  const patchFromTenantPrefill = useCompanyRecognitionStore((s) => s.patchFromTenantPrefill)
  const mergeFromServer = useCompanyRecognitionStore((s) => s.mergeFromServer)
  const storeSnap = useCompanyRecognitionStore((s) => s)

  const setField = useCompanyRecognitionStore((s) => s.setField)
  const setDeclaredFile = useCompanyRecognitionStore((s) => s.setDeclaredFile)
  const clearDeclaredFile = useCompanyRecognitionStore((s) => s.clearDeclaredFile)
  const addDepartment = useCompanyRecognitionStore((s) => s.addDepartment)
  const removeDepartment = useCompanyRecognitionStore((s) => s.removeDepartment)
  const updateDepartment = useCompanyRecognitionStore((s) => s.updateDepartment)
  const toggleAuditStandard = useCompanyRecognitionStore((s) => s.toggleAuditStandard)
  const toggleAuditIndustry = useCompanyRecognitionStore((s) => s.toggleAuditIndustry)

  const mergedTenantForEval = useMemo(() => {
    const mergedRec = serializePlatformRecognitionStore(storeSnap)
    return {
      ...tenant,
      metadata: {
        ...(tenant?.metadata || {}),
        platform_recognition: mergedRec,
      },
    }
  }, [tenant, storeSnap])

  const cloudSignature = useMemo(
    () => JSON.stringify(serializePlatformRecognitionStore(storeSnap)),
    [storeSnap],
  )

  const evaluation = useMemo(
    () => evaluatePlatformRecognition({ tenant: mergedTenantForEval, user, store: storeSnap }),
    [mergedTenantForEval, user, storeSnap],
  )

  const mergedFingerprintRef = useRef('')

  useEffect(() => {
    mergedFingerprintRef.current = ''
  }, [tenant?.id])

  useEffect(() => {
    patchFromTenantPrefill(tenant)
    const srv = tenant?.metadata?.platform_recognition
    if (!srv || typeof srv !== 'object' || Object.keys(srv).length === 0) return
    try {
      const fp = `${tenant?.id || 'no-id'}:${JSON.stringify(srv)}`
      if (mergedFingerprintRef.current === fp) return
      mergeFromServer(srv)
      mergedFingerprintRef.current = fp
    } catch {
      mergeFromServer(srv)
    }
  }, [tenant, mergeFromServer, patchFromTenantPrefill])

  const persistToCloud = useCallback(async () => {
    if (!isAdmin || !tenant?.id || !isSupabaseConfigured) return
    const blob = serializePlatformRecognitionStore(useCompanyRecognitionStore.getState())
    try {
      const updated = await companiesService.update(tenant.id, {
        metadata: {
          ...(tenant.metadata || {}),
          platform_recognition: blob,
        },
      })
      setTenant?.((prev) => ({
        ...(prev || {}),
        metadata: updated?.metadata ?? {
          ...(prev?.metadata || {}),
          platform_recognition: blob,
        },
      }))
    } catch {
      /* silent */
    }
  }, [isAdmin, tenant?.id, tenant?.metadata, setTenant])

  const debouncedCloudRef = useRef(null)

  useEffect(() => {
    if (!isAdmin || !tenant?.id || !isSupabaseConfigured) return
    clearTimeout(debouncedCloudRef.current)
    debouncedCloudRef.current = setTimeout(() => {
      persistToCloud()
    }, 1200)
    return () => clearTimeout(debouncedCloudRef.current)
  }, [cloudSignature, isAdmin, tenant?.id, persistToCloud])

  const disableInputs = !isAdmin
  const missing = evaluation.missingForFiveStars || []
  const recognitionSlotHint = PROFILE_ATTACHMENT_SLOT_LABELS[PROFILE_ATTACHMENT_SLOT.COMPANY_PROFILE_DOC]
  const portfolioSlotHint = PROFILE_ATTACHMENT_SLOT_LABELS[PROFILE_ATTACHMENT_SLOT.PRODUCT_PORTFOLIO_DOC]

  function renderDeclaredRow(key, label) {
    return (
      <div className="prof-declared-row">
        <span className="prof-declared-label">{label}</span>
        {storeSnap.declaredDocs[key]?.fileName ? (
          <span className="prof-declared-name">{storeSnap.declaredDocs[key].fileName}</span>
        ) : null}
        <div className="prof-declared-actions">
          {!disableInputs && (
            <label className="prof-btn-outline prof-declared-upload">
              Choose PDF or PowerPoint
              <input
                type="file"
                className="prof-hidden-input"
                accept={PDF_PPT_ACCEPT}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setDeclaredFile(key, f)
                  e.target.value = ''
                }}
              />
            </label>
          )}
          {!disableInputs && storeSnap.declaredDocs[key]?.fileName && (
            <button type="button" className="prof-btn-outline" onClick={() => clearDeclaredFile(key)}>
              Clear
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="prof-card prof-recog-card">
      <div className="prof-recog-head">
        <div className="prof-recog-head-lead">
          <h3 className="prof-card-title">Platform recognition</h3>
          <p className="prof-card-subtitle">
            Complete your company dossier across legal, operational, capability, portfolio, and audit footprint.
            Recognition is computed from information you provide plus documents linked under Edit Company Information
            when uploads are configured.
          </p>
          <div
            className="prof-recog-starwrap"
            tabIndex={0}
            aria-describedby={missing.length ? 'recognition-star-tip' : undefined}
          >
            <div className="prof-recog-stars-hit" aria-label={`${evaluation.stars} stars out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={n <= evaluation.stars ? 'prof-star prof-star--gold' : 'prof-star prof-star--dim'}
                >
                  ★
                </span>
              ))}
              <span className="prof-recog-pct">
                {evaluation.percent}% · {evaluation.filled}/{evaluation.total} items
              </span>
              <span className="prof-recog-stars-hint">Hover for checklist</span>
            </div>
            {missing.length > 0 ? (
              <div id="recognition-star-tip" className="prof-recog-star-pop" role="tooltip">
                <p className="prof-recog-star-pop-title">Outstanding for five golden stars</p>
                <ul className="prof-recog-star-pop-list">
                  {missing.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!isAdmin && (
        <div className="prof-recog-readonly-banner" role="status">
          Read-only overview. Ask a company administrator to edit recognition fields if something should change.
        </div>
      )}

      <div className="prof-recog-body">
        <div className="prof-recog-col">
          <details className="prof-recog-acc">
            <summary>Legal identity & contacts</summary>
            <div className="prof-form-grid prof-recog-fields">
              <div className="prof-form-group full">
                <label className="prof-form-label">Registration (legal entity) name</label>
                <input
                  className="prof-form-input"
                  disabled={disableInputs}
                  value={storeSnap.registrationLegalName}
                  onChange={(e) => setField('registrationLegalName', e.target.value)}
                  placeholder="As on commercial register documents"
                />
              </div>
              <div className="prof-form-group full">
                <label className="prof-form-label">Registered address — street / postal</label>
                <input
                  className="prof-form-input"
                  disabled={disableInputs}
                  value={storeSnap.addressLineOverride}
                  onChange={(e) => setField('addressLineOverride', e.target.value)}
                  placeholder="If different from tenant address in Company Information"
                />
              </div>
              <div className="prof-form-group">
                <label className="prof-form-label">Country</label>
                <input
                  className="prof-form-input"
                  disabled={disableInputs}
                  value={storeSnap.countryOverride}
                  onChange={(e) => setField('countryOverride', e.target.value)}
                />
              </div>
              <div className="prof-form-group">
                <label className="prof-form-label">City</label>
                <input
                  className="prof-form-input"
                  disabled={disableInputs}
                  value={storeSnap.cityOverride}
                  onChange={(e) => setField('cityOverride', e.target.value)}
                />
              </div>
              <div className="prof-form-group full">
                <label className="prof-form-label">Primary business phone override</label>
                <input
                  className="prof-form-input"
                  disabled={disableInputs}
                  value={storeSnap.contactPhoneOverride}
                  onChange={(e) => setField('contactPhoneOverride', e.target.value)}
                  placeholder="If different from profile phone"
                />
              </div>
              <div className="prof-form-group full">
                <label className="prof-form-label">License categories & certifications</label>
                <textarea
                  className="prof-form-input prof-recog-textarea prof-recog-textarea--m"
                  rows={4}
                  disabled={disableInputs}
                  value={storeSnap.licenseCertifications}
                  onChange={(e) => setField('licenseCertifications', e.target.value)}
                  placeholder="Industry permits, aerospace approvals, Nadcap scopes, welding qualifications, ISO scope certificates…"
                />
              </div>
            </div>
          </details>

          <details className="prof-recog-acc">
            <summary>Optional company profile file</summary>
            <p className="prof-recog-hint">
              Secured uploads: Edit Company Information — slot &quot;{recognitionSlotHint}&quot;.
            </p>
            {renderDeclaredRow(
              'companyProfile',
              'Local placeholder (PDF or PowerPoint)',
            )}
          </details>

          <details className="prof-recog-acc">
            <summary>Organization structure</summary>
            <p className="prof-recog-hint">Department or cost-center name plus headcount.</p>
            <div className="prof-recog-dept-wrap">
              {storeSnap.departments.map((row) => (
                <div key={row.id} className="prof-recog-dept-row">
                  <input
                    className="prof-form-input"
                    disabled={disableInputs}
                    placeholder="Department"
                    value={row.name}
                    onChange={(e) => updateDepartment(row.id, { name: e.target.value })}
                  />
                  <input
                    className="prof-form-input prof-recog-num"
                    disabled={disableInputs}
                    type="number"
                    min={1}
                    placeholder="#"
                    value={row.headcount}
                    onChange={(e) => updateDepartment(row.id, { headcount: e.target.value })}
                  />
                  {!disableInputs && storeSnap.departments.length > 1 && (
                    <button type="button" className="prof-icon-btn danger" onClick={() => removeDepartment(row.id)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              {!disableInputs && (
                <button type="button" className="prof-btn-outline" onClick={addDepartment}>
                  Add department
                </button>
              )}
            </div>
          </details>
        </div>

        <div className="prof-recog-col">
          <details className="prof-recog-acc">
            <summary>Product portfolio</summary>
            <div className="prof-recog-field-stack">
              <div className="prof-form-group full">
                <label className="prof-form-label">Written list — one headline per line</label>
                <textarea
                  className="prof-form-input prof-recog-textarea prof-recog-textarea--l"
                  rows={6}
                  disabled={disableInputs}
                  value={storeSnap.productPortfolioText}
                  onChange={(e) => setField('productPortfolioText', e.target.value)}
                  placeholder={'e.g. "Precision turned shafts ø2–120 mm"'}
                />
              </div>
              <p className="prof-recog-hint prof-recog-hint--tight">
                Secured uploads: Edit Company Information — slot &quot;{portfolioSlotHint}&quot;.
              </p>
              {renderDeclaredRow('productPortfolio', 'Optional portfolio file (PDF or PowerPoint)')}
            </div>
          </details>

          <details className="prof-recog-acc">
            <summary>Capabilities & manufacturing</summary>
            <div className="prof-form-grid prof-recog-fields">
              <div className="prof-form-group full">
                <label className="prof-form-label">Machine park & key capabilities</label>
                <textarea
                  className="prof-form-input prof-recog-textarea prof-recog-textarea--m"
                  rows={4}
                  disabled={disableInputs}
                  value={storeSnap.machinePark}
                  onChange={(e) => setField('machinePark', e.target.value)}
                  placeholder="Turning centers, stamping lines, presses, CMM assets, robotics, coatings…"
                />
              </div>
              <div className="prof-form-group full">
                <label className="prof-form-label">Manufacturing capacity & flexibility</label>
                <textarea
                  className="prof-form-input prof-recog-textarea prof-recog-textarea--m"
                  rows={4}
                  disabled={disableInputs}
                  value={storeSnap.manufacturingCapabilities}
                  onChange={(e) => setField('manufacturingCapabilities', e.target.value)}
                  placeholder="Availability (shifts/tooling readiness), bottleneck processes…"
                />
              </div>
              <div className="prof-form-group">
                <label className="prof-form-label">Avg. lead time (calendar days)</label>
                <input
                  className="prof-form-input"
                  disabled={disableInputs}
                  type="number"
                  min={0}
                  placeholder="e.g. 35"
                  value={storeSnap.leadTimeAvgDays}
                  onChange={(e) => setField('leadTimeAvgDays', e.target.value)}
                />
              </div>
              <div className="prof-form-group full">
                <label className="prof-form-label">Lead time nuances / ranges</label>
                <input
                  className="prof-form-input"
                  disabled={disableInputs}
                  value={storeSnap.leadTimeNote}
                  onChange={(e) => setField('leadTimeNote', e.target.value)}
                  placeholder="Proto vs series, seasonal peaks…"
                />
              </div>
            </div>
          </details>

          <details className="prof-recog-acc">
            <summary>Audit posture & certifications log</summary>
            <div className="prof-recog-audit-body">
              <p className="prof-recog-micro">Frameworks & schemes you maintain or are certified to</p>
              <div className="prof-recog-chips">
                {PLATFORM_AUDIT_STANDARDS.map((opt) => (
                  <label key={opt.id} className="prof-recog-chip">
                    <input
                      type="checkbox"
                      disabled={disableInputs}
                      checked={storeSnap.auditStandards.includes(opt.id)}
                      onChange={() => toggleAuditStandard(opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <p className="prof-recog-sub">Industry scopes</p>
              <div className="prof-recog-chips">
                {PLATFORM_AUDIT_INDUSTRIES.map((opt) => (
                  <label key={opt.id} className="prof-recog-chip">
                    <input
                      type="checkbox"
                      disabled={disableInputs}
                      checked={storeSnap.auditIndustryFocus.includes(opt.id)}
                      onChange={() => toggleAuditIndustry(opt.id)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <div className="prof-form-group full prof-recog-notes-group">
                <label className="prof-form-label">Audit footprint & evidence notes</label>
                <textarea
                  className="prof-form-input prof-recog-textarea prof-recog-textarea--l"
                  rows={6}
                  disabled={disableInputs}
                  value={storeSnap.auditLogsDetail}
                  onChange={(e) => setField('auditLogsDetail', e.target.value)}
                  placeholder="Last customer audits, certificate numbers, expiry, surveillance schedule…"
                />
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
