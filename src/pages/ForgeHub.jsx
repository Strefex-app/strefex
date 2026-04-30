import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import ForgeHubInsightPanel, { FORGE_INSIGHT_QUERY, isForgeHubInsightId } from '../components/forge/ForgeHubInsightPanel'
import Icon from '../components/Icon'
import AiInsightsCtaStrip from '../components/AiInsightsCtaStrip'
import { useTranslation } from '../i18n/useTranslation'
import { forgeSpacePath, FORGE_PATHS, FORGE_SEGMENT_MEMBERSHIP_ONBOARDING } from '../constants/forgeSpaceRoutes'
import { FORGE_HUB_MODULE_GROUPS } from '../data/forgeHubModuleGroups'
import { getForgeHubStats } from '../lib/forgeHubStats'
import { FORGE_HUB_REFRESH } from '../lib/forgeHubEvents'
import { STAGE_TABS } from '../lib/forgeMembershipLogic'
import './HeadcountManagement.css'
import './ManagementHub.css'
import './ForgeHub.css'

function useForgeHubStats() {
  const [stats, setStats] = useState(() => getForgeHubStats())
  const refresh = useCallback(() => setStats(getForgeHubStats()), [])
  useEffect(() => {
    refresh()
    const onStorage = (e) => {
      if (e.key && e.key.startsWith('forge-v1')) refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(FORGE_HUB_REFRESH, refresh)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(FORGE_HUB_REFRESH, refresh)
    }
  }, [refresh])
  return { stats, refresh }
}

function stageLabel(n) {
  const row = STAGE_TABS.find((s) => s.n === n)
  return row ? row.label : '—'
}

export default function ForgeHub() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useTranslation()
  const { stats, refresh } = useForgeHubStats()

  const insightParam = searchParams.get(FORGE_INSIGHT_QUERY)
  const activeInsight = isForgeHubInsightId(insightParam) ? insightParam : null

  const openInsight = (id) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(FORGE_INSIGHT_QUERY, id)
        return next
      },
      { replace: false },
    )
  }

  const closeInsight = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete(FORGE_INSIGHT_QUERY)
        return next
      },
      { replace: true },
    )
  }

  const indicators = [
    {
      id: 'typed-members',
      value: String(stats.membershipCandidatesWithType),
      sub: t('forge.hub.indicator.membershipTypedSub', 'Founding or Club from membership onboarding'),
      labelKey: 'forge.hub.indicator.membershipTyped',
      labelDefault: 'Typed candidates',
      icon: 'team',
      iconClass: 'blue',
    },
    {
      id: 'onboarding',
      value: String(stats.ongoingOnboarding),
      sub: t('forge.hub.indicator.onboardingSub', 'Assessments at nomination or pre-screen'),
      labelKey: 'forge.hub.indicator.onboarding',
      labelDefault: 'Ongoing onboarding',
      icon: 'onboarding',
      iconClass: 'green',
    },
    {
      id: 'score',
      value:
        stats.averageComposite != null ? (
          <>
            {stats.averageComposite.toFixed(2)} <span className="headcount-star">/ 5.0 ★</span>
          </>
        ) : (
          '—'
        ),
      labelKey: 'forge.hub.indicator.avgScore',
      labelDefault: 'Average score',
      icon: 'quality',
      iconClass: 'orange',
    },
    {
      id: 'projects',
      value: String(stats.openProjects),
      labelKey: 'forge.hub.indicator.openProjects',
      labelDefault: 'Open projects',
      icon: 'folder',
      iconClass: 'green',
    },
    {
      id: 'reviews',
      value: String(stats.pendingReviews),
      labelKey: 'forge.hub.indicator.pendingReviews',
      labelDefault: 'Pending reviews',
      icon: 'clipboard',
      iconClass: 'purple',
    },
    {
      id: 'cases',
      value: String(stats.memberCases),
      sub:
        stats.memberCases > 0
          ? `${t('forge.hub.votingSeats', 'Voting seats')}: ${stats.foundingSeats}`
          : null,
      labelKey: 'forge.hub.indicator.cases',
      labelDefault: 'Membership cases',
      icon: 'profile',
      iconClass: 'blue',
    },
  ]

  const quickActions = [
    {
      id: 'open-onboarding',
      labelKey: 'forge.hub.qa.openOnboarding',
      labelDefault: 'Open membership onboarding',
      icon: 'onboarding',
      path: forgeSpacePath(FORGE_SEGMENT_MEMBERSHIP_ONBOARDING),
    },
    {
      id: 'open-projects',
      labelKey: 'forge.hub.qa.openProjects',
      labelDefault: 'Open projects',
      icon: 'folder',
      path: FORGE_PATHS.projects,
    },
    {
      id: 'refresh',
      labelKey: 'forge.hub.qa.refreshStats',
      labelDefault: 'Refresh stats',
      icon: 'refresh',
      action: 'refresh',
    },
  ]

  return (
    <AppLayout>
      <div className="headcount-page forge-hub-page">
        <div className="headcount-header">
          <button type="button" className="headcount-back-link stx-click-feedback" onClick={() => navigate('/management')}>
            <Icon name="arrow-left" size={16} /> {t('forge.backToManagement', 'Back to Management')}
          </button>
          <h1 className="headcount-title">{t('forge.hub.title', 'Forge')}</h1>
          <p className="headcount-subtitle">
            {t(
              'forge.hub.subtitle',
              'Onboarding, Members Hub, and Elevation Hub — brand-aligned documents and workflows with local edit and print-to-PDF.',
            )}
          </p>
        </div>

        <AiInsightsCtaStrip context="management" />

        <div className="headcount-indicators forge-hub-indicators">
          {indicators.map((ind) => (
            <button
              key={ind.id}
              type="button"
              className="headcount-indicator-card forge-hub-indicator forge-hub-indicator-btn stx-click-feedback"
              onClick={() => openInsight(ind.id)}
              aria-label={`${t(ind.labelKey, ind.labelDefault)} — ${t('forge.hub.indicator.openDetails', 'Open details')}`}
            >
              <div className={`headcount-indicator-icon ${ind.iconClass || 'blue'}`}>
                <Icon name={ind.icon} size={24} />
              </div>
              <div className="headcount-indicator-content">
                <div className="headcount-indicator-value">{ind.value}</div>
                {ind.sub && <div className="forge-hub-indicator-sub">{ind.sub}</div>}
                <div className="headcount-indicator-label">{t(ind.labelKey, ind.labelDefault)}</div>
              </div>
            </button>
          ))}
        </div>

        <ForgeHubInsightPanel
          insightId={activeInsight}
          onClose={closeInsight}
          navigate={navigate}
          averageComposite={stats.averageComposite}
          t={t}
        />

        <div className="headcount-main">
          <div className="headcount-main-left">
            <div className="forge-hub-stages-stack">
              {FORGE_HUB_MODULE_GROUPS.map((group) => {
                const wIcon = group.widgetIcon || 'folder'
                const wColor = group.widgetColor || '#1b2a4a'
                const widgetIconStyle = { background: `${wColor}22`, color: wColor }
                const pageListId = `forge-hub-pages-${group.id}`
                const hubLabel = t(group.titleKey, group.titleDefault)
                const focusFirstOpenPage = () => {
                  const root = document.getElementById(pageListId)
                  const first = root?.querySelector('button.headcount-page-item:not([disabled])')
                  first?.focus()
                }
                return (
                  <section key={group.id} className="forge-hub-stage">
                    <button
                      type="button"
                      className="mgmt-hub-card forge-hub-hub-btn stx-click-feedback"
                      aria-controls={pageListId}
                      onClick={focusFirstOpenPage}
                    >
                      <div className="mgmt-hub-card-icon forge-hub-hub-btn-icon" style={widgetIconStyle}>
                        <Icon name={wIcon} size={28} />
                      </div>
                      <div className="mgmt-hub-card-info">
                        <div className="mgmt-hub-card-title">{hubLabel}</div>
                        <p className="mgmt-hub-card-desc forge-hub-hub-btn-desc">
                          <strong>{t(group.labelKey, group.labelDefault)}</strong>
                          {group.subtitleKey ? ` — ${t(group.subtitleKey, group.subtitleDefault || '')}` : ''}
                        </p>
                      </div>
                      <div className="mgmt-hub-card-arrow forge-hub-hub-btn-arrow" aria-hidden>
                        <Icon name="chevron-right" size={20} />
                      </div>
                    </button>

                    {group.id === 'onboarding' && (
                      <div className="forge-hub-onboarding-create-wrap">
                        <button
                          type="button"
                          className="headcount-action-item headcount-action-add stx-click-feedback forge-hub-onboarding-create"
                          onClick={() => navigate(`${FORGE_PATHS.membershipOnboarding}?new=true`)}
                        >
                          <span className="headcount-action-icon">
                            <Icon name="plus" size={20} />
                          </span>
                          {t('forge.hub.onboarding.create', 'New onboarding case')}
                        </button>
                      </div>
                    )}

                    <div id={pageListId} className="forge-hub-hub-pages" role="group" aria-label={`${hubLabel} — ${t('forge.hub.pagesInHub', 'Pages')}`}>
                      {group.modules.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!!m.soon}
                          className={`headcount-page-item stx-click-feedback ${m.soon ? 'headcount-page-item--locked' : ''}`}
                          onClick={() => m.path && navigate(m.path)}
                        >
                          <div
                            className="headcount-page-item-icon"
                            style={{ background: `${m.color}15`, color: m.color }}
                          >
                            <Icon name={m.icon} size={20} />
                          </div>
                          <div className="headcount-page-item-info">
                            <div className="headcount-page-item-name">
                              {t(m.titleKey, m.titleDefault)}
                              {m.soon ? <span className="headcount-plan-badge">{t('forge.hub.soon', 'Soon')}</span> : null}
                            </div>
                            <div className="headcount-page-item-desc">{t(m.descKey, m.descDefault)}</div>
                          </div>
                          <span className="headcount-page-item-arrow">
                            <Icon name={m.soon ? 'lock' : 'chevron-right'} size={16} />
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>

            <div className="headcount-card headcount-full-width forge-hub-roadmap">
              <h2 className="headcount-card-title">{t('forge.hub.roadmapTitle', "What's next")}</h2>
              <p className="headcount-card-subtitle">{t('forge.hub.roadmapDesc', 'Capabilities planned for Forge.')}</p>
              <ul className="headcount-talent-list">
                <li>
                  <strong>{t('forge.hub.roadmapItem1Title', 'Committee decisions')}</strong> — {t('forge.hub.roadmapItem1', 'Structured votes and immutable decision records.')}
                </li>
                <li>
                  <strong>{t('forge.hub.roadmapItem2Title', 'Cross-work projects')}</strong> — {t('forge.hub.roadmapItem2', 'Tie membership milestones to HR onboarding and compliance tasks.')}
                </li>
                <li>
                  <strong>{t('forge.hub.roadmapItem3Title', 'Analytics')}</strong> — {t('forge.hub.roadmapItem3', 'Cohort health, conversion, and score distribution.')}
                </li>
              </ul>
            </div>
          </div>

          <div className="forge-hub-sidebar-stack">
            <div className="headcount-card headcount-sidebar">
              <h2 className="headcount-card-title">+ {t('forge.hub.quickActions', 'Quick actions')}</h2>
              <p className="headcount-card-subtitle">{t('forge.hub.quickActionsDesc', 'Shortcuts into Forge workflows.')}</p>
              <div className="headcount-actions-list">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className="headcount-action-item stx-click-feedback"
                    onClick={() => {
                      if (action.action === 'refresh') {
                        refresh()
                        return
                      }
                      if (action.path) navigate(action.path)
                    }}
                  >
                    <span className="headcount-action-icon">
                      <Icon name={action.icon} size={20} />
                    </span>
                    {t(action.labelKey, action.labelDefault)}
                  </button>
                ))}
              </div>
            </div>

            <div className="headcount-card forge-hub-tracking">
              <h2 className="headcount-card-title">{t('forge.hub.trackingTitle', 'Pipeline tracking')}</h2>
              <p className="headcount-card-subtitle">{t('forge.hub.trackingDesc', 'Latest membership cases by stage.')}</p>
              {!stats.trackingRows.length ? (
                <p className="forge-hub-tracking-empty">
                  {t('forge.hub.trackingEmpty', 'No saved assessments yet. Open Membership onboarding to create one.')}
                </p>
              ) : (
                <ul className="forge-hub-tracking-list">
                  {stats.trackingRows.map((row) => (
                    <li key={row.id} className="forge-hub-tracking-row stx-click-feedback" onClick={() => navigate(forgeSpacePath(FORGE_SEGMENT_MEMBERSHIP_ONBOARDING))}>
                      <div className="forge-hub-tracking-name">{row.name}</div>
                      <div className="forge-hub-tracking-meta">
                        <span className="forge-hub-tracking-stage">{stageLabel(row.stage)}</span>
                        {row.composite > 0 && <span className="forge-hub-tracking-score">{row.composite.toFixed(2)}</span>}
                        {row.outcome && <span className="forge-hub-tracking-outcome">{row.outcome}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
