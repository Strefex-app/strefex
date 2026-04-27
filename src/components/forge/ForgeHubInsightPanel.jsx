import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '../Icon'
import { FORGE_PATHS, forgeSpacePath, FORGE_SEGMENT_MEMBERSHIP_ONBOARDING } from '../../constants/forgeSpaceRoutes'
import { FORGE_HUB_REFRESH } from '../../lib/forgeHubEvents'
import { FOUNDING_MEMBER_DEFAULTS } from '../../lib/forgeMembershipLogic'
import {
  getForgeStageLabel,
  listTypedCandidatesAndRosterMembers,
  listOngoingOnboarding,
  listScoreComparisonRows,
  listOpenProjectsWithAssignees,
  listPendingNominationReviews,
  listFoundersAndVotingRoster,
} from '../../lib/forgeHubInsightLists'

/** @typedef {(key: string, def?: string) => string} TFn */

export const FORGE_INSIGHT_QUERY = 'insight'

const INSIGHT_IDS = ['typed-members', 'onboarding', 'score', 'projects', 'reviews', 'cases']

/** @param {string | null} v */
export function isForgeHubInsightId(v) {
  return typeof v === 'string' && INSIGHT_IDS.includes(v)
}

/**
 * @param {{ insightId: string | null, onClose: () => void, navigate: (path: string) => void, averageComposite: number | null, t: TFn }} props
 */
export default function ForgeHubInsightPanel({ insightId, onClose, navigate, averageComposite, t }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!insightId) return undefined
    const bump = () => setTick((x) => x + 1)
    const onStorage = (e) => {
      if (e.key && e.key.startsWith('forge-v1')) bump()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(FORGE_HUB_REFRESH, bump)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(FORGE_HUB_REFRESH, bump)
    }
  }, [insightId])

  useEffect(() => {
    if (!insightId) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [insightId, onClose])

  const caseHref = useCallback(
    (id) => `${forgeSpacePath(FORGE_SEGMENT_MEMBERSHIP_ONBOARDING)}?case=${encodeURIComponent(id)}`,
    [],
  )

  const body = useMemo(() => {
    if (!insightId || !isForgeHubInsightId(insightId)) return null

    if (insightId === 'typed-members') {
      const { typed, rosterMembers } = listTypedCandidatesAndRosterMembers()
      return (
        <>
          <p className="forge-hub-insight-lead">
            {t(
              'forge.hub.insight.typedLead',
              'People with a membership type from onboarding (assignable to projects) and members saved at community registration.',
            )}
          </p>
          <h3 className="forge-hub-insight-h3">{t('forge.hub.insight.typedSection', 'Typed candidates (onboarding)')}</h3>
          {!typed.length ? (
            <p className="forge-hub-insight-empty">{t('forge.hub.insight.typedEmpty', 'No assessments with Founding or Club type yet.')}</p>
          ) : (
            <table className="forge-hub-insight-table">
              <thead>
                <tr>
                  <th>{t('forge.hub.insight.colName', 'Name')}</th>
                  <th>{t('forge.hub.insight.colType', 'Type')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {typed.map((row) => (
                  <tr key={row.assessmentId}>
                    <td>{row.name}</td>
                    <td>{row.memberTypeLabel}</td>
                    <td className="forge-hub-insight-actions">
                      <button type="button" className="forge-hub-insight-link" onClick={() => navigate(caseHref(row.assessmentId))}>
                        {t('forge.hub.insight.openCase', 'Open case')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 className="forge-hub-insight-h3">{t('forge.hub.insight.rosterSection', 'Community members (roster)')}</h3>
          {!rosterMembers.length ? (
            <p className="forge-hub-insight-empty">{t('forge.hub.insight.rosterEmpty', 'No registered members in the roster yet.')}</p>
          ) : (
            <ul className="forge-hub-insight-bullets">
              {rosterMembers.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          )}
        </>
      )
    }

    if (insightId === 'onboarding') {
      const rows = listOngoingOnboarding()
      return (
        <>
          <p className="forge-hub-insight-lead">
            {t('forge.hub.insight.onboardingLead', 'Assessments still in nomination review or pre-screening (no final outcome yet).')}
          </p>
          {!rows.length ? (
            <p className="forge-hub-insight-empty">{t('forge.hub.insight.onboardingEmpty', 'No ongoing onboarding cases in these stages.')}</p>
          ) : (
            <table className="forge-hub-insight-table">
              <thead>
                <tr>
                  <th>{t('forge.hub.insight.colName', 'Name')}</th>
                  <th>{t('forge.hub.insight.colStage', 'Stage')}</th>
                  <th>{t('forge.hub.insight.colScore', 'Score')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{getForgeStageLabel(row.stage)}</td>
                    <td>{row.composite > 0 ? row.composite.toFixed(2) : '—'}</td>
                    <td className="forge-hub-insight-actions">
                      <button type="button" className="forge-hub-insight-link" onClick={() => navigate(caseHref(row.id))}>
                        {t('forge.hub.insight.openCase', 'Open case')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )
    }

    if (insightId === 'score') {
      const rows = listScoreComparisonRows(averageComposite)
      const avgLabel =
        averageComposite != null && !Number.isNaN(averageComposite) ? averageComposite.toFixed(2) : '—'
      return (
        <>
          <p className="forge-hub-insight-lead">
            {t('forge.hub.insight.scoreLead', 'Average composite across saved assessments with a score, and each member compared to that average.')}
          </p>
          <div className="forge-hub-insight-kpi">
            <span className="forge-hub-insight-kpi-label">{t('forge.hub.insight.avgComposite', 'Average composite')}</span>
            <span className="forge-hub-insight-kpi-value">
              {avgLabel} {averageComposite != null ? '/ 5.0' : ''}
            </span>
          </div>
          {!rows.length ? (
            <p className="forge-hub-insight-empty">{t('forge.hub.insight.scoreEmpty', 'No scored assessments yet.')}</p>
          ) : (
            <table className="forge-hub-insight-table forge-hub-insight-table--wide">
              <thead>
                <tr>
                  <th>{t('forge.hub.insight.colName', 'Name')}</th>
                  <th>{t('forge.hub.insight.colStage', 'Stage')}</th>
                  <th>{t('forge.hub.insight.colComposite', 'Composite')}</th>
                  <th>{t('forge.hub.insight.colVsAvg', 'vs average')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{getForgeStageLabel(row.stage)}</td>
                    <td>{row.composite.toFixed(2)}</td>
                    <td>
                      {row.delta != null ? (row.delta >= 0 ? `+${row.delta.toFixed(2)}` : row.delta.toFixed(2)) : '—'}
                    </td>
                    <td className="forge-hub-insight-actions">
                      <button type="button" className="forge-hub-insight-link" onClick={() => navigate(caseHref(row.id))}>
                        {t('forge.hub.insight.openCase', 'Open case')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )
    }

    if (insightId === 'projects') {
      const rows = listOpenProjectsWithAssignees()
      return (
        <>
          <p className="forge-hub-insight-lead">
            {t(
              'forge.hub.insight.projectsLead',
              'Projects that are not done or closed, with assignees from membership onboarding (one or more per project).',
            )}
          </p>
          <p className="forge-hub-insight-toolbar">
            <button type="button" className="forge-hub-insight-primary" onClick={() => navigate(FORGE_PATHS.projects)}>
              {t('forge.hub.insight.openProjectsPage', 'Open Projects')}
            </button>
          </p>
          {!rows.length ? (
            <p className="forge-hub-insight-empty">{t('forge.hub.insight.projectsEmpty', 'No open or in-progress projects.')}</p>
          ) : (
            <table className="forge-hub-insight-table">
              <thead>
                <tr>
                  <th>{t('forge.hub.insight.colProject', 'Project')}</th>
                  <th>{t('forge.hub.insight.colStatus', 'Status')}</th>
                  <th>{t('forge.hub.insight.colAssignees', 'Assignees')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>
                      {row.status === 'in_progress'
                        ? t('forge.projects.statusProgress', 'In progress')
                        : row.status === 'open'
                          ? t('forge.projects.statusOpen', 'Open')
                          : row.status}
                    </td>
                    <td>{row.assigneeNames}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )
    }

    if (insightId === 'reviews') {
      const rows = listPendingNominationReviews()
      return (
        <>
          <p className="forge-hub-insight-lead">
            {t('forge.hub.insight.reviewsLead', 'Assessments in nomination review with no outcome recorded yet.')}
          </p>
          {!rows.length ? (
            <p className="forge-hub-insight-empty">{t('forge.hub.insight.reviewsEmpty', 'No pending nomination reviews.')}</p>
          ) : (
            <table className="forge-hub-insight-table">
              <thead>
                <tr>
                  <th>{t('forge.hub.insight.colName', 'Name')}</th>
                  <th>{t('forge.hub.insight.colScore', 'Score')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.composite > 0 ? row.composite.toFixed(2) : '—'}</td>
                    <td className="forge-hub-insight-actions">
                      <button type="button" className="forge-hub-insight-link" onClick={() => navigate(caseHref(row.id))}>
                        {t('forge.hub.insight.openCase', 'Open case')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )
    }

    if (insightId === 'cases') {
      const { founding, committee } = listFoundersAndVotingRoster()
      const seats = FOUNDING_MEMBER_DEFAULTS.length
      return (
        <>
          <p className="forge-hub-insight-lead">
            {t(
              'forge.hub.insight.foundersLead',
              'Founding-type members from membership onboarding and committee names from registration (typical voting representatives). Reference voting seats:',
            )}{' '}
            <strong>{seats}</strong>.
          </p>
          <h3 className="forge-hub-insight-h3">{t('forge.hub.insight.foundingSection', 'Founding members (onboarding)')}</h3>
          {!founding.length ? (
            <p className="forge-hub-insight-empty">{t('forge.hub.insight.foundingEmpty', 'No assessments marked as Founding Member yet.')}</p>
          ) : (
            <table className="forge-hub-insight-table">
              <thead>
                <tr>
                  <th>{t('forge.hub.insight.colName', 'Name')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {founding.map((row) => (
                  <tr key={row.assessmentId}>
                    <td>{row.name}</td>
                    <td className="forge-hub-insight-actions">
                      <button type="button" className="forge-hub-insight-link" onClick={() => navigate(caseHref(row.assessmentId))}>
                        {t('forge.hub.insight.openCase', 'Open case')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 className="forge-hub-insight-h3">{t('forge.hub.insight.committeeSection', 'Committee / voting roster')}</h3>
          {!committee.length ? (
            <p className="forge-hub-insight-empty">{t('forge.hub.insight.committeeEmpty', 'No committee names in the registered roster.')}</p>
          ) : (
            <ul className="forge-hub-insight-bullets">
              {committee.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          )}
        </>
      )
    }

    return null
  }, [insightId, averageComposite, navigate, t, tick, caseHref])

  const title = useMemo(() => {
    if (!insightId) return ''
    const keys = {
      'typed-members': ['forge.hub.insight.titleTyped', 'Typed candidates & members'],
      onboarding: ['forge.hub.insight.titleOnboarding', 'Ongoing onboarding'],
      score: ['forge.hub.insight.titleScore', 'Average score & comparison'],
      projects: ['forge.hub.insight.titleProjects', 'Open projects & assignees'],
      reviews: ['forge.hub.insight.titleReviews', 'Pending reviews'],
      cases: ['forge.hub.insight.titleFounders', 'Founders & voting roster'],
    }
    const pair = keys[insightId]
    return pair ? t(pair[0], pair[1]) : ''
  }, [insightId, t])

  if (!insightId || !isForgeHubInsightId(insightId)) return null

  return (
    <div
      className="forge-hub-insight-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="forge-hub-insight-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forge-hub-insight-title"
      >
        <div className="forge-hub-insight-head">
          <h2 id="forge-hub-insight-title" className="forge-hub-insight-title">
            {title}
          </h2>
          <button type="button" className="forge-hub-insight-close stx-click-feedback" onClick={onClose} aria-label={t('forge.hub.insight.close', 'Close')}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="forge-hub-insight-body">{body}</div>
      </div>
    </div>
  )
}
