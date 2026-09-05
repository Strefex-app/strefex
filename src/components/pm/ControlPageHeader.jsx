import { Link } from 'react-router-dom'
import { ReferenceId, StatusPill } from './ProcurementRegisterTable'
import { ragMeta, stageMeta } from './controlStatus'

/**
 * SAP Fiori / Procore-style object page header: title, fact strip.
 * Address bar lives in AppLayout GlobalPageBreadcrumb.
 */
export default function ControlPageHeader({
  title,
  subtitle,
  program,
  project,
  stage,
  rag,
  reviewLabel,
  reviewOverdue,
  actions,
}) {
  const stageInfo = stageMeta(stage)
  const ragInfo = ragMeta(rag)

  return (
    <header className="pcc-page-header">
      <div className="pcc-page-header__main">
        <div className="pcc-page-header__titles min-width-0">
          <h1 className="pcc-page-header__title stx-text-wrap">{title}</h1>
          {subtitle ? <p className="pcc-page-header__subtitle stx-text-wrap">{subtitle}</p> : null}
        </div>
        {actions ? <div className="pcc-page-header__actions">{actions}</div> : null}
      </div>

      {(program || project || stage || rag || reviewLabel) ? (
        <dl className="pcc-fact-strip">
          {program ? (
            <div className="pcc-fact-strip__item">
              <dt>Program</dt>
              <dd>
                {program.href ? (
                  <Link to={program.href} className="pcc-fact-link">
                    <ReferenceId variant="neutral">{program.number}</ReferenceId>
                  </Link>
                ) : (
                  <ReferenceId variant="neutral">{program.number}</ReferenceId>
                )}
                {program.name ? <span className="pcc-fact-name stx-text-wrap">{program.name}</span> : null}
              </dd>
            </div>
          ) : null}
          {project ? (
            <div className="pcc-fact-strip__item">
              <dt>Project</dt>
              <dd>
                <ReferenceId variant="neutral">{project.number}</ReferenceId>
                {project.name ? <span className="pcc-fact-name stx-text-wrap">{project.name}</span> : null}
              </dd>
            </div>
          ) : null}
          {stage ? (
            <div className="pcc-fact-strip__item">
              <dt>Stage</dt>
              <dd><StatusPill tone={stageInfo.tone}>{stageInfo.label}</StatusPill></dd>
            </div>
          ) : null}
          {rag ? (
            <div className="pcc-fact-strip__item">
              <dt>Health</dt>
              <dd><StatusPill tone={ragInfo.tone}>{ragInfo.label}</StatusPill></dd>
            </div>
          ) : null}
          {reviewLabel ? (
            <div className="pcc-fact-strip__item">
              <dt>Review</dt>
              <dd>
                <StatusPill tone={reviewOverdue ? 'warning' : 'muted'}>{reviewLabel}</StatusPill>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </header>
  )
}
