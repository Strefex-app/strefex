import Icon from '../../components/Icon'

const NETWORK_BRANCH = [
  { icon: 'search', label: 'Discover', hint: 'Directory & standards filters' },
  { icon: 'vendors', label: 'Shortlist', hint: 'Evidence compare & gaps' },
  { icon: 'procurement', label: 'RFQ', hint: 'Send with NDA gate' },
  { icon: 'clipboard', label: 'Track', hint: 'Buyer / seller inbox' },
]

const COMPANY_BRANCH = [
  { icon: 'team', label: 'People', hint: 'Team, HR, departments' },
  { icon: 'production', label: 'Ops & QMS', hint: 'Projects, production, IATF' },
  { icon: 'cost', label: 'Finance', hint: 'Cost, spend, multi-site' },
  { icon: 'contracts', label: 'Compliance', hint: 'Audits, contracts, ESG' },
]

/**
 * Professional organigram: Network mode vs Company mode.
 */
export default function MarketingModeOrgChart() {
  return (
    <figure className="mkt-org" aria-labelledby="mkt-org-title">
      <figcaption className="mkt-org__caption">
        <p className="mkt-kicker">Workspace modes</p>
        <h2 id="mkt-org-title" className="mkt-section__title">
          Network vs Company — one account, two workspaces
        </h2>
        <p className="mkt-section__lead">
          Switch modes anytime. Network faces the market; Company runs the plant and internal teams — without mixing customer data.
        </p>
      </figcaption>

      <div className="mkt-org__chart" role="img" aria-label="Organigram comparing Network mode and Company mode">
        {/* Root */}
        <div className="mkt-org__root">
          <div className="mkt-org__node mkt-org__node--root">
            <span className="mkt-org__root-icon" aria-hidden="true">
              <Icon name="management" size={22} color="#0f1c3a" />
            </span>
            <div className="min-width-0">
              <strong>STREFEX account</strong>
              <span>Tenant-scoped workspace</span>
            </div>
          </div>
        </div>

        <div className="mkt-org__trunk" aria-hidden="true" />

        <div className="mkt-org__split" aria-hidden="true">
          <span className="mkt-org__split-bar" />
          <span className="mkt-org__split-down mkt-org__split-down--left" />
          <span className="mkt-org__split-down mkt-org__split-down--right" />
        </div>

        <div className="mkt-org__branches">
          {/* Network */}
          <div className="mkt-org__branch mkt-org__branch--network">
            <div className="mkt-org__mode-head mkt-org__mode-head--network">
              <span className="mkt-org__mode-badge">Mode</span>
              <h3>Network</h3>
              <p>Find plants, issue RFQs, answer buyer requests</p>
            </div>
            <ol className="mkt-org__flow">
              {NETWORK_BRANCH.map((step, i) => (
                <li key={step.label}>
                  {i > 0 && <span className="mkt-org__flow-link" aria-hidden="true" />}
                  <div className="mkt-org__node mkt-org__node--network">
                    <span className="mkt-org__node-icon" aria-hidden="true">
                      <Icon name={step.icon} size={18} color="#0e7490" />
                    </span>
                    <div className="min-width-0">
                      <strong>{step.label}</strong>
                      <span className="stx-text-wrap">{step.hint}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Company */}
          <div className="mkt-org__branch mkt-org__branch--company">
            <div className="mkt-org__mode-head mkt-org__mode-head--company">
              <span className="mkt-org__mode-badge">Mode</span>
              <h3>Company</h3>
              <p>Plant records, people, purchasing, and IATF control</p>
            </div>
            <ol className="mkt-org__flow">
              {COMPANY_BRANCH.map((step, i) => (
                <li key={step.label}>
                  {i > 0 && <span className="mkt-org__flow-link" aria-hidden="true" />}
                  <div className="mkt-org__node mkt-org__node--company">
                    <span className="mkt-org__node-icon" aria-hidden="true">
                      <Icon name={step.icon} size={18} color="#c2410c" />
                    </span>
                    <div className="min-width-0">
                      <strong>{step.label}</strong>
                      <span className="stx-text-wrap">{step.hint}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Bridge */}
        <div className="mkt-org__bridge">
          <div className="mkt-org__bridge-line" aria-hidden="true" />
          <div className="mkt-org__node mkt-org__node--bridge">
            <span className="mkt-org__node-icon" aria-hidden="true">
              <Icon name="shield" size={18} color="#192a56" />
            </span>
            <div className="min-width-0">
              <strong>Connected, not mixed</strong>
              <span className="stx-text-wrap">
                Publish reliability → win RFQ → open plant project &amp; binder. Private lots &amp; NCRs stay in Company mode.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mkt-org__legend" aria-hidden="true">
        <span className="mkt-org__legend-item mkt-org__legend-item--network">Network (market)</span>
        <span className="mkt-org__legend-item mkt-org__legend-item--company">Company (plant)</span>
      </div>
    </figure>
  )
}
