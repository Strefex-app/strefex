import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from '../../i18n/useTranslation'
import useAuditProStore from '../../store/auditProStore'
import { formatAuditDateLabel } from '../../utils/companyExternalAudit'
import { sellerSiteCode } from '../../utils/auditorsAssignmentPool'
import { auditorCode } from '../../utils/auditProgrammeViews'
import {
  STANDARD_INDUSTRY_FILTERS,
  flattenQuestionnaireRows,
  questionnairePrintSheets,
  industryStandardsCatalogue,
  questionnaireFormCode,
  standardMatchesFilter,
} from '../../utils/auditStandardsCatalogue'
import { AuditProChecklistDocument } from './AuditProPrintDocuments'

export default function AuditProStandards() {
  const { language } = useTranslation()
  const [params, setParams] = useSearchParams()
  const filter = params.get('family') || 'ALL'
  const selectedName = params.get('std') || ''
  const audits = useAuditProStore((s) => s.audits)
  const auditors = useAuditProStore((s) => s.auditors)
  const suppliers = useAuditProStore((s) => s.suppliers)

  const catalogue = useMemo(
    () => industryStandardsCatalogue(filter, language),
    [filter, language],
  )

  const selected = catalogue.find((row) => row.standard === selectedName) || catalogue[0] || null
  const questions = selected ? flattenQuestionnaireRows(selected.questionnaire) : []
  const printSheets = questionnairePrintSheets(questions)
  const formCode = selected ? questionnaireFormCode(selected.standard) : ''
  const issued = new Date().toISOString().slice(0, 10)

  const visit = useMemo(() => {
    if (!selected) return null
    const match = (audits || []).find((a) => String(a.standard || '') === selected.standard)
    if (!match) return null
    const supplier = (suppliers || []).find((s) => s.id === match.supplierId)
    const auditor = (auditors || []).find((a) => a.id === match.auditorId)
    return {
      supplierLabel: supplier
        ? `${supplier.name} · ${sellerSiteCode(supplier)}`
        : '',
      site: [supplier?.country, supplier?.city].filter(Boolean).join(' · '),
      auditDate: formatAuditDateLabel(match.plannedDate || match.completedDate) || '',
      auditorLabel: auditor ? `${auditor.name} · ${auditorCode(auditor)}` : '',
    }
  }, [selected, audits, auditors, suppliers])

  const setFilter = (id) => {
    const next = new URLSearchParams(params)
    next.set('family', id)
    if (selected && !standardMatchesFilter(selected, id)) next.delete('std')
    setParams(next, { replace: true })
  }

  const selectStandard = (name) => {
    const next = new URLSearchParams(params)
    next.set('std', name)
    setParams(next, { replace: true })
  }

  const printChecklist = () => {
    const root = document.documentElement
    const media = window.matchMedia?.('print')
    const done = () => {
      root.classList.remove('ap-print-checklist')
      window.removeEventListener('afterprint', done)
      media?.removeEventListener?.('change', onChange)
    }
    const onChange = (event) => {
      if (!event.matches) done()
    }
    root.classList.add('ap-print-checklist')
    window.addEventListener('afterprint', done)
    media?.addEventListener?.('change', onChange)
    window.print()
  }

  return (
    <div className="ap-std">
      <header className="ap-std-hero ap-std-screen">
        <p className="ap-std-note stx-text-wrap">
          Question sets are STREFEX-authored and mapped to clause references. They do not reproduce the requirement text of the standards, which remains the copyright of the issuing body.
        </p>
      </header>

      <div className="ap-std-filters ap-std-screen" role="tablist" aria-label="Industry">
        {STANDARD_INDUSTRY_FILTERS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={filter === chip.id}
            className={`ap-std-chip${filter === chip.id ? ' is-on' : ''}`}
            onClick={() => setFilter(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {!selected ? (
        <p className="ap-auditor-empty ap-std-screen">No standards in this filter.</p>
      ) : (
        <div className="ap-std-split ap-std-screen">
          <aside className="ap-std-list" aria-label="Standards">
            {catalogue.map((row) => (
              <button
                key={row.standard}
                type="button"
                className={`ap-std-item${row.standard === selected.standard ? ' is-on' : ''}`}
                onClick={() => selectStandard(row.standard)}
              >
                <span className="ap-std-item-name stx-text-wrap">{row.standard}</span>
                <span className="ap-std-item-meta">{row.family} · {row.questionCount} questions</span>
              </button>
            ))}
          </aside>

          <section className="ap-std-detail" aria-label={selected.standard}>
            <div className="ap-std-detail-head">
              <div>
                <h3 className="ap-std-detail-title stx-text-wrap">{selected.standard}</h3>
                <p className="ap-std-detail-meta">
                  {selected.family} · {selected.questionCount} questions · Conform / observation / minor / major
                </p>
                <p className="ap-std-detail-lead stx-text-wrap">{selected.lead}</p>
                <p className="ap-std-detail-structure stx-text-wrap"><strong>Structure:</strong> {selected.structure}</p>
              </div>
              <button type="button" className="app-page-btn-primary ap-std-print-btn" onClick={printChecklist}>
                Print audit checklist
              </button>
            </div>

            <div className="ap-std-table-wrap">
              {questions.length === 0 ? (
                <p className="ap-auditor-empty" style={{ padding: 16 }}>No questions mapped for this standard yet.</p>
              ) : (
              <table className="ap-std-table">
                <colgroup>
                  <col className="ap-std-col-clause" />
                  <col className="ap-std-col-element" />
                  <col className="ap-std-col-q" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Clause</th>
                    <th>Element</th>
                    <th>Question &amp; what to look at</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((row) => (
                    <tr key={row.id}>
                      <td className="ap-std-clause">{row.clause}</td>
                      <td className="ap-std-element stx-text-wrap">{row.element}</td>
                      <td className="ap-std-question">
                        <div className="ap-std-q stx-text-wrap">{row.text}</div>
                        {row.lookAt ? <div className="ap-std-look stx-text-wrap">Look at: {row.lookAt}</div> : null}
                        {row.docs.length ? (
                          <ul className="ap-std-docs">
                            {row.docs.map((doc) => (
                              <li key={doc}>Reference: {doc}</li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              )}
            </div>

            <div className="ap-std-score">
              <div className="ap-std-score-kicker">Scoring anchors</div>
              <div className="ap-std-score-grid">
                {selected.scoring.map((anchor) => (
                  <article key={anchor.id} className={`ap-std-score-card ap-std-score-card--${anchor.tone}`}>
                    <div className="ap-std-score-label">
                      {anchor.label}
                      {anchor.score != null ? ` · ${anchor.score}` : ''}
                    </div>
                    <p className="ap-std-score-copy stx-text-wrap">{anchor.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {selected ? (
        <div className="ap-std-print-root" aria-hidden="true">
          {printSheets.map((sheet, index) => (
            <div className="ap-doc-sheet ap-check-sheet" key={`${selected.standard}-${sheet.kind}-${index}`}>
              <AuditProChecklistDocument
                variant={sheet.kind}
                standard={selected.standard}
                family={selected.family}
                questions={sheet.questions}
                formCode={formCode}
                issued={issued}
                page={index + 1}
                pageCount={printSheets.length}
                questionCount={selected.questionCount}
                supplierLabel={visit?.supplierLabel}
                site={visit?.site}
                auditDate={visit?.auditDate}
                auditorLabel={visit?.auditorLabel}
                signatories={[
                  { role: 'Lead auditor', name: visit?.auditorLabel || '\u00a0' },
                  { role: 'Supplier representative', name: visit?.supplierLabel || '\u00a0' },
                  { role: 'Head of Supplier Quality', name: 'STREFEX' },
                ]}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
